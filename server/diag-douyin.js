/**
 * 抖音解析诊断脚本：测试不同端点与 UA 的返回
 * 在容器内运行：docker exec prohub-backend-dev node diag-douyin.js
 */
const axios = require('axios');

const VIDEO_ID = '7172831829785988383';
const SHARE_URL = `https://www.iesdouyin.com/share/video/${VIDEO_ID}`;
const DOUYIN_URL = `https://www.douyin.com/video/${VIDEO_ID}`;

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function probe(label, url, ua, extraHeaders = {}) {
  console.log(`\n=== ${label} ===`);
  console.log('URL:', url);
  console.log('UA:', ua.slice(0, 60), '...');
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        ...extraHeaders,
      },
      timeout: 15000,
      maxRedirects: 8,
      responseType: 'text',
      validateStatus: s => s < 500,
    });
    const html = res.data || '';
    console.log('Status:', res.status);
    console.log('Final URL:', res.request?.res?.responseUrl || res.request?._redirectable?._redirectable?.redirects?.slice(-1)?.[0]?.href || '(same)');
    console.log('HTML length:', html.length);
    console.log('Has verify:', /验证|verify|captcha|滑块|滑动/i.test(html));
    console.log('Has RENDER_DATA:', html.includes('_RENDER_DATA'));
    console.log('Has __INITIAL_STATE__:', html.includes('__INITIAL_STATE__'));
    console.log('Has aweme_detail:', html.includes('aweme_detail'));
    console.log('Has og:video:', html.includes('og:video'));
    console.log('Has og:image:', html.includes('og:image'));
    // 提取 og 标签
    const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
    const ogVideo = html.match(/<meta[^>]*property="og:video[^"]*"[^>]*content="([^"]+)"/);
    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
    console.log('og:title:', ogTitle?.[1]?.slice(0, 80) || '(none)');
    console.log('og:video:', ogVideo?.[1]?.slice(0, 120) || '(none)');
    console.log('og:image:', ogImage?.[1]?.slice(0, 120) || '(none)');
    // 保存前 2000 字符
    console.log('HTML head (first 800 chars):');
    console.log(html.slice(0, 800));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

(async () => {
  await probe('iesdouyin share + mobile UA', SHARE_URL, MOBILE_UA);
  await probe('iesdouyin share + desktop UA', SHARE_URL, DESKTOP_UA);
  await probe('douyin.com + desktop UA', DOUYIN_URL, DESKTOP_UA);
  await probe('douyin.com + mobile UA', DOUYIN_URL, MOBILE_UA);
})();
