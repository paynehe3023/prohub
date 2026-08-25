const crypto = require('crypto');
const multer = require('multer');
const { Server } = require('socket.io');

const DEFAULT_TTL_MINUTES = Number(process.env.CLIPBOARD_ROOM_TTL_MINUTES || 15);
const DEFAULT_TTL_MS = DEFAULT_TTL_MINUTES * 60 * 1000;
const MAX_CLIPS = Number(process.env.CLIPBOARD_MAX_ITEMS || 20);
const MAX_TEXT_LENGTH = Number(process.env.CLIPBOARD_MAX_TEXT_LENGTH || 20000);
const MAX_UPLOAD_BYTES = Number(process.env.CLIPBOARD_UPLOAD_MAX_BYTES || 20 * 1024 * 1024);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

const rooms = new Map();
let io;

function randomRoomId(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let roomId = '';
  const bytes = crypto.randomBytes(length * 2);

  for (const byte of bytes) {
    roomId += alphabet[byte % alphabet.length];
    if (roomId.length >= length) break;
  }

  return roomId.slice(0, length);
}

function normalizeRoomId(value) {
  const candidate = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (candidate.length >= 4 && candidate.length <= 24) {
    return candidate.slice(0, 24);
  }

  return randomRoomId();
}

function parseTtlMinutes(value, fallback = DEFAULT_TTL_MINUTES) {
  const ttlMinutes = Number.parseInt(String(value ?? ''), 10);
  if (Number.isFinite(ttlMinutes) && ttlMinutes > 0 && ttlMinutes <= 240) {
    return ttlMinutes;
  }
  return fallback;
}

function ttlMinutesToMs(ttlMinutes) {
  return parseTtlMinutes(ttlMinutes) * 60 * 1000;
}

function safeFileName(fileName = 'file') {
  return String(fileName)
    .replace(/[\r\n"]/g, '')
    .trim()
    .slice(0, 180) || 'file';
}

function dataUrlToBytes(dataUrl = '') {
  const base64 = String(dataUrl).split(',')[1] || '';
  return Math.floor((base64.length * 3) / 4);
}

function makeDownloadUrl(roomId, assetId, download = false) {
  const suffix = download ? '?download=1' : '';
  return `/api/clipboard/upload/${encodeURIComponent(roomId)}/${encodeURIComponent(assetId)}${suffix}`;
}

function clipSummary(room) {
  return {
    roomId: room.roomId,
    ttlMinutes: Math.round(room.ttlMs / 60000),
    ttlMs: room.ttlMs,
    expiresAt: room.expiresAt,
    lastActivityAt: room.lastActivityAt,
    clipCount: room.clips.length,
    maxClips: MAX_CLIPS,
  };
}

function trimClips(room) {
  while (room.clips.length > MAX_CLIPS) {
    const removed = room.clips.shift();
    if (removed?.assetId) {
      room.assets.delete(removed.assetId);
    }
  }
}

function scheduleExpiry(room) {
  if (room.timer) {
    clearTimeout(room.timer);
  }

  room.expiresAt = Date.now() + room.ttlMs;
  room.timer = setTimeout(() => {
    expireRoom(room.roomId, 'expired');
  }, room.ttlMs);
  room.timer.unref?.();
}

function ensureRoom(roomId, ttlMinutes = DEFAULT_TTL_MINUTES) {
  const normalized = normalizeRoomId(roomId);
  let room = rooms.get(normalized);

  if (!room) {
    room = {
      roomId: normalized,
      clips: [],
      assets: new Map(),
      sockets: new Set(),
      ttlMs: ttlMinutesToMs(ttlMinutes),
      lastActivityAt: Date.now(),
      expiresAt: Date.now() + ttlMinutesToMs(ttlMinutes),
      timer: null,
    };
    rooms.set(normalized, room);
    scheduleExpiry(room);
  }

  return room;
}

function touchRoom(room, ttlMinutes) {
  if (Number.isFinite(Number(ttlMinutes)) && Number(ttlMinutes) > 0) {
    room.ttlMs = ttlMinutesToMs(ttlMinutes);
  }

  room.lastActivityAt = Date.now();
  scheduleExpiry(room);
  return room;
}

function expireRoom(roomId, reason = 'expired') {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.timer) {
    clearTimeout(room.timer);
  }

  if (io) {
    io.to(room.roomId).emit('room:cleared', {
      roomId: room.roomId,
      reason,
      clearedAt: Date.now(),
    });
  }

  room.assets.clear();
  room.clips.length = 0;
  room.sockets.clear();
  rooms.delete(roomId);
}

function clearRoom(roomId, reason = 'manual') {
  expireRoom(normalizeRoomId(roomId), reason);
}

function storeAsset(room, file) {
  const assetId = crypto.randomUUID();
  const mimeType = file.mimetype || 'application/octet-stream';
  const isImage = mimeType.startsWith('image/');

  const asset = {
    assetId,
    roomId: room.roomId,
    fileName: safeFileName(file.originalname || 'file'),
    mimeType,
    size: file.size,
    buffer: file.buffer,
    isImage,
    createdAt: Date.now(),
  };

  room.assets.set(assetId, asset);
  return asset;
}

function buildTextClip(room, payload) {
  const text = String(payload?.text || '').trimEnd();
  if (!text) {
    throw new Error('EMPTY_TEXT');
  }

  const normalizedText = text.slice(0, MAX_TEXT_LENGTH);
  return {
    id: crypto.randomUUID(),
    roomId: room.roomId,
    kind: 'text',
    text: normalizedText,
    textLength: normalizedText.length,
    size: Buffer.byteLength(normalizedText, 'utf8'),
    createdAt: Date.now(),
  };
}

function buildInlineClip(room, payload) {
  const dataUrl = String(payload?.dataUrl || '');
  if (!dataUrl.startsWith('data:')) {
    throw new Error('INVALID_DATA_URL');
  }

  const mimeType = String(payload?.mimeType || dataUrl.slice(5, dataUrl.indexOf(';')) || 'application/octet-stream');
  const isImage = String(payload?.kind || '').toLowerCase() === 'image' || mimeType.startsWith('image/');
  const fileName = safeFileName(payload?.fileName || (isImage ? 'image.png' : 'clipboard-file'));

  return {
    id: crypto.randomUUID(),
    roomId: room.roomId,
    kind: isImage ? 'image' : 'file',
    fileName,
    mimeType,
    size: Number(payload?.size) || dataUrlToBytes(dataUrl),
    dataUrl,
    previewUrl: dataUrl,
    downloadUrl: dataUrl,
    createdAt: Date.now(),
  };
}

function buildAssetClip(room, asset) {
  return {
    id: crypto.randomUUID(),
    roomId: room.roomId,
    kind: asset.isImage ? 'image' : 'file',
    assetId: asset.assetId,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    size: asset.size,
    previewUrl: makeDownloadUrl(room.roomId, asset.assetId, false),
    downloadUrl: makeDownloadUrl(room.roomId, asset.assetId, true),
    createdAt: Date.now(),
  };
}

function removeClip(room, clipId) {
  const index = room.clips.findIndex((clip) => clip.id === clipId);
  if (index === -1) {
    return null;
  }

  const [removed] = room.clips.splice(index, 1);
  if (removed?.assetId) {
    room.assets.delete(removed.assetId);
  }

  return removed;
}

function resolveClip(room, payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('INVALID_PAYLOAD');
  }

  if (payload.assetId) {
    const asset = room.assets.get(String(payload.assetId));
    if (!asset) {
      throw new Error('ASSET_NOT_FOUND');
    }
    return buildAssetClip(room, asset);
  }

  if (payload.dataUrl) {
    return buildInlineClip(room, payload);
  }

  if (String(payload.kind || '').toLowerCase() === 'text' || payload.text) {
    return buildTextClip(room, payload);
  }

  throw new Error('UNSUPPORTED_CLIP');
}

function registerClipboardRealtime(app, server) {
  io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  app.get('/api/clipboard/health', (req, res) => {
    res.json({
      status: 'ok',
      rooms: rooms.size,
      maxClips: MAX_CLIPS,
      defaultTtlMinutes: DEFAULT_TTL_MINUTES,
    });
  });

  app.post('/api/clipboard/upload', upload.single('file'), (req, res) => {
    try {
      const roomSource = req.body?.roomId || req.query?.roomId || req.header('x-room-id');
      if (!roomSource) {
        return res.status(400).json({ error: '缺少房间号' });
      }
      const roomId = normalizeRoomId(roomSource);
      const file = req.file;

      if (!roomId) {
        return res.status(400).json({ error: '缺少房间号' });
      }

      if (!file) {
        return res.status(400).json({ error: '请上传文件' });
      }

      const room = ensureRoom(roomId, req.body?.ttlMinutes || req.query?.ttlMinutes);
      touchRoom(room, req.body?.ttlMinutes || req.query?.ttlMinutes);
      const asset = storeAsset(room, file);

      res.json({
        ok: true,
        room: clipSummary(room),
        asset: {
          assetId: asset.assetId,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          size: asset.size,
          isImage: asset.isImage,
          previewUrl: makeDownloadUrl(room.roomId, asset.assetId, false),
          downloadUrl: makeDownloadUrl(room.roomId, asset.assetId, true),
        },
      });
    } catch (error) {
      console.error('[clipboard/upload] Error:', error.message);
      res.status(500).json({ error: '上传失败', message: error.message });
    }
  });

  app.get('/api/clipboard/upload/:roomId/:assetId', (req, res) => {
    const roomId = normalizeRoomId(req.params.roomId);
    const room = rooms.get(roomId);
    const asset = room?.assets.get(String(req.params.assetId));

    if (!room || !asset) {
      return res.status(404).json({ error: '文件已过期或不存在' });
    }

    const download = req.query.download === '1' || req.query.download === 'true';
    const disposition = download || !asset.isImage ? 'attachment' : 'inline';
    const encodedFileName = encodeURIComponent(asset.fileName);

    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Length', String(asset.size));
    res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodedFileName}`);
    res.send(asset.buffer);
  });

  app.delete('/api/clipboard/upload/:roomId/:assetId', (req, res) => {
    const roomId = normalizeRoomId(req.params.roomId);
    const room = rooms.get(roomId);

    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }

    const assetId = String(req.params.assetId);
    const asset = room.assets.get(assetId);
    if (!asset) {
      return res.status(404).json({ error: '文件不存在' });
    }

    room.assets.delete(assetId);
    removeClip(room, room.clips.find((clip) => clip.assetId === assetId)?.id);
    touchRoom(room);
    io.to(room.roomId).emit('clip:delete', {
      roomId: room.roomId,
      clipId: clip?.id || assetId,
      room: clipSummary(room),
    });

    res.json({ ok: true });
  });

  app.post('/api/clipboard/clear/:roomId', (req, res) => {
    const roomId = normalizeRoomId(req.params.roomId);
    if (!rooms.has(roomId)) {
      return res.json({ ok: true, roomId, cleared: true });
    }

    clearRoom(roomId, 'manual');
    res.json({ ok: true, roomId, cleared: true });
  });

  io.on('connection', (socket) => {
    socket.data.roomId = null;

    socket.on('room:join', (payload = {}, ack) => {
      try {
        const roomId = normalizeRoomId(payload.roomId || socket.data.roomId);
        const ttlMinutes = parseTtlMinutes(payload.ttlMinutes, DEFAULT_TTL_MINUTES);
        const room = ensureRoom(roomId, ttlMinutes);

        socket.data.roomId = room.roomId;
        socket.join(room.roomId);
        room.sockets.add(socket.id);
        touchRoom(room, ttlMinutes);

        const roomState = clipSummary(room);
        socket.emit('clip:init', {
          room: roomState,
          clips: room.clips,
        });

        ack?.({ ok: true, room: roomState, clips: room.clips });
      } catch (error) {
        console.error('[clipboard/socket join] Error:', error.message);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on('room:update-settings', (payload = {}, ack) => {
      try {
        const roomId = normalizeRoomId(payload.roomId || socket.data.roomId);
        const room = rooms.get(roomId) || ensureRoom(roomId, payload.ttlMinutes);
        const ttlMinutes = parseTtlMinutes(payload.ttlMinutes, Math.round(room.ttlMs / 60000));
        touchRoom(room, ttlMinutes);

        const roomState = clipSummary(room);
        io.to(room.roomId).emit('room:settings', roomState);
        ack?.({ ok: true, room: roomState });
      } catch (error) {
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on('clip:send', (payload = {}, ack) => {
      try {
        const roomId = normalizeRoomId(payload.roomId || socket.data.roomId);
        const room = rooms.get(roomId) || ensureRoom(roomId, payload.ttlMinutes);
        const ttlMinutes = parseTtlMinutes(payload.ttlMinutes, Math.round(room.ttlMs / 60000));
        const clip = resolveClip(room, payload);

        clip.createdAt = Date.now();
        room.clips.push(clip);
        trimClips(room);
        touchRoom(room, ttlMinutes);

        const roomState = clipSummary(room);
        socket.to(room.roomId).emit('clip:sync', {
          room: roomState,
          clip,
        });
        ack?.({ ok: true, room: roomState, clip });
      } catch (error) {
        console.error('[clipboard/socket send] Error:', error.message);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on('clip:delete', (payload = {}, ack) => {
      try {
        const roomId = normalizeRoomId(payload.roomId || socket.data.roomId);
        const room = rooms.get(roomId);

        if (!room) {
          throw new Error('ROOM_NOT_FOUND');
        }

        const clip = removeClip(room, payload.clipId);
        if (!clip) {
          throw new Error('CLIP_NOT_FOUND');
        }

        touchRoom(room);
        const roomState = clipSummary(room);
        io.to(room.roomId).emit('clip:delete', {
          room: roomState,
          clipId: clip.id,
        });
        ack?.({ ok: true, room: roomState });
      } catch (error) {
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on('room:clear', (payload = {}, ack) => {
      try {
        const roomId = normalizeRoomId(payload.roomId || socket.data.roomId);
        clearRoom(roomId, 'manual');
        ack?.({ ok: true, roomId });
      } catch (error) {
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = rooms.get(roomId);
      room?.sockets.delete(socket.id);
    });
  });

  return io;
}

module.exports = {
  registerClipboardRealtime,
  normalizeRoomId,
  parseTtlMinutes,
};


