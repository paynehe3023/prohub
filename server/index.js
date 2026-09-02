const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');

const parseRoute = require('./routes/parse');
const removeBgRoute = require('./routes/remove-bg');
const wallpapersRoute = require('./routes/wallpapers');
const forbiddenWordsRoute = require('./routes/forbidden-words');
const qrShortenRoute = require('./routes/qr-shorten');
const feedbackRoute = require('./routes/feedback');
const notificationsRoute = require('./routes/notifications');
const { registerClipboardRealtime } = require('./realtime/clipboard');

const app = express();
const videoWorkerUrl = process.env.VIDEO_WORKER_URL || 'http://video-worker:8090';
const uploadDir = process.env.VIDEO_UPLOAD_DIR || path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const uploadSessions = new Map();
const uploadChunkLimit = 512 * 1024;
const uploadSizeLimit = 2 * 1024 * 1024 * 1024;
const uploadSessionTtl = 60 * 60 * 1000;

function discardUpload(id, session) {
  uploadSessions.delete(id);
  try { fs.unlinkSync(session.filePath); } catch {}
}

app.post('/video-upload/sessions', express.json({ limit: '1mb' }), (req, res) => {
  const { filename, size, type } = req.body || {};
  if (!filename || !Number.isSafeInteger(size) || size < 1 || size > uploadSizeLimit) return res.status(400).json({ error: '无效的视频文件信息' });
  const id = crypto.randomUUID();
  const filePath = path.join(uploadDir, id + path.extname(filename).toLowerCase());
  fs.closeSync(fs.openSync(filePath, 'w'));
  const chunkCount = Math.ceil(size / uploadChunkLimit);
  const session = { filename, size, type: type || 'video/mp4', filePath, received: 0, chunks: new Set(), pendingChunks: new Set(), uploadedIndices: new Set(), chunkCount };
  session.expiry = setTimeout(() => discardUpload(id, session), uploadSessionTtl);
  session.expiry.unref?.();
  uploadSessions.set(id, session);
  res.status(201).json({ upload_id: id, chunk_size: uploadChunkLimit });
});

app.put('/video-upload/sessions/:id/chunks/:index', (req, res) => {
  const session = uploadSessions.get(req.params.id);
  const index = Number(req.params.index);
  if (!session || !Number.isInteger(index) || index < 0 || index >= session.chunkCount) return res.status(404).json({ error: '上传会话不存在' });
  const start = Number(req.headers['x-chunk-start']);
  const length = Number(req.headers['x-chunk-length']);
  const expectedStart = index * uploadChunkLimit;
  if (!Number.isInteger(start) || !Number.isInteger(length) || start < 0 || length < 1 || length > uploadChunkLimit
    || start !== expectedStart || start + length > session.size || session.chunks.has(index) || session.pendingChunks.has(index)) {
    return res.status(400).json({ error: '分片参数无效' });
  }
  session.pendingChunks.add(index);

  const parts = [];
  let receivedBytes = 0;
  let tooLarge = false;
  req.on('data', chunk => {
    receivedBytes += chunk.length;
    if (receivedBytes <= length) parts.push(chunk);
    else tooLarge = true;
  });
  req.on('end', () => {
    if (tooLarge || receivedBytes !== length) {
      session.pendingChunks.delete(index);
      return res.status(400).json({ error: '分片长度不匹配' });
    }
    const data = Buffer.concat(parts);
    fs.open(session.filePath, 'r+', (openError, fd) => {
      if (openError) {
        session.pendingChunks.delete(index);
        return res.status(500).json({ error: openError.message });
      }
      fs.write(fd, data, 0, data.length, start, (writeError) => {
        fs.close(fd, closeError => {
          session.pendingChunks.delete(index);
          const error = writeError || closeError;
          if (error) return res.status(500).json({ error: error.message });
          if (!session.uploadedIndices.has(index)) {
            session.uploadedIndices.add(index);
            session.chunks.add(index);
            session.received += length;
          }
          res.json({ received: session.received });
        });
      });
    });
  });
  req.on('error', error => { if (!res.headersSent) res.status(400).json({ error: error.message }); });
});

app.post('/video-upload/sessions/:id/complete', express.json({ limit: '1mb' }), async (req, res) => {
  const session = uploadSessions.get(req.params.id);
  if (!session || session.received !== session.size || session.pendingChunks.size > 0 || session.uploadedIndices.size !== session.chunkCount) {
    return res.status(400).json({ error: '视频分片尚未上传完整' });
  }
  const stat = fs.statSync(session.filePath);
  if (stat.size !== session.size) {
    return res.status(400).json({ error: '视频文件大小不一致' });
  }
  const body = JSON.stringify({ filename: session.filename, file_path: session.filePath, tasks: req.body?.tasks || [], whisper_model: req.body?.whisper_model || 'small' });
  const target = new URL(`${videoWorkerUrl}/uploads/complete`);
  const proxyRequest = http.request(target, { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, workerResponse => {
    res.status(workerResponse.statusCode || 502);
    workerResponse.pipe(res);
    workerResponse.on('end', () => {
        if ((workerResponse.statusCode || 500) < 300) {
          clearTimeout(session.expiry);
          try { fs.unlinkSync(session.filePath); } catch {}
          uploadSessions.delete(req.params.id);
        }
      });
  });
  proxyRequest.on('error', error => res.status(502).json({ error: '视频 Worker 不可用', message: error.message }));
  proxyRequest.write(body);
  proxyRequest.end();
});

// Keep multipart uploads and SSE streaming untouched while forwarding them to the local Python worker.
app.use('/video-worker', (req, res) => {
  const target = new URL(`${videoWorkerUrl}${req.originalUrl.replace(/^\/video-worker/, '')}`);
  const transport = target.protocol === 'https:' ? require('https') : http;
  const headers = { ...req.headers, host: target.host };
  const proxyRequest = transport.request(target, {
    method: req.method,
    headers,
  }, proxyResponse => {
    res.status(proxyResponse.statusCode || 502);
    for (const [key, value] of Object.entries(proxyResponse.headers)) {
      if (value !== undefined) res.setHeader(key, value);
    }
    proxyResponse.pipe(res);
  });

  proxyRequest.on('error', error => {
    console.error('[Video Worker Proxy]', error.message);
    if (!res.headersSent) {
      res.status(502).json({ error: '视频 Worker 不可用', message: error.message });
    } else {
      res.destroy(error);
    }
  });

  req.on('aborted', () => proxyRequest.destroy());
  res.on('close', () => {
    if (!res.writableEnded) proxyRequest.destroy();
  });
  req.pipe(proxyRequest);
});
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const trustProxy = /^(1|true|yes)$/i.test(String(process.env.TRUST_PROXY || ''));
app.set('trust proxy', trustProxy);

// ---- Security & logging middleware ----
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(morgan('combined'));

// ---- CORS ----
const TRUSTED_CORS_ORIGINS = new Set(
  String(process.env.TRUSTED_CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// 仅当 Origin 精确匹配白名单时才注入 Access-Control-Allow-Credentials
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && TRUSTED_CORS_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// ---- Body parsing ----
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ---- API routes ----
app.use('/api', parseRoute);
app.use('/api', removeBgRoute);
app.use('/api', wallpapersRoute);
app.use('/api', forbiddenWordsRoute);
app.use('/api', qrShortenRoute);
app.use('/api', feedbackRoute);
app.use('/api', notificationsRoute);
registerClipboardRealtime(app, server);

// ---- Static files (production frontend build) ----
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// ---- SPA fallback ----
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ---- Global error handler ----
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

server.listen(PORT, () => {
  console.log(`🚀 proHub server running on http://localhost:${PORT}`);
});
