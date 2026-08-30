const crypto = require('crypto');
const multer = require('multer');
const { Server: SocketIoServer } = require('socket.io');

const DEFAULT_TTL_MINUTES = Number(process.env.CLIPBOARD_ROOM_TTL_MINUTES || 15);
const DEFAULT_TTL_MS = DEFAULT_TTL_MINUTES * 60 * 1000;
const MAX_CLIPS = Number(process.env.CLIPBOARD_MAX_ITEMS || 20);
const MAX_TEXT_LENGTH = Number(process.env.CLIPBOARD_MAX_TEXT_LENGTH || 20000);
const MAX_UPLOAD_BYTES = Number(process.env.CLIPBOARD_UPLOAD_MAX_BYTES || 50 * 1024 * 1024);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

const rooms = new Map();
let socketServer = null;

function randomRoomId(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length * 2);
  let roomId = '';
  for (const byte of bytes) {
    roomId += alphabet[byte % alphabet.length];
    if (roomId.length >= length) break;
  }
  return roomId.slice(0, length);
}

function createHostToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hasValidHostToken(room, candidate) {
  const expected = String(room?.hostToken || '');
  const received = String(candidate || '');
  if (!expected || !received || expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function hasRoomMember(room, clientId) {
  const normalizedClientId = normalizeClientId(clientId);
  if (!normalizedClientId) return false;
  return Array.from(room?.devices.values() || []).some((device) => device.clientId === normalizedClientId);
}

function requireRoomMember(room, req) {
  const hostToken = req.header('x-host-token') || req.body?.hostToken || req.query?.hostToken;
  const clientId = req.header('x-client-id') || req.body?.clientId || req.query?.clientId;
  if (!hasValidHostToken(room, hostToken) && !hasRoomMember(room, clientId)) {
    throw new Error('ROOM_AUTH_REQUIRED');
  }
}

function normalizeRoomId(value) {
  const candidate = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (candidate.length >= 4 && candidate.length <= 24) return candidate.slice(0, 24);
  return randomRoomId();
}

function parseTtlMinutes(value, fallback = DEFAULT_TTL_MINUTES) {
  if (String(value ?? '').trim() === '0') return 0;
  const ttlMinutes = Number.parseInt(String(value ?? ''), 10);
  if (Number.isFinite(ttlMinutes) && ttlMinutes > 0 && ttlMinutes <= 240) return ttlMinutes;
  return fallback;
}

function ttlMinutesToMs(ttlMinutes) {
  const normalized = parseTtlMinutes(ttlMinutes);
  return normalized === 0 ? 0 : normalized * 60 * 1000;
}

function safeFileName(fileName = 'file') {
  return String(fileName).replace(/[\r\n"]/g, '').trim().slice(0, 180) || 'file';
}

function normalizeClientId(value) {
  const candidate = String(value || '').trim();
  if (!candidate || candidate.length > 120) return '';
  return candidate.replace(/[^a-zA-Z0-9._:-]/g, '');
}

function extractIpv4(value) {
  const candidate = String(value || '').split(',')[0].trim().replace(/^\[|\]$/g, '');
  const normalized = candidate.replace(/^::ffff:/i, '');
  const match = normalized.match(/(?:^|[^0-9])((?:\d{1,3}\.){3}\d{1,3})(?:$|[^0-9])/);
  if (!match) return '';
  const octets = match[1].split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return '';
  if (octets[0] === 127 || octets.every((octet) => octet === 0)) return '';
  return match[1];
}

function getRequestIpv4(req) {
  return extractIpv4(req.headers['x-forwarded-for'])
    || extractIpv4(req.socket?.remoteAddress)
    || '未知 IPv4';
}

function getSocketIpv4(socket) {
  return extractIpv4(socket.handshake.headers['x-forwarded-for'])
    || extractIpv4(socket.handshake.address)
    || '未知 IPv4';
}

const ipLocationCache = new Map();

function isPrivateIpv4(ip) {
  const octets = String(ip || '').split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return true;
  return octets[0] === 10
    || octets[0] === 127
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168)
    || (octets[0] === 169 && octets[1] === 254);
}

async function lookupIpv4Location(ip, fallback = '未知地区') {
  const normalizedIp = extractIpv4(ip);
  if (!normalizedIp) return fallback;
  if (isPrivateIpv4(normalizedIp)) return '局域网';
  if (ipLocationCache.has(normalizedIp)) return ipLocationCache.get(normalizedIp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  timeout.unref?.();
  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(normalizedIp)}/json/`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    const location = [data.city, data.region]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ');
    const resolved = location || '未知地区';
    ipLocationCache.set(normalizedIp, resolved);
    return resolved;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichDeviceLocation(room, connectionId, ip, fallback) {
  const device = room?.devices.get(connectionId);
  if (!device) return;
  const location = await lookupIpv4Location(ip, fallback);
  const currentRoom = rooms.get(room.roomId);
  const currentDevice = currentRoom?.devices.get(connectionId);
  if (!currentRoom || !currentDevice) return;
  currentDevice.location = location;
  broadcastOnlineDevices(currentRoom);
}

function normalizeMessageId(value) {
  const candidate = String(value || '').trim();
  if (!candidate || candidate.length > 120) return '';
  return candidate.replace(/[^a-zA-Z0-9._:-]/g, '');
}

function dataUrlToBytes(dataUrl = '') {
  const base64 = String(dataUrl).split(',')[1] || '';
  return Math.floor((base64.length * 3) / 4);
}

function makeDownloadUrl(roomId, assetId, download = false) {
  return '/api/clipboard/upload/' + encodeURIComponent(roomId) + '/' + encodeURIComponent(assetId) + (download ? '?download=1' : '');
}

function contentDispositionFileName(fileName) {
  const safeName = safeFileName(fileName);
  const asciiFallback = safeName.replace(/[^\x20-\x7E]/g, '_').replace(/[\\"]/g, '_') || 'download';
  return 'attachment; filename="' + asciiFallback + '"; filename*=UTF-8\'\'' + encodeURIComponent(safeName);
}

function clipSummary(room) {
  return {
    roomId: room.roomId,
    mode: room.mode,
    ttlMinutes: Math.round(room.ttlMs / 60000),
    ttlMs: room.ttlMs,
    expiresAt: room.expiresAt,
    lastActivityAt: room.lastActivityAt,
    clipCount: room.clips.length,
    clientCount: room.devices.size || room.clients.size + room.socketClients.size,
    maxClips: MAX_CLIPS,
  };
}

function buildOnlineDevices(room) {
  return Array.from(room.devices.values()).map((device) => ({
    id: device.connectionId,
    connectionId: device.connectionId,
    clientId: device.clientId,
    ip: device.ip || '未知 IP',
    location: device.location || '未知地区',
    deviceType: device.deviceType === 'Mobile' ? 'Mobile' : 'PC',
    isHost: Boolean(device.isHost),
  }));
}

function broadcastOnlineDevices(room) {
  const payload = { devices: buildOnlineDevices(room) };
  broadcastRoom(room, 'ONLINE_DEVICES_CHANGE', payload);
  socketServer?.to(room.roomId).emit('ONLINE_DEVICES_CHANGE', payload);
  return payload.devices;
}

function roomConfigPayload(room) {
  return {
    type: 'ROOM_CONFIG_SYNC',
    mode: room.mode,
    ttl: room.ttlMs ? Math.round(room.ttlMs / 1000) : 0,
    ttlMinutes: Math.round(room.ttlMs / 60000),
    expireAt: room.expiresAt,
    room: clipSummary(room),
  };
}

function trimClips(room) {
  while (room.clips.length > MAX_CLIPS) {
    const removed = room.clips.shift();
    if (removed?.assetId) room.assets.delete(removed.assetId);
  }
}

function writeSse(res, event, data) {
  res.write('event: ' + event + '\n');
  res.write('data: ' + JSON.stringify(data) + '\n\n');
}

function scheduleExpiry(room) {
  if (room.timer) clearTimeout(room.timer);
  if (!room.ttlMs || !Number.isFinite(room.ttlMs)) {
    room.timer = null;
    room.expiresAt = null;
    return;
  }
  room.expiresAt = Date.now() + room.ttlMs;
  room.timer = setTimeout(() => expireRoom(room.roomId, 'expired'), room.ttlMs);
  room.timer.unref?.();
}

function createRoom(roomId, ttlMinutes = DEFAULT_TTL_MINUTES) {
  const ttlMs = ttlMinutesToMs(ttlMinutes);
  const room = {
    roomId,
    hostToken: createHostToken(),
    mode: ttlMs === 0 ? 'persistent' : 'temporary',
    clips: [],
    assets: new Map(),
    clients: new Map(),
    socketClients: new Set(),
    devices: new Map(),
    hostConnectionId: null,
    hostDisconnectTimer: null,
    destroying: false,
    ttlMs,
    lastActivityAt: Date.now(),
    expiresAt: ttlMs === 0 ? null : Date.now() + ttlMs,
    timer: null,
  };
  rooms.set(roomId, room);
  scheduleExpiry(room);
  return room;
}

function ensureRoom(roomId, ttlMinutes = DEFAULT_TTL_MINUTES) {
  const normalized = normalizeRoomId(roomId);
  return rooms.get(normalized) || createRoom(normalized, ttlMinutes);
}

function touchRoom(room, ttlMinutes) {
  if (ttlMinutes !== undefined && ttlMinutes !== null && String(ttlMinutes).trim() !== '') {
    const normalizedTtl = parseTtlMinutes(ttlMinutes, -1);
    if (normalizedTtl >= 0) {
      room.ttlMs = ttlMinutesToMs(normalizedTtl);
      room.mode = room.ttlMs === 0 ? 'persistent' : 'temporary';
    }
  }
  room.lastActivityAt = Date.now();
  scheduleExpiry(room);
  return room;
}

function addClient(room, clientId, res, metadata = {}) {
  const existing = room.clients.get(clientId);
  if (existing) {
    clearInterval(existing.keepAlive);
    try { existing.res.end(); } catch (error) {}
  }

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': keep-alive\n\n');
  }, 25000);
  keepAlive.unref?.();

  room.clients.set(clientId, {
    res,
    keepAlive,
    clientId: metadata.clientId || clientId,
    ip: metadata.ip || '未知 IP',
    location: metadata.location || '未知地区',
    deviceType: metadata.deviceType === 'Mobile' ? 'Mobile' : 'PC',
  });
  res.on('close', () => removeClient(room, clientId, res));
}

function removeClient(room, clientId, expectedRes = null) {
  const client = room.clients.get(clientId);
  if (!client) return;
  if (expectedRes && client.res !== expectedRes) return;
  clearInterval(client.keepAlive);
  room.clients.delete(clientId);
  const device = room.devices.get(clientId);
  room.devices.delete(clientId);
  if (device?.isHost && room.hostConnectionId === clientId) {
    room.hostConnectionId = null;
    room.hostDisconnectTimer = setTimeout(() => {
      room.hostDisconnectTimer = null;
      if (rooms.get(room.roomId) === room && !room.hostConnectionId) {
        destroyRoom(room.roomId, 'Host 已退出，房间已被销毁');
      }
    }, 15000);
    room.hostDisconnectTimer.unref?.();
    broadcastOnlineDevices(room);
    return;
  }
  broadcastOnlineDevices(room);
}

function registerRoomDevice(room, connectionId, payload = {}, metadata = {}, isHost = false) {
  const normalizedConnectionId = String(connectionId || '').trim();
  if (!normalizedConnectionId) return null;
  const device = {
    connectionId: normalizedConnectionId,
    clientId: normalizeClientId(payload.clientId) || normalizedConnectionId,
    ip: String(metadata.ip || payload.ip || '未知 IP'),
    location: String(payload.deviceLocation || metadata.location || '未知地区'),
    deviceType: payload.deviceType === 'Mobile' || metadata.deviceType === 'Mobile' ? 'Mobile' : 'PC',
    isHost: Boolean(isHost),
  };
  room.devices.set(normalizedConnectionId, device);
  if (device.isHost) room.hostConnectionId = normalizedConnectionId;
  return device;
}

function broadcastRoom(room, event, data, excludeClientId = null) {
  for (const [clientId, client] of room.clients.entries()) {
    if (excludeClientId && clientId === excludeClientId) continue;
    if (client.res.writableEnded) continue;
    writeSse(client.res, event, data);
  }
}

function closeRoomClients(room, payload) {
  for (const client of room.clients.values()) {
    clearInterval(client.keepAlive);
    if (!client.res.writableEnded) writeSse(client.res, 'room:cleared', payload);
    try { client.res.end(); } catch (error) {}
  }
  room.clients.clear();
}

function expireRoom(roomId, reason = 'expired') {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.timer) clearTimeout(room.timer);
  const payload = { roomId: room.roomId, reason, clearedAt: Date.now() };
  socketServer?.to(room.roomId).emit('room:cleared', payload);
  closeRoomClients(room, payload);
  room.assets.clear();
  room.clips.length = 0;
  room.devices.clear();
  room.socketClients.clear();
  rooms.delete(roomId);
}

function destroyRoom(roomId, reason = 'Host 已退出，房间已被销毁') {
  const room = rooms.get(normalizeRoomId(roomId));
  if (!room || room.destroying) return false;
  if (room.hostDisconnectTimer) {
    clearTimeout(room.hostDisconnectTimer);
    room.hostDisconnectTimer = null;
  }
  room.destroying = true;
  if (room.timer) clearTimeout(room.timer);
  const payload = { roomId: room.roomId, reason, destroyedAt: Date.now() };
  broadcastRoom(room, 'HOST_DISCONNECTED', payload);
  socketServer?.to(room.roomId).emit('HOST_DISCONNECTED', payload);
  broadcastRoom(room, 'room:cleared', { ...payload, clearedAt: payload.destroyedAt });
  socketServer?.to(room.roomId).emit('room:cleared', { ...payload, clearedAt: payload.destroyedAt });
  closeRoomClients(room, payload);
  for (const connectionId of room.socketClients) {
    const clientSocket = socketServer?.sockets.sockets.get(connectionId);
    if (clientSocket) clientSocket.disconnect(true);
  }
  room.assets.clear();
  room.clips.length = 0;
  room.devices.clear();
  room.socketClients.clear();
  rooms.delete(room.roomId);
  return true;
}

function clearRoom(roomId, reason = 'manual') {
  const room = rooms.get(normalizeRoomId(roomId));
  if (!room) return null;
  const removedAssets = room.assets;
  room.assets = new Map();
  room.clips.length = 0;
  removedAssets.clear();
  touchRoom(room);
  const payload = { roomId: room.roomId, reason, clearedAt: Date.now(), room: clipSummary(room) };
  broadcastRoom(room, 'room:cleared', payload);
  socketServer?.to(room.roomId).emit('room:cleared', payload);
  return room;
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

function buildTextClip(room, payload, msgId, clientId) {
  const text = String(payload?.text || '').trimEnd();
  if (!text) throw new Error('EMPTY_TEXT');
  const normalizedText = text.slice(0, MAX_TEXT_LENGTH);
  return {
    id: crypto.randomUUID(),
    msgId,
    roomId: room.roomId,
    clientId,
    kind: 'text',
    text: normalizedText,
    textLength: normalizedText.length,
    size: Buffer.byteLength(normalizedText, 'utf8'),
    createdAt: Date.now(),
  };
}

function buildInlineClip(room, payload, msgId, clientId) {
  const dataUrl = String(payload?.dataUrl || '');
  if (!dataUrl.startsWith('data:')) throw new Error('INVALID_DATA_URL');
  const mimeType = String(payload?.mimeType || dataUrl.slice(5, dataUrl.indexOf(';')) || 'application/octet-stream');
  const isImage = String(payload?.kind || '').toLowerCase() === 'image' || mimeType.startsWith('image/');
  const fileName = safeFileName(payload?.fileName || (isImage ? 'image.png' : 'clipboard-file'));
  return {
    id: crypto.randomUUID(),
    msgId,
    roomId: room.roomId,
    clientId,
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

function buildAssetClip(room, asset, msgId, clientId) {
  return {
    id: crypto.randomUUID(),
    msgId,
    roomId: room.roomId,
    clientId,
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
  if (index === -1) return null;
  const [removed] = room.clips.splice(index, 1);
  if (removed?.assetId) room.assets.delete(removed.assetId);
  return removed;
}

function resolveClip(room, payload, msgId, clientId) {
  if (!payload || typeof payload !== 'object') throw new Error('INVALID_PAYLOAD');
  if (payload.assetId) {
    const asset = room.assets.get(String(payload.assetId));
    if (!asset) throw new Error('ASSET_NOT_FOUND');
    return buildAssetClip(room, asset, msgId, clientId);
  }
  if (payload.dataUrl) return buildInlineClip(room, payload, msgId, clientId);
  if (String(payload.kind || '').toLowerCase() === 'text' || payload.text) return buildTextClip(room, payload, msgId, clientId);
  throw new Error('UNSUPPORTED_CLIP');
}

function handleJoin(room, payload, connectionId = null, metadata = {}) {
  if (room.hostDisconnectTimer) {
    clearTimeout(room.hostDisconnectTimer);
    room.hostDisconnectTimer = null;
  }
  touchRoom(room);
  const isHost = hasValidHostToken(room, payload?.hostToken);
  if (connectionId) {
    registerRoomDevice(room, connectionId, payload, metadata, isHost);
  }
  return {
    ok: true,
    role: isHost ? 'host' : 'guest',
    room: clipSummary(room),
    config: roomConfigPayload(room),
    clips: room.clips,
    devices: buildOnlineDevices(room),
  };
}

function handleUpdateSettings(room, payload) {
  if (!hasValidHostToken(room, payload?.hostToken)) throw new Error('HOST_AUTH_REQUIRED');
  const requestedMode = String(payload?.mode || '').toLowerCase();
  const ttlMinutes = requestedMode === 'persistent'
    ? 0
    : parseTtlMinutes(payload?.ttlMinutes, Math.round(room.ttlMs / 60000));
  touchRoom(room, ttlMinutes);
  const roomState = clipSummary(room);
  broadcastRoom(room, 'room:settings', roomState);
  const config = roomConfigPayload(room);
  broadcastRoom(room, 'ROOM_CONFIG_SYNC', config);
  return { ok: true, room: roomState, config };
}

function handleClipSend(room, payload, clientId) {
  const msgId = normalizeMessageId(payload?.msgId) || crypto.randomUUID();
  const senderId = normalizeClientId(payload?.clientId) || normalizeClientId(clientId);
  const existingClip = room.clips.find((item) => item.msgId === msgId);
  if (existingClip) {
    return { ok: true, duplicate: true, room: clipSummary(room), clip: existingClip };
  }
  const clip = resolveClip(room, payload, msgId, senderId);
  clip.createdAt = Date.now();
  room.clips.push(clip);
  trimClips(room);
  touchRoom(room);
  const roomState = clipSummary(room);
  broadcastRoom(room, 'clip:sync', { room: roomState, clip }, clientId);
  return { ok: true, room: roomState, clip };
}

function handleClipDelete(room, payload) {
  const clip = removeClip(room, payload?.clipId);
  if (!clip) throw new Error('CLIP_NOT_FOUND');
  touchRoom(room);
  const roomState = clipSummary(room);
  broadcastRoom(room, 'clip:delete', { room: roomState, clipId: clip.id });
  return { ok: true, room: roomState };
}

function handleRoomClear(room, payload) {
  if (!hasValidHostToken(room, payload?.hostToken)) throw new Error('HOST_AUTH_REQUIRED');
  clearRoom(room.roomId, 'manual');
  return { ok: true, roomId: room.roomId, room: clipSummary(room) };
}

function handleRoomSession(payload) {
  const roomId = normalizeRoomId(payload?.roomId);
  const intent = String(payload?.intent || '').toLowerCase() === 'create' ? 'create' : 'join';
  const ttlMinutes = parseTtlMinutes(payload?.ttlMinutes, DEFAULT_TTL_MINUTES);
  let room = rooms.get(roomId);
  const created = !room;

  if (!room && intent === 'join') {
    throw new Error('ROOM_NOT_FOUND');
  }
  if (!room) room = createRoom(roomId, ttlMinutes);
  else touchRoom(room);

  const isHost = hasValidHostToken(room, payload?.hostToken) || (created && intent === 'create');
  const result = {
    ok: true,
    role: isHost ? 'host' : 'guest',
    room: clipSummary(room),
    config: roomConfigPayload(room),
  };

  if (isHost) result.hostToken = room.hostToken;
  return result;
}

function registerClipboardRealtime(app, httpServer) {
  if (httpServer && !socketServer) {
    socketServer = new SocketIoServer(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      transports: ['websocket', 'polling'],
    });

    socketServer.on('connection', (socket) => {
      socket.data.clientId = normalizeClientId(
        socket.handshake.auth?.clientId
        || socket.handshake.query?.clientId
        || socket.id,
      ) || socket.id;

      const getSocketRoom = (payload = {}) => {
        const roomSource = payload.roomId || socket.data.roomId;
        if (!roomSource) throw new Error('缺少房间号');
        const roomId = normalizeRoomId(roomSource);
        if (!socket.data.roomId || socket.data.roomId !== roomId) throw new Error('尚未加入该房间');
        const room = rooms.get(roomId);
        if (!room) throw new Error('房间不存在或已过期');
        return room;
      };

      socket.on('room:join', (payload = {}, acknowledge) => {
        try {
          if (!payload.roomId) throw new Error('缺少房间号');
          const roomId = normalizeRoomId(payload.roomId);
          if (socket.data.roomId && socket.data.roomId !== roomId) {
            const previousRoom = rooms.get(socket.data.roomId);
            const previousDevice = previousRoom?.devices.get(socket.id);
            if (previousDevice?.isHost && previousRoom?.hostConnectionId === socket.id) {
              destroyRoom(previousRoom.roomId, 'Host 已退出，房间已被销毁');
            } else if (previousRoom) {
              previousRoom.socketClients.delete(socket.id);
              previousRoom.devices.delete(socket.id);
              broadcastOnlineDevices(previousRoom);
            }
            socket.leave(socket.data.roomId);
          }

          const room = rooms.get(roomId);
          if (!room) throw new Error('ROOM_NOT_FOUND');
      socket.join(roomId);
      room.socketClients.add(socket.id);
      socket.data.roomId = roomId;
      socket.data.hostToken = String(payload.hostToken || '');
      const socketIp = getSocketIpv4(socket);
      const result = handleJoin(room, payload, socket.id, {
            ip: socketIp,
            location: payload.deviceLocation,
            deviceType: payload.deviceType,
          });
          socket.data.role = result.role;
          socket.emit('SYNC_HISTORY_STATE', { room: result.room, list: result.clips });
          socket.emit('ROOM_CONFIG_SYNC', result.config);
          socket.emit('ONLINE_DEVICES_CHANGE', { devices: result.devices });
          broadcastOnlineDevices(room);
          void enrichDeviceLocation(room, socket.id, socketIp, payload.deviceLocation);
          if (typeof acknowledge === 'function') acknowledge(result);
        } catch (error) {
          if (typeof acknowledge === 'function') acknowledge({ ok: false, error: error.message });
        }
      });

      socket.on('clip:send', (payload = {}, acknowledge) => {
        try {
          const room = getSocketRoom(payload);
          const result = handleClipSend(room, {
            ...payload,
            clientId: payload.clientId || socket.data.clientId,
          }, socket.data.clientId);
          if (result.ok && !result.duplicate) {
            socketServer.to(room.roomId).emit('clip:sync', { room: result.room, clip: result.clip });
          }
          if (typeof acknowledge === 'function') acknowledge(result);
        } catch (error) {
          if (typeof acknowledge === 'function') acknowledge({ ok: false, error: error.message });
        }
      });

      socket.on('clip:delete', (payload = {}, acknowledge) => {
        try {
          const room = getSocketRoom(payload);
          const result = handleClipDelete(room, payload);
          socket.to(room.roomId).emit('clip:delete', { room: result.room, clipId: payload.clipId });
          if (typeof acknowledge === 'function') acknowledge(result);
        } catch (error) {
          if (typeof acknowledge === 'function') acknowledge({ ok: false, error: error.message });
        }
      });

      socket.on('room:update-settings', (payload = {}, acknowledge) => {
        try {
          const room = getSocketRoom(payload);
          const result = handleUpdateSettings(room, {
            ...payload,
            hostToken: payload.hostToken || socket.data.hostToken,
          });
          socketServer.to(room.roomId).emit('room:settings', result.room);
          socketServer.to(room.roomId).emit('ROOM_CONFIG_SYNC', result.config);
          if (typeof acknowledge === 'function') acknowledge(result);
        } catch (error) {
          if (typeof acknowledge === 'function') acknowledge({ ok: false, error: error.message });
        }
      });

      socket.on('room:clear', (payload = {}, acknowledge) => {
        try {
          const room = getSocketRoom(payload);
          const result = handleRoomClear(room, {
            ...payload,
            hostToken: payload.hostToken || socket.data.hostToken,
          });
          if (typeof acknowledge === 'function') acknowledge(result);
        } catch (error) {
          if (typeof acknowledge === 'function') acknowledge({ ok: false, error: error.message });
        }
      });

      socket.on('room:destroy', (payload = {}, acknowledge) => {
        try {
          const room = getSocketRoom(payload);
          if (!hasValidHostToken(room, payload.hostToken || socket.data.hostToken)) {
            throw new Error('HOST_AUTH_REQUIRED');
          }
          destroyRoom(room.roomId, 'Host 已退出，房间已被销毁');
          if (typeof acknowledge === 'function') acknowledge({ ok: true });
        } catch (error) {
          if (typeof acknowledge === 'function') acknowledge({ ok: false, error: error.message });
        }
      });

      socket.on('room:kick-device', (payload = {}, acknowledge) => {
        try {
          const room = getSocketRoom(payload);
          if (!hasValidHostToken(room, payload.hostToken || socket.data.hostToken)) {
            throw new Error('HOST_AUTH_REQUIRED');
          }
          const targetId = String(payload.targetDeviceId || '');
          const target = Array.from(room.devices.values()).find((device) => (
            device.connectionId === targetId || device.clientId === targetId
          ));
          if (!target || target.connectionId === socket.id) throw new Error('DEVICE_NOT_FOUND');
          const kickPayload = {
            roomId: room.roomId,
            targetClientId: target.clientId,
            reason: '您已被房主移出房间',
          };
          const targetSocket = socketServer?.sockets.sockets.get(target.connectionId);
          if (targetSocket) {
            targetSocket.emit('KICK_DEVICE', kickPayload);
          }
          const targetSseClient = room.clients.get(target.connectionId);
          if (targetSseClient && !targetSseClient.res.writableEnded) {
            writeSse(targetSseClient.res, 'KICK_DEVICE', kickPayload);
            targetSseClient.res.end();
          }
          if (room.clients.has(target.connectionId)) {
            removeClient(room, target.connectionId);
          } else {
            room.devices.delete(target.connectionId);
          }
          room.socketClients.delete(target.connectionId);
          broadcastOnlineDevices(room);
          targetSocket?.disconnect(true);
          if (typeof acknowledge === 'function') acknowledge({ ok: true, devices: buildOnlineDevices(room) });
        } catch (error) {
          if (typeof acknowledge === 'function') acknowledge({ ok: false, error: error.message });
        }
      });

      socket.on('disconnect', () => {
        const room = rooms.get(socket.data.roomId);
        if (!room) return;
        const device = room.devices.get(socket.id);
        room.socketClients.delete(socket.id);
        room.devices.delete(socket.id);
        if (device?.isHost && room.hostConnectionId === socket.id) {
          room.hostConnectionId = null;
          room.hostDisconnectTimer = setTimeout(() => {
            room.hostDisconnectTimer = null;
            const currentRoom = rooms.get(room.roomId);
            if (currentRoom === room && !room.hostConnectionId && room.devices.size === 0) {
              destroyRoom(room.roomId, 'Host 已退出，房间已被销毁');
            }
          }, 15000);
          room.hostDisconnectTimer.unref?.();
          broadcastOnlineDevices(room);
          return;
        }
        broadcastOnlineDevices(room);
      });
    });
  }

  app.get('/api/clipboard/health', (req, res) => {
    res.json({
      status: 'ok',
      rooms: rooms.size,
      maxClips: MAX_CLIPS,
      defaultTtlMinutes: DEFAULT_TTL_MINUTES,
    });
  });

  app.post('/api/clipboard/room/session', (req, res) => {
    try {
      res.json(handleRoomSession(req.body || {}));
    } catch (error) {
      console.error('[clipboard/room/session] Error:', error.message);
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get('/api/clipboard/stream', (req, res) => {
    try {
      const roomSource = req.query.roomId || req.header('x-room-id');
      const clientSource = req.query.clientId || crypto.randomUUID();
      if (!roomSource) {
        return res.status(400).json({ error: '缺少房间号' });
      }

      const roomId = normalizeRoomId(roomSource);
      const clientId = String(clientSource || crypto.randomUUID());
      const requestedTtl = req.query.ttlMinutes;
      const room = rooms.get(roomId);
      if (!room) {
        return res.status(404).json({ error: '房间不存在或已销毁' });
      }
      touchRoom(room);

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();
      res.write('retry: 3000\n\n');

      const requestIp = getRequestIpv4(req);
      addClient(room, clientId, res, {
        ip: requestIp,
        location: req.query.deviceLocation,
        deviceType: req.query.deviceType,
      });
      const hostToken = String(req.query.hostToken || '');
      registerRoomDevice(room, clientId, {
        clientId,
        hostToken,
        deviceType: req.query.deviceType,
        deviceLocation: req.query.deviceLocation,
      }, {
        ip: requestIp,
        location: req.query.deviceLocation,
        deviceType: req.query.deviceType,
      }, hasValidHostToken(room, hostToken));
      void enrichDeviceLocation(room, clientId, requestIp, req.query.deviceLocation);
      writeSse(res, 'connected', { room: clipSummary(room), clientId });
      broadcastOnlineDevices(room);
    } catch (error) {
      console.error('[clipboard/stream] Error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: '无法建立实时连接', message: error.message });
      } else {
        try { res.end(); } catch (endError) {}
      }
    }
  });

  app.post('/api/clipboard/event', (req, res) => {
    try {
      const body = req.body || {};
      const roomId = normalizeRoomId(body.roomId || req.header('x-room-id'));
      const clientId = String(body.clientId || crypto.randomUUID());
      const event = String(body.event || '');
      const payload = body.payload || {};
      const requestedTtl = payload.ttlMinutes ?? body.ttlMinutes ?? DEFAULT_TTL_MINUTES;
      const room = rooms.get(roomId);
      if (!room) throw new Error('ROOM_NOT_FOUND');

      let result;
      switch (event) {
        case 'room:join': {
          const eventIp = getRequestIpv4(req);
          result = handleJoin(room, payload, clientId, {
            ip: eventIp,
            location: payload.deviceLocation,
            deviceType: payload.deviceType,
          });
          void enrichDeviceLocation(room, clientId, eventIp, payload.deviceLocation);
          broadcastOnlineDevices(room);
          if (room.clients.has(clientId)) {
            writeSse(room.clients.get(clientId).res, 'SYNC_HISTORY_STATE', {
              room: result.room,
              list: result.clips,
            });
            writeSse(room.clients.get(clientId).res, 'ROOM_CONFIG_SYNC', result.config);
          }
          break;
        }
        case 'room:update-settings':
          result = handleUpdateSettings(room, payload);
          break;
        case 'clip:send':
          result = handleClipSend(room, payload, clientId);
          if (result.ok && !result.duplicate) {
            const senderClient = room.clients.get(clientId);
            if (senderClient && !senderClient.res.writableEnded) {
              writeSse(senderClient.res, 'clip:sync', {
                room: result.room,
                clip: result.clip,
              });
            }
          }
          break;
        case 'clip:delete':
          result = handleClipDelete(room, payload);
          break;
        case 'room:clear':
          result = handleRoomClear(room, payload);
          break;
        case 'room:destroy':
          if (!hasValidHostToken(room, payload?.hostToken)) throw new Error('HOST_AUTH_REQUIRED');
          result = { ok: destroyRoom(room.roomId, 'Host 已退出，房间已被销毁') };
          break;
        case 'room:kick-device': {
          if (!hasValidHostToken(room, payload?.hostToken)) throw new Error('HOST_AUTH_REQUIRED');
          const targetId = String(payload?.targetDeviceId || '');
          const target = Array.from(room.devices.values()).find((device) => (
            device.connectionId === targetId || device.clientId === targetId
          ));
          if (!target || target.connectionId === clientId) throw new Error('DEVICE_NOT_FOUND');
          const kickPayload = {
            roomId: room.roomId,
            targetClientId: target.clientId,
            reason: '您已被房主移出房间',
          };
          const targetClient = room.clients.get(target.connectionId);
          if (targetClient && !targetClient.res.writableEnded) {
            writeSse(targetClient.res, 'KICK_DEVICE', kickPayload);
            targetClient.res.end();
          }
          if (room.clients.has(target.connectionId)) {
            removeClient(room, target.connectionId);
          } else {
            room.devices.delete(target.connectionId);
          }
          broadcastOnlineDevices(room);
          result = { ok: true, devices: buildOnlineDevices(room) };
          break;
        }
        default:
          throw new Error('UNSUPPORTED_EVENT');
      }

      res.json(result);
    } catch (error) {
      console.error('[clipboard/event] Error:', error.message);
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/clipboard/upload', upload.single('file'), (req, res) => {
    try {
      const roomSource = req.body?.roomId || req.query?.roomId || req.header('x-room-id');
      if (!roomSource) {
        return res.status(400).json({ error: '缺少房间号' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: '请上传文件' });
      }

      const roomId = normalizeRoomId(roomSource);
      const requestedTtl = req.body?.ttlMinutes ?? req.query?.ttlMinutes;
      const room = rooms.get(roomId);
      if (!room) {
        return res.status(404).json({ error: '房间不存在或已销毁' });
      }
      requireRoomMember(room, req);
      touchRoom(room);
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
    try {
      requireRoomMember(room, req);
    } catch (error) {
      return res.status(403).json({ error: error.message });
    }

    const download = req.query.download === '1' || req.query.download === 'true';
    const disposition = download || !asset.isImage ? 'attachment' : 'inline';
    const encodedFileName = encodeURIComponent(asset.fileName);

    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Length', String(asset.size));
    res.setHeader('Content-Disposition', disposition === 'attachment'
      ? contentDispositionFileName(asset.fileName)
      : 'inline; filename*=UTF-8\'\'' + encodedFileName);
    res.send(asset.buffer);
  });

  app.delete('/api/clipboard/upload/:roomId/:assetId', (req, res) => {
    const roomId = normalizeRoomId(req.params.roomId);
    const room = rooms.get(roomId);

    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    try {
      requireRoomMember(room, req);
    } catch (error) {
      return res.status(403).json({ error: error.message });
    }

    const assetId = String(req.params.assetId);
    const asset = room.assets.get(assetId);
    if (!asset) {
      return res.status(404).json({ error: '文件不存在' });
    }

    room.assets.delete(assetId);
    const clip = room.clips.find((item) => item.assetId === assetId);
    if (clip) {
      removeClip(room, clip.id);
    }
    touchRoom(room);
    broadcastRoom(room, 'clip:delete', { room: clipSummary(room), clipId: clip?.id || assetId });

    res.json({ ok: true });
  });

  app.post('/api/clipboard/clear/:roomId', (req, res) => {
    const roomId = normalizeRoomId(req.params.roomId);
    const room = rooms.get(roomId);
    if (!room) {
      return res.json({ ok: true, roomId, cleared: true });
    }

    const hostToken = req.body?.hostToken || req.header('x-host-token');
    if (!hasValidHostToken(room, hostToken)) {
      return res.status(403).json({ ok: false, error: 'HOST_AUTH_REQUIRED' });
    }

    clearRoom(roomId, 'manual');
    res.json({ ok: true, roomId, cleared: true, room: clipSummary(room) });
  });
}

module.exports = {
  registerClipboardRealtime,
  normalizeRoomId,
  parseTtlMinutes,
};
