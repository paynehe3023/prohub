const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'notifications.json');
const LEVELS = new Set(['info', 'success', 'warning', 'danger']);
const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 2000;

function cleanText(value, maxLength) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function readNotifications() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[notifications] Read failed:', error.message);
    return [];
  }
}

function writeNotifications(notifications) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(notifications, null, 2), 'utf8');
}

function removeExpired(notifications) {
  const now = Date.now();
  return notifications.filter((item) => {
    if (!item.expiresAt) return true;
    const expiresAt = new Date(item.expiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
}

function getPublicNotifications() {
  const notifications = readNotifications();
  const activeNotifications = removeExpired(notifications);
  if (activeNotifications.length !== notifications.length) writeNotifications(activeNotifications);
  return activeNotifications;
}

const sessions = new Map();
const SESSION_COOKIE = 'notify_admin_session';
const SESSION_TTL = 8 * 60 * 60 * 1000;

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function requireMaintainer(req, res, next) {
  const token = parseCookies(req)[SESSION_COOKIE];
  const session = token && sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ ok: false, error: '需要管理员登录' });
  }
  session.expiresAt = Date.now() + SESSION_TTL;
  req.admin = { username: session.username };
  return next();
}

router.post('/admin/notifications/login', (req, res) => {
  const username = String(process.env.ADMIN_USERNAME || '').trim();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!username || !password) return res.status(503).json({ ok: false, error: '管理员账号未配置' });
  if (String(req.body?.username || '') !== username || String(req.body?.password || '') !== password) {
    return res.status(401).json({ ok: false, error: '账号或密码错误' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, expiresAt: Date.now() + SESSION_TTL });
  const cookieParts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${Math.floor(SESSION_TTL / 1000)}`];
  if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  return res.json({ ok: true, username });
});

router.post('/admin/notifications/logout', (req, res) => {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) sessions.delete(token);
  const cookieParts = [`${SESSION_COOKIE}=`, 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  return res.json({ ok: true });
});

router.get('/admin/notifications/me', requireMaintainer, (req, res) => res.json({ ok: true, username: req.admin.username }));

router.get('/admin/notifications', requireMaintainer, (req, res) => {
  return res.json({ ok: true, notifications: readNotifications() });
});

router.get('/notifications', (req, res) => {
  return res.json({ ok: true, notifications: getPublicNotifications() });
});

router.get('/notifications/:id', (req, res) => {
  const notification = getPublicNotifications().find((item) => item.id === req.params.id);
  if (!notification) return res.status(404).json({ ok: false, error: '通知不存在' });
  return res.json({ ok: true, notification });
});

router.post('/notifications', requireMaintainer, (req, res) => {
  const body = req.body || {};
  const title = cleanText(body.title, MAX_TITLE_LENGTH);
  const content = cleanText(body.content, MAX_CONTENT_LENGTH);
  const level = LEVELS.has(body.level) ? body.level : 'info';
  if (!title || !content) return res.status(400).json({ ok: false, error: '标题和内容不能为空' });

  let expiresAt = null;
  if (body.expiresAt) {
    const date = new Date(body.expiresAt);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      return res.status(400).json({ ok: false, error: '过期时间必须是未来的有效时间' });
    }
    expiresAt = date.toISOString();
  }

  const notification = {
    id: crypto.randomUUID(),
    title,
    content,
    level,
    expiresAt,
    createdAt: new Date().toISOString(),
  };
  const notifications = removeExpired(readNotifications());
  notifications.unshift(notification);
  writeNotifications(notifications);
  return res.status(201).json({ ok: true, notification });
});

router.delete('/notifications/:id', requireMaintainer, (req, res) => {
  const notifications = getPublicNotifications();
  const next = notifications.filter((item) => item.id !== req.params.id);
  if (next.length === notifications.length) return res.status(404).json({ ok: false, error: '通知不存在' });
  writeNotifications(next);
  return res.json({ ok: true });
});

module.exports = router;
