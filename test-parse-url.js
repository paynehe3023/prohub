// 用任意 URL 测试 /api/parse
const fs = require('fs');
const url = process.argv[2];
const port = process.argv[3] || '3001';
if (!url) { console.error('Usage: node test-parse-url.js <url> [port]'); process.exit(1); }

(async () => {
  try {
    const res = await fetch(`http://localhost:${port}/api/parse`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }),
    });
    const data = await res.json();
    console.log('platform:', data.platform);
    console.log('title:', data.title);
    console.log('author:', data.author);
    console.log('noWatermark:', data.noWatermark);
    console.log('type:', data.type);
    console.log('images:', (data.images || []).length);
    (data.images || []).slice(0, 6).forEach((u, i) => console.log(`  img${i}:`, u.slice(0, 140)));
    console.log('video:', (data.video || '').slice(0, 140));
    console.log('media:', (data.media || []).length);
    if (data.error) console.log('ERROR:', data.error, data.message || '');
    const slug = url.replace(/[^a-z0-9]/gi, '').slice(-20);
    fs.writeFileSync('test-result-' + slug + '.json', JSON.stringify(data, null, 2));
    console.log('saved test-result-' + slug + '.json');
  } catch (e) { console.error('请求失败:', e.message); }
})();
