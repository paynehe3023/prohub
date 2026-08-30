/**
 * 抖音诊断2：深入分析各端点返回的 HTML 结构
 */
const axios = require('axios');
const fs = require('fs');

const VIDEO_ID = '7172831829785988383';
const SHARE_URL = `https://www.iesdouyin.com/share/video/${VIDEO_ID}`;

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

async function fetchPage(url, ua) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
    timeout: 15000,
    maxRedirects: 8,
    responseType: 'text',
    validateStatus: s => s < 500,
  });
  return { status: res.status, finalUrl: res.request?.res?.responseUrl || url, html: res.data || '' };
}

(async () => {
  console.log('=== iesdouyin share + mobile UA (full analysis) ===');
  const r = await fetchPage(SHARE_URL, MOBILE_UA);
  console.log('Status:', r.status, 'Final:', r.finalUrl);
  console.log('Length:', r.html.length);
  fs.writeFileSync('/tmp/douyin-mobile.html', r.html);
  console.log('Saved to /tmp/douyin-mobile.html');

  // 找所有 script src 和关键内容
  const scripts = [...r.html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
  console.log('Script srcs:', scripts);
  // 找 video/url 关键词
  const keywords = ['mp4', 'play_addr', 'playAddr', 'video', 'aweme', 'item_id', 'aweme_id', 'video_id', 'uri', 'download'];
  for (const k of keywords) {
    const idx = r.html.indexOf(k);
    if (idx >= 0) {
      console.log(`\n--- keyword "${k}" at ${idx} ---`);
      console.log(r.html.slice(Math.max(0, idx - 80), idx + 200));
    }
  }
  // 找 meta 标签
  const metas = [...r.html.matchAll(/<meta[^>]+>/g)].map(m => m[0]);
  console.log('\nMeta tags:', metas.slice(0, 20));
  // 找带 "videoId" 或 "itemId" 的赋值
  const assigns = [...r.html.matchAll(/(?:videoId|itemId|aweme_id|item_id)\s*[:=]\s*["']?(\d+)/g)];
  console.log('\nID assigns:', assigns.map(m => m[0]));
})();
