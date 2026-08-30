const express = require('express');

const router = express.Router();

// ============================================================
// 二维码合并短链存储（纯内存 + LRU + TTL，用于缩短聚合二维码内容）
// ------------------------------------------------------------
// 问题：微信 / 支付宝 / 银联 / QQ 等收款码的原始链接可能非常长
//      （常见 400–2000 字符，甚至更长），把两条链接 encodeURIComponent
//      后直接塞进 /pay-merge?w=...&a=... 的 URL，再编码到二维码，
//      经常会超过 QR 库（qrcode）的 Version 40 容量，报"内容过长"。
// 解决：服务端生成 8 位短 ID 映射到 { w, a }，扫码端通过 /pay-merge?s=ID
//      再拉取展开。TTL 默认 30 天，容量上限 10 万条（简单 Map + LRU 清理）。
// ============================================================

/** @type {Map<string, { w: string, a: string, createdAt: number }>} */
const store = new Map();
const MAX_ENTRIES = 100_000;
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
const SAFE_PATTERN = /^(wxp:\/\/|alipays:\/\/|alipayqr:\/\/|https?:\/\/|qqpay:\/\/|uppay:\/\/|weixin:\/\/|wx:\/\/)/i;

function createShortId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function evictIfNeeded() {
  if (store.size <= MAX_ENTRIES) return;
  // 最旧的 10% 批量淘汰（基于插入顺序的 Map Iterator）
  const evictCount = Math.max(1, Math.floor(MAX_ENTRIES * 0.1));
  const keys = store.keys();
  for (let i = 0; i < evictCount; i++) {
    const { value, done } = keys.next();
    if (done) break;
    store.delete(value);
  }
}

function purgeExpired(now = Date.now()) {
  for (const [id, entry] of store.entries()) {
    if (now - entry.createdAt > TTL_MS) store.delete(id);
  }
}

// 周期性清理过期条目（每小时一次，避免内存因过期条目膨胀）
setInterval(() => purgeExpired(), 60 * 60 * 1000).unref?.();

function safeValue(raw) {
  if (typeof raw !== 'string' || !raw) return '';
  const v = raw.trim();
  if (!v) return '';
  // 宽松校验：匹配支付/链接协议
  if (SAFE_PATTERN.test(v)) return v;
  // 纯数字串或混合串也视为合法（部分银行/聚合码使用纯 base64 token）
  if (v.length <= 4096) return v;
  return '';
}

// POST /api/qr/shorten  { w, a }  →  { id, expiresAt }
router.post('/qr/shorten', (req, res) => {
  try {
    const w = safeValue(req.body?.w);
    const a = safeValue(req.body?.a);
    if (!w || !a) {
      return res.status(400).json({ error: '缺少微信或支付宝二维码内容' });
    }

    purgeExpired();

    let id;
    let attempts = 0;
    do {
      id = createShortId();
      attempts++;
      if (attempts > 10) {
        return res.status(500).json({ error: '短 ID 生成失败，请重试' });
      }
    } while (store.has(id));

    const createdAt = Date.now();
    store.set(id, { w, a, createdAt });
    evictIfNeeded();

    res.json({
      id,
      expiresAt: new Date(createdAt + TTL_MS).toISOString(),
    });
  } catch (err) {
    console.error('[QR shorten]', err.message);
    res.status(500).json({ error: '短链生成失败', message: err.message });
  }
});

// GET /api/qr/expand?id=xxx  →  { w, a }
router.get('/qr/expand', (req, res) => {
  try {
    const id = String(req.query?.id || '');
    if (!id) {
      return res.status(400).json({ error: '缺少短链 ID' });
    }
    const entry = store.get(id);
    if (!entry) {
      return res.status(404).json({ error: '短链不存在或已过期' });
    }
    if (Date.now() - entry.createdAt > TTL_MS) {
      store.delete(id);
      return res.status(404).json({ error: '短链已过期' });
    }
    res.json({ w: entry.w, a: entry.a });
  } catch (err) {
    console.error('[QR expand]', err.message);
    res.status(500).json({ error: '短链展开失败', message: err.message });
  }
});

module.exports = router;
