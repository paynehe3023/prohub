// 直接测试新的 removeWeiboWatermark 算法（不经过 Docker）
const fs = require('fs');
const sharp = require('sharp');

async function removeWeiboWatermark(buffer) {
  try {
    const meta = await sharp(buffer).metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (!w || !h || w < 600) return buffer;

    const mw = Math.ceil(w * 0.24);
    const mh = Math.ceil(h * 0.07);
    const x = w - mw;
    const y = h - mh;

    const sampleH = Math.min(mh * 3, y);
    const sampleTop = y - sampleH;
    let stage = buffer;
    if (sampleH > 0) {
      const patch = await sharp(buffer)
        .extract({ left: x, top: sampleTop, width: mw, height: sampleH })
        .resize(mw, mh)
        .blur(20)
        .toBuffer();
      stage = await sharp(buffer)
        .composite([{ input: patch, left: x, top: y, blend: 'over' }])
        .toBuffer();
    }

    const blurredWatermark = await sharp(stage)
      .extract({ left: x, top: y, width: mw, height: mh })
      .blur(30)
      .toBuffer();

    const result = await sharp(stage)
      .composite([{ input: blurredWatermark, left: x, top: y, blend: 'over' }])
      .jpeg({ quality: 92 })
      .toBuffer();

    console.log(`[WatermarkRemoval] ${w}x${h} watermark ${mw}x${mh} -> ${result.length} bytes`);
    return result;
  } catch (e) {
    console.error('[WatermarkRemoval] Error:', e.message);
    return buffer;
  }
}

(async () => {
  const orig = fs.readFileSync('weibo-original.jpg');
  const processed = await removeWeiboWatermark(orig);
  fs.writeFileSync('weibo-new-processed.jpg', processed);
  console.log('新算法处理后图已保存 weibo-new-processed.jpg, 大小:', processed.length, 'bytes');

  // 对比水印区域像素差异
  const m = await sharp(orig).metadata();
  const mw = Math.ceil(m.width * 0.24);
  const mh = Math.ceil(m.height * 0.07);
  const x = m.width - mw;
  const y = m.height - mh;

  const origRegion = await sharp(orig).extract({ left: x, top: y, width: mw, height: mh }).raw().toBuffer();
  const procRegion = await sharp(processed).extract({ left: x, top: y, width: mw, height: mh }).raw().toBuffer();
  let diff = 0, total = origRegion.length;
  for (let i = 0; i < total; i++) diff += Math.abs(origRegion[i] - procRegion[i]);
  console.log('水印区域平均像素差异:', (diff / total).toFixed(2), '(差异越大说明擦除越彻底)');

  // 检测处理后的水印区域是否还有高对比度边缘（文字痕迹）
  const channels = m.channels || 3;
  let edges = 0;
  for (let row = 0; row < mh; row++) {
    for (let col = 1; col < mw; col++) {
      const idx = (row * mw + col) * channels;
      const prevIdx = (row * mw + col - 1) * channels;
      let d = 0;
      for (let c = 0; c < channels; c++) d += Math.abs(procRegion[idx + c] - procRegion[prevIdx + c]);
      if (d / channels > 30) edges++;
    }
  }
  // 原图水印区域的高对比度边缘
  let origEdges = 0;
  for (let row = 0; row < mh; row++) {
    for (let col = 1; col < mw; col++) {
      const idx = (row * mw + col) * channels;
      const prevIdx = (row * mw + col - 1) * channels;
      let d = 0;
      for (let c = 0; c < channels; c++) d += Math.abs(origRegion[idx + c] - origRegion[prevIdx + c]);
      if (d / channels > 30) origEdges++;
    }
  }
  console.log('原图水印区域高对比度边缘数:', origEdges);
  console.log('处理后水印区域高对比度边缘数:', edges, '(接近0说明水印文字已消除)');
})();
