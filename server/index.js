const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
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
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

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
