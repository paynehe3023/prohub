// 下载微博图片（经 proxy-image 去水印）并保存，对比原始直链
const fs = require('fs');
const res = require('./test-result-weibo.json');
const img = res.images[0];
const proxyUrl = `http://localhost:3001/api/proxy-image?url=${encodeURIComponent(img)}`;

(async () => {
  console.log('原图 URL:', img);
  console.log('代理 URL:', proxyUrl);
  // 1. 经代理（去水印）
  const r1 = await fetch(proxyUrl);
  const b1 = Buffer.from(await r1.arrayBuffer());
  fs.writeFileSync('weibo-proxy.jpg', b1);
  console.log('代理后:', b1.length, 'bytes, ct:', r1.headers.get('content-type'));

  // 2. 原始直链（有水印）
  const r2 = await fetch(img, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://weibo.com/' } });
  const b2 = Buffer.from(await r2.arrayBuffer());
  fs.writeFileSync('weibo-direct.jpg', b2);
  console.log('原始直链:', b2.length, 'bytes');

  console.log('差异:', b1.length - b2.length, 'bytes (正值表示代理后体积变化，通常去水印模糊后略增)');
})();
