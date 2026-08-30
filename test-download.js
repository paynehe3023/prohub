// 下载微博图片：原图 vs proxy-image 处理后
const fs = require('fs');

const imgUrl = 'https://wx3.sinaimg.cn/mw2000/007xGS4pgy1iav8jhx6mpj30u0140jwx.jpg';
const proxyUrl = 'http://localhost:3001/api/proxy-image?url=' + encodeURIComponent(imgUrl) + '&_t=' + Date.now();

(async () => {
  // 1. 下载原图
  try {
    const r1 = await fetch(imgUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', Referer: 'https://weibo.com/' },
    });
    const buf1 = Buffer.from(await r1.arrayBuffer());
    fs.writeFileSync('weibo-original.jpg', buf1);
    console.log('原图已保存 weibo-original.jpg, 大小:', buf1.length, 'bytes');
  } catch (e) { console.error('下载原图失败:', e.message); }

  // 2. 下载 proxy-image 处理后的图
  try {
    const r2 = await fetch(proxyUrl);
    const buf2 = Buffer.from(await r2.arrayBuffer());
    fs.writeFileSync('weibo-processed.jpg', buf2);
    console.log('处理后图已保存 weibo-processed.jpg, 大小:', buf2.length, 'bytes');
  } catch (e) { console.error('下载处理后图失败:', e.message); }

  // 3. 用 sharp 获取两张图的尺寸
  try {
    const sharp = require('sharp');
    const m1 = await sharp(fs.readFileSync('weibo-original.jpg')).metadata();
    const m2 = await sharp(fs.readFileSync('weibo-processed.jpg')).metadata();
    console.log('原图尺寸:', m1.width + 'x' + m1.height, m1.format);
    console.log('处理后尺寸:', m2.width + 'x' + m2.height, m2.format);
    // 检查右下角像素差异
    const origRightBottom = await sharp(fs.readFileSync('weibo-original.jpg'))
      .extract({ left: Math.floor(m1.width * 0.74), top: Math.floor(m1.height * 0.94), width: Math.floor(m1.width * 0.26), height: Math.floor(m1.height * 0.06) })
      .raw().toBuffer();
    const procRightBottom = await sharp(fs.readFileSync('weibo-processed.jpg'))
      .extract({ left: Math.floor(m2.width * 0.74), top: Math.floor(m2.height * 0.94), width: Math.floor(m2.width * 0.26), height: Math.floor(m2.height * 0.06) })
      .raw().toBuffer();
    // 计算像素差异
    let diff = 0, total = origRightBottom.length;
    for (let i = 0; i < total; i++) {
      diff += Math.abs(origRightBottom[i] - procRightBottom[i]);
    }
    console.log('右下角水印区域平均像素差异:', (diff / total).toFixed(2), '(>5 表示有擦除)');
  } catch (e) { console.error('读取尺寸失败:', e.message); }
})();
