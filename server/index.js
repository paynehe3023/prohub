const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const parseRoute = require('./routes/parse');
const removeBgRoute = require('./routes/remove-bg');
const wallpapersRoute = require('./routes/wallpapers');
const { registerClipboardRealtime } = require('./realtime/clipboard');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ---- Security & logging middleware ----
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(morgan('combined'));

// ---- CORS ----
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ---- Body parsing ----
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ---- API routes ----
app.use('/api', parseRoute);
app.use('/api', removeBgRoute);
app.use('/api', wallpapersRoute);
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