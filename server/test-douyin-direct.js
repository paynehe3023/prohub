// 直接调用 parseDouyin 测试（本地 Chrome + headless=false）
process.env.HEADLESS = 'false'; // 关键：用非 headless 模式绕过 WAF
const { parseDouyin } = require('./parsers/douyin');

(async () => {
  const url = process.argv[2] || 'https://www.iesdouyin.com/share/video/7172831829785988383';
  console.log('测试 URL:', url);
  console.log('HEADLESS:', process.env.HEADLESS);
  const result = await parseDouyin(url, '');
  console.log('\n=== 解析结果 ===');
  console.log('title:', result.title);
  console.log('description:', (result.description || '').slice(0, 100));
  console.log('author:', result.author);
  console.log('type:', result.type);
  console.log('noWatermark:', result.noWatermark);
  console.log('video:', result.video ? result.video.slice(0, 120) : '(无)');
  console.log('images:', (result.images || []).length, '张');
  (result.images || []).slice(0, 5).forEach((u, i) => console.log(`  img${i}:`, u.slice(0, 120)));
  console.log('media:', (result.media || []).length, '个');
})();
