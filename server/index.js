const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const parseRoute = require('./routes/parse');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- 安全 & 日志中间件 ----
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(morgan('combined'));

// ---- CORS 跨域 ----
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ---- 解析 JSON 请求体 ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---- API 路由 ----
app.use('/api', parseRoute);

// ---- 静态文件服务（生产环境托管前端构建产物） ----
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// ---- SPA fallback: 所有非 API 请求返回 index.html ----
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ---- 全局错误处理 ----
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 proHub server running on http://localhost:${PORT}`);
});
