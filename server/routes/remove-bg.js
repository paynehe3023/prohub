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
// isnet-general-use：实测人像边缘精度最佳（发丝自然、头顶完整、无黑边晕圈），热推理约 2s
const REMBG_MODEL = process.env.REMBG_MODEL || 'isnet-general-use';
// rembg 冷启动加载模型 + 移动端弱网重传，需要更长的上游超时
const UPSTREAM_TIMEOUT = 120000;

/**
 * 归一化输入：HEIC/WebP/AVIF 等统一转为 PNG 再转发 rembg（其内部 PIL 不支持 HEIC）
 * 同时限制最长边 2048px，避免手机原片（12MP+）导致上游推理与响应体过大
 */
async function normalizeToPng(inputBuffer) {
  const pipeline = sharp(inputBuffer, { failOn: 'none' }).rotate();
  const meta = await pipeline.metadata();
  if (meta.width && meta.height && Math.max(meta.width, meta.height) > 2048) {
    pipeline.resize(2048, 2048, { fit: 'inside', withoutEnlargement: true });
  }
  return pipeline.png({ compressionLevel: 6 }).toBuffer();
}

/**
 * POST /api/remove
 * Multipart form with 'file' field → returns PNG with transparent background
 */
router.post('/remove-bg', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片文件', code: 400 });
    }

    let inputBuffer;
    try {
      inputBuffer = await normalizeToPng(req.file.buffer);
    } catch (e) {
      return res.status(400).json({ error: '图片解析失败', message: '无法识别该图片格式，请使用 JPG/PNG/HEIC/WebP 常规照片', code: 400 });
    }

    const form = new FormData();
    form.append('file', inputBuffer, {
      filename: 'input.png',
      contentType: 'image/png',
    });
    form.append('model', REMBG_MODEL);
    // 人像分割模型 + 后处理遮罩，改善头发边缘

    console.log('[remove-bg] Processing image:', req.file.originalname, `(${req.file.size} bytes → normalized ${inputBuffer.length} bytes)`);

    const response = await axios.post(`${REMBG_URL}/api/remove`, form, {
      headers: { ...form.getHeaders() },
      responseType: 'arraybuffer',
      timeout: UPSTREAM_TIMEOUT,
      maxContentLength: 64 * 1024 * 1024,
    });

    // 输出压缩：PNG → WebP（保留 alpha，体积降约 60-70%，iOS 14+/全部现代浏览器支持）
    let outputBuffer = Buffer.from(response.data);
    let contentType = 'image/png';
    try {
      outputBuffer = await sharp(outputBuffer)
        .webp({ quality: 90, alphaQuality: 90 })
        .toBuffer();
      contentType = 'image/webp';
    } catch (e) {
      console.error('[remove-bg] WebP compress failed, fallback to PNG:', e.message);
    }

    console.log('[remove-bg] Success:', outputBuffer.length, 'bytes,', contentType);
    res.setHeader('Content-Type', contentType);
    res.send(outputBuffer);
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


