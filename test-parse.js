// 临时测试脚本：调用 /api/parse 接口
const fs = require('fs');

const target = process.argv[2] || 'weibo';
const port = process.argv[3] || '3001';
const url = {
  weibo: 'https://weibo.com/6910766537/5272858477464864',
  douyin: 'https://www.iesdouyin.com/share/video/7172831829785988383',
  xhs: 'https://www.xiaohongshu.com/explore/67b3a5a9000000000e00c9b1',
}[target];

if (!url) {
  console.error('Unknown target:', target);
  process.exit(1);
}

(async () => {
  try {
    const res = await fetch(`http://localhost:${port}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    console.log('=== 解析结果 ===');
    console.log('platform:', data.platform);
    console.log('title:', data.title);
    console.log('author:', data.author);
    console.log('noWatermark:', data.noWatermark);
    console.log('images count:', (data.images || []).length);
    (data.images || []).slice(0, 5).forEach((u, i) => console.log(`  img${i}:`, u.slice(0, 120)));
    console.log('videos count:', (data.videos || []).length);
    (data.videos || []).slice(0, 3).forEach((u, i) => console.log(`  vid${i}:`, u.slice(0, 120)));
    if (data.error) console.log('ERROR:', data.error, data.message || '');
    // 保存完整结果
    fs.writeFileSync('test-result-' + target + '.json', JSON.stringify(data, null, 2));
    console.log('完整结果已保存到 test-result-' + target + '.json');
  } catch (e) {
    console.error('请求失败:', e.message);
  }
})();
