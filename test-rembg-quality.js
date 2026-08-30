/**
 * 1) 重跑各已缓存模型记录热推理耗时
 * 2) 将每个输出合成到蓝底上 → quality-check/ 目录，供视觉对比抠图精度
 */
const fs = require('fs');
const path = require('path');
const sharp = require('./server/node_modules/sharp');

const REMBG_URL = process.env.REMBG_URL || 'http://localhost:8080';
const MODELS = ['u2netp', 'u2net', 'u2net_human_seg', 'silueta', 'isnet-general-use'];
const fileBuf = fs.readFileSync(path.join(__dirname, process.argv[2] || 'weibo-original.jpg'));
const OUT_DIR = path.join(__dirname, 'quality-check');

async function warmRun(model) {
  const t0 = Date.now();
  const form = new FormData();
  form.append('file', new Blob([fileBuf]), 'test.jpg');
  form.append('model', model);
  const res = await fetch(`${REMBG_URL}/api/remove`, { method: 'POST', body: form });
  const ms = Date.now() - t0;
  if (!res.ok) return { model, ok: false, ms };
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(__dirname, `rembg-out-${model}.png`), buf);
  return { model, ok: true, ms, bytes: buf.length };
}

async function alphaSoftStats(pngPath) {
  const { data, info } = await sharp(pngPath).raw().toBuffer({ resolveWithObject: true }); // eslint-disable-line
  if (info.channels < 4) return null;
  let soft = 0, opaque = 0, transparent = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a === 0) transparent++;
    else if (a === 255) opaque++;
    else soft++;
  }
  const total = opaque + soft + transparent;
  return { softPct: ((soft / total) * 100).toFixed(2), opaquePct: ((opaque / total) * 100).toFixed(2) };
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);
  console.log('===== 热推理耗时（模型已缓存）=====');
  for (const m of MODELS) {
    const r = await warmRun(m);
    console.log(r.ok ? `${m.padEnd(22)} ${(r.ms / 1000).toFixed(1)}s  ${(r.bytes / 1024).toFixed(0)}KB` : `${m.padEnd(22)} FAILED`);
  }

  console.log('\n===== Alpha 软边缘统计 + 合成蓝底预览 =====');
  for (const m of MODELS) {
    const p = path.join(__dirname, `rembg-out-${m}.png`);
    if (!fs.existsSync(p)) continue;
    const stats = await alphaSoftStats(p);
    const meta = await sharp(p).metadata();
    const bg = await sharp({
      create: { width: meta.width, height: meta.height, channels: 4, background: { r: 67, g: 142, b: 219, alpha: 1 } },
    }).png().toBuffer();
    await sharp(bg).composite([{ input: p }]).jpeg({ quality: 88 }).toFile(path.join(OUT_DIR, `blue-${m}.jpg`));
    console.log(`${m.padEnd(22)} soft-edge ${stats.softPct}%  opaque ${stats.opaquePct}%  → quality-check/blue-${m}.jpg`);
  }
})();
