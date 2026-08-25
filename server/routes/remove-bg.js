const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const sharp = require('sharp');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
});

// rembg server URL (host.docker.internal for Docker → host Python process)
const REMBG_URL = process.env.REMBG_URL || 'http://rembg:8080';
const REMBG_MODEL = process.env.REMBG_MODEL || 'u2netp';

/**
 * POST /api/remove
 * Multipart form with 'file' field → returns PNG with transparent background
 */
router.post('/remove-bg', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片文件', code: 400 });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'image.png',
      contentType: req.file.mimetype || 'image/png',
    });
    form.append('model', REMBG_MODEL);
    // 人像分割模型 + 后处理遮罩，改善头发边缘

    console.log('[remove-bg] Processing image:', req.file.originalname, `(${req.file.size} bytes)`);

    const response = await axios.post(`${REMBG_URL}/api/remove`, form, {
      headers: { ...form.getHeaders() },
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    console.log('[remove-bg] Success:', response.data.length, 'bytes');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename="no-bg.png"');
    res.send(Buffer.from(response.data));
  } catch (err) {
    console.error('[remove-bg] Error:', err.message);
    const msg = err.response?.status === 500
      ? 'rembg 服务处理失败，请重试'
      : err.code === 'ECONNREFUSED'
      ? 'rembg 服务未启动，请检查服务状态'
      : err.message;
    res.status(500).json({ error: '去背景失败', message: msg, code: 500 });
  }
});

/**
 * POST /api/replace
 * Multipart form with 'file' + query param 'color=R,G,B' → returns PNG with solid color background
 * Presets: blue=67,142,219 | white=255,255,255 | red=197,48,48 | gray=200,200,200
 */
router.post('/replace-bg', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片文件', code: 400 });
    }

    // Parse color: from query or body, default to证件照蓝色
    let color = req.query.color || req.body?.color || '67,142,219';
    if (typeof color !== 'string') color = '67,142,219';

    // Validate color format
    const parts = color.split(',').map(Number);
    if (parts.length !== 3 || parts.some(v => isNaN(v) || v < 0 || v > 255)) {
      return res.status(400).json({ error: '颜色格式错误，应为 R,G,B', code: 400 });
    }

    console.log('[replace-bg] Processing image with color:', color);

    // 先调用 rembg 去背景
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'image.png',
      contentType: req.file.mimetype || 'image/png',
    });
    form.append('model', REMBG_MODEL);
    form.append('post_process_mask', 'true');

    const removeResp = await axios.post(`${REMBG_URL}/api/remove`, form, {
      headers: { ...form.getHeaders() },
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    // 用 sharp 合成底色
    const [r, g, b] = parts;
    const meta = await sharp(removeResp.data).metadata();
    const composited = await sharp(removeResp.data)
      .resize(Math.round(meta.width), Math.round(meta.height), { fit: 'fill' })
      .flatten({ background: { r, g, b, alpha: 1 } })
      .png()
      .toBuffer();

    console.log('[replace-bg] Success:', composited.length, 'bytes');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename="id-photo.png"');
    res.send(Buffer.from(composited));
  } catch (err) {
    console.error('[replace-bg] Error:', err.message);
    const msg = err.code === 'ECONNREFUSED'
      ? 'rembg 服务未启动，请检查服务状态'
      : err.message;
    res.status(500).json({ error: '换背景失败', message: msg, code: 500 });
  }
});
/**
 * GET /api/bg-health
 * Check rembg service status
 */
router.get('/bg-health', async (req, res) => {
  try {
    // rembg 官方镜像 (danielgatis/rembg) 无 /health 端点，用根路径 / 检测存活
    const response = await axios.get(`${REMBG_URL}/`, { timeout: 5000, validateStatus: s => s < 500 });
    res.json({ status: 'ok', rembg: { endpoint: '/', statusCode: response.status } });
  } catch (err) {
    res.json({ status: 'degraded', rembg: { error: err.message } });
  }
});

module.exports = router;


