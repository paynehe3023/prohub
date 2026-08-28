const express = require('express');

const router = express.Router();
const MAX_CONTENT_LENGTH = 500;
const MAX_CONTACT_LENGTH = 120;
const MAX_ATTACHMENT_COUNT = 6;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg']);
const ALLOWED_FEEDBACK_TYPES = new Set(['功能建议', 'Bug 提交', '商务合作', '其他']);
const FEEDBACK_RECIPIENT = '947919822@qq.com';

function cleanText(value, maxLength) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function cleanSingleLine(value, maxLength) {
  return cleanText(value, maxLength).replace(/[\r\n]/g, ' ');
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > MAX_ATTACHMENT_BYTES) return null;
  return { mimeType: match[1].toLowerCase(), buffer };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createTransport() {
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    throw new Error('服务器未安装 nodemailer 依赖');
  }

  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port,
    secure: String(process.env.SMTP_SECURE || (port === 465)).toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

router.post('/feedback', async (req, res) => {
  try {
    const body = req.body || {};
    if (String(body.honeypot || '').trim()) {
      return res.json({ ok: true });
    }

    const requestedType = cleanSingleLine(body.type, 32);
    const type = ALLOWED_FEEDBACK_TYPES.has(requestedType) ? requestedType : '其他';
    const content = cleanText(body.content, MAX_CONTENT_LENGTH);
    const contact = cleanSingleLine(body.contact, MAX_CONTACT_LENGTH);
    if (!content) {
      return res.status(400).json({ ok: false, error: '反馈内容不能为空' });
    }

    const rawAttachments = Array.isArray(body.attachments) ? body.attachments.slice(0, MAX_ATTACHMENT_COUNT) : [];
    const attachments = [];
    for (const item of rawAttachments) {
      const decoded = decodeDataUrl(item?.dataUrl);
      if (!decoded || !ALLOWED_TYPES.has(decoded.mimeType)) {
        return res.status(400).json({ ok: false, error: '附件格式或大小无效' });
      }
      attachments.push({
        filename: (cleanSingleLine(item?.name, 160) || 'feedback-image').replace(/[\\/:*?"<>|]/g, '_'),
        content: decoded.buffer,
        contentType: decoded.mimeType,
      });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(503).json({ ok: false, error: '反馈邮件服务尚未配置，请稍后再试' });
    }

    const submittedAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const subject = `[用户反馈 - ${type}] 来自网页终端用户的意见`;
    const html = `
      <div style="font-family:Arial,'Microsoft YaHei',sans-serif;line-height:1.7;color:#1e293b">
        <h2 style="margin:0 0 16px;color:#0f172a">${escapeHtml(subject)}</h2>
        <p><strong>反馈类型：</strong>${escapeHtml(type)}</p>
        <p><strong>提交时间：</strong>${escapeHtml(submittedAt)}</p>
        <p><strong>联系方式：</strong>${escapeHtml(contact || '未填写')}</p>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:18px 0">
        <p style="white-space:pre-wrap">${escapeHtml(content)}</p>
        ${attachments.length ? `<p><strong>图片附件：</strong>${attachments.length} 张，已随邮件附上。</p>` : ''}
      </div>
    `;

    const transporter = createTransport();
    await transporter.sendMail({
      from: process.env.FEEDBACK_FROM || process.env.SMTP_USER,
      to: FEEDBACK_RECIPIENT,
      subject,
      text: `反馈类型：${type}\n提交时间：${submittedAt}\n联系方式：${contact || '未填写'}\n\n${content}`,
      html,
      attachments,
    });

    return res.json({ ok: true, recipient: FEEDBACK_RECIPIENT });
  } catch (error) {
    console.error('[feedback] Error:', error.message);
    return res.status(500).json({ ok: false, error: '反馈发送失败，请稍后重试' });
  }
});

module.exports = router;
