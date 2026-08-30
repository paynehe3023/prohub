// 分析微博原图右下角水印的确切位置
const fs = require('fs');
const sharp = require('sharp');

(async () => {
  const buf = fs.readFileSync('weibo-original.jpg');
  const meta = await sharp(buf).metadata();
  const w = meta.width, h = meta.height;
  console.log('图片尺寸:', w + 'x' + h);

  // 提取底部 30% 区域的 raw 像素
  const bottomH = Math.floor(h * 0.3);
  const bottomTop = h - bottomH;
  const raw = await sharp(buf)
    .extract({ left: 0, top: bottomTop, width: w, height: bottomH })
    .raw()
    .toBuffer();
  const channels = meta.channels || 3;

  // 扫描每行每列的"高对比度像素"(水印文字边缘)
  // 计算每个像素和左边像素的差异,差异大说明有文字边缘
  const rowEdgeCount = new Array(bottomH).fill(0);
  const colEdgeCount = new Array(w).fill(0);
  let totalEdges = 0;

  for (let row = 0; row < bottomH; row++) {
    for (let col = 1; col < w; col++) {
      const idx = (row * w + col) * channels;
      const prevIdx = (row * w + col - 1) * channels;
      let diff = 0;
      for (let c = 0; c < channels; c++) {
        diff += Math.abs(raw[idx + c] - raw[prevIdx + c]);
      }
      diff = diff / channels;
      if (diff > 30) { // 高对比度边缘
        rowEdgeCount[row]++;
        colEdgeCount[col]++;
        totalEdges++;
      }
    }
  }

  console.log('底部30%区域总高对比度边缘数:', totalEdges);

  // 找出水印文字密集的行(边缘数 > 平均值的行)
  const avgRowEdges = totalEdges / bottomH;
  console.log('每行平均边缘数:', avgRowEdges.toFixed(1));

  // 找出边缘密集的行范围(水印所在行)
  const denseRows = [];
  for (let row = 0; row < bottomH; row++) {
    if (rowEdgeCount[row] > avgRowEdges * 1.5) {
      denseRows.push({ row: row + bottomTop, count: rowEdgeCount[row] });
    }
  }
  if (denseRows.length > 0) {
    console.log('水印行范围(绝对Y):', denseRows[0].row, '-', denseRows[denseRows.length-1].row,
      '(密集行数:', denseRows.length + ')');
    console.log('水印高度:', denseRows[denseRows.length-1].row - denseRows[0].row + 1, 'px');
  }

  // 找出边缘密集的列范围(水印所在列,通常在右侧)
  const avgColEdges = totalEdges / w;
  const denseCols = [];
  for (let col = 0; col < w; col++) {
    if (colEdgeCount[col] > avgColEdges * 1.5) {
      denseCols.push({ col, count: colEdgeCount[col] });
    }
  }
  if (denseCols.length > 0) {
    console.log('水印列范围(绝对X):', denseCols[0].col, '-', denseCols[denseCols.length-1].col,
      '(密集列数:', denseCols.length + ')');
    console.log('水印宽度:', denseCols[denseCols.length-1].col - denseCols[0].col + 1, 'px');
  }

  // 输出右下角每 5% 区域的边缘密度,定位水印
  console.log('\n=== 右下角区域边缘密度分布 ===');
  for (let yp = 0.70; yp <= 1.0; yp += 0.05) {
    let line = `Y ${yp.toFixed(2)}-${(yp+0.05).toFixed(2)}: `;
    for (let xp = 0.50; xp <= 1.0; xp += 0.10) {
      const yStart = Math.floor(yp * h);
      const yEnd = Math.floor((yp + 0.05) * h);
      const xStart = Math.floor(xp * w);
      const xEnd = Math.floor((xp + 0.10) * w);
      let edges = 0;
      for (let row = yStart - bottomTop; row < yEnd - bottomTop && row < bottomH; row++) {
        for (let col = xStart; col < xEnd && col < w; col++) {
          const idx = (row * w + col) * channels;
          const prevIdx = (row * w + col - 1) * channels;
          if (col > 0) {
            let diff = 0;
            for (let c = 0; c < channels; c++) {
              diff += Math.abs(raw[idx + c] - raw[prevIdx + c]);
            }
            if (diff / channels > 30) edges++;
          }
        }
      }
      line += edges.toString().padStart(5) + ' ';
    }
    console.log(line);
  }
})();
