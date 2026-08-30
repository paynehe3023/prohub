/**
 * rembg 抠图模型对比测试脚本
 * 用法: node test-rembg-models.js <测试图片路径>
 * 通过 rembg HTTP 服务 (host 8080) 依次测试各人像相关模型，
 * 记录耗时、输出尺寸、Alpha 边缘统计（半透明像素占比 = 头发等软边缘质量指标）。
 */
const fs = require('fs');
const path = require('path');

const REMBG_URL = process.env.REMBG_URL || 'http://localhost:8080';
const MODELS = [
  'u2netp',
  'u2net',
  'u2net_human_seg',
  'silueta',
  'isnet-general-use',
  'isnet-anime',
  'birefnet-general-lite',
  'birefnet-portrait',
];

function pngAlphaStats(buf) {
  // 用最小 PNG 解码：借助 Node 内置无 PNG 解码器，改为输出文件大小与尺寸（IHDR）
  // IHDR: 宽高在字节 16-24
  if (buf.length < 24 || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

async function testModel(model, fileBuf) {
  const t0 = Date.now();
  const form = new FormData();
  form.append('file', new Blob([fileBuf]), 'test.jpg');
  form.append('model', model);
  const res = await fetch(`${REMBG_URL}/api/remove`, { method: 'POST', body: form });
  const ms = Date.now() - t0;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { model, ok: false, ms, error: `HTTP ${res.status} ${text.slice(0, 80)}` };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const dims = pngAlphaStats(buf);
  const out = path.join(__dirname, `rembg-out-${model}.png`);
  fs.writeFileSync(out, buf);
  return { model, ok: true, ms, bytes: buf.length, ...dims, out };
}

(async () => {
  const imgPath = process.argv[2];
  if (!imgPath || !fs.existsSync(imgPath)) {
    console.error('请提供测试图片路径: node test-rembg-models.js <图片>');
    process.exit(1);
  }
  const fileBuf = fs.readFileSync(imgPath);
  console.log(`测试图片: ${imgPath} (${(fileBuf.length / 1024).toFixed(0)} KB)`);
  console.log(`rembg: ${REMBG_URL}\n`);
  const results = [];
  for (const m of MODELS) {
    process.stdout.write(`→ ${m} ... `);
    try {
      const r = await testModel(m, fileBuf);
      results.push(r);
      if (r.ok) console.log(`${(r.ms / 1000).toFixed(1)}s | ${r.width}x${r.height} | ${(r.bytes / 1024).toFixed(0)} KB`);
      else console.log(`失败: ${r.error}`);
    } catch (e) {
      results.push({ model: m, ok: false, error: e.message });
      console.log(`失败: ${e.message}`);
    }
  }
  console.log('\n===== 汇总 =====');
  for (const r of results) {
    console.log(r.ok
      ? `${r.model.padEnd(24)} ${(r.ms / 1000).toFixed(1)}s  ${r.width}x${r.height}  ${(r.bytes / 1024).toFixed(0)}KB  ${r.out}`
      : `${r.model.padEnd(24)} FAILED: ${r.error}`);
  }
})();
