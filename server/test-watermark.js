const { isWatermarkedVideoUrl, isWatermarkedImageUrl, pickNoWatermark } = require('./utils/watermark');

const tests = [
  // 抖音无水印 play_addr（v26-web.douyinvod.com /tos/cn/）
  ['https://v26-web.douyinvod.com/efeba32e670d88f72d4e5d969772f8d9/6a92de88/video/tos/cn/tos-cn-ve-0015c800/oIwjBLHUDnVe4OBA6gxIiAFc9PfnnAQVAb8UIC/?a=6383&mime_type=video_mp4', false, 'douyin play_addr (clean)'],
  // 抖音 download_addr 显式 watermark=0
  ['https://www.douyin.com/aweme/v1/play/?video_id=v0200fg10000ce5g7prc77uahfsvg800&ratio=540p&watermark=0&media_type=4&logo_name=aweme', false, 'douyin download_addr watermark=0'],
  // 抖音带水印的 download_suffix_logo_addr
  ['https://www.douyin.com/aweme/v1/play/?video_id=xxx&watermark=1&logo_name=aweme_dark', true, 'douyin watermark=1 logo dark'],
  // 微博水印图
  ['https://wx1.sinaimg.cn/large/abcwm.123.jpg', true, 'weibo wm. image'],
  ['https://wx1.sinaimg.cn/large/abc.jpg', false, 'weibo clean image'],
];

let pass = 0;
for (const [url, expected, label] of tests) {
  const got = isWatermarkedVideoUrl(url);
  const ok = got === expected;
  if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${label}] expected=${expected} got=${got}`);
}
console.log(`\n${pass}/${tests.length} passed`);

// pickNoWatermark 测试
const candidates = [
  'https://www.douyin.com/aweme/v1/play/?video_id=xxx&watermark=1&logo_name=aweme_dark', // 有水印
  'https://v26-web.douyinvod.com/efeba32e/video/tos/cn/oIwjBLHUDnVe4OBA6gxIiAFc9PfnnAQVAb8UIC/?mime_type=video_mp4', // 无水印
  'https://www.douyin.com/aweme/v1/play/?video_id=yyy&watermark=0&logo_name=aweme', // 无水印
];
console.log('\npickNoWatermark result:', pickNoWatermark(candidates, 'video'));
