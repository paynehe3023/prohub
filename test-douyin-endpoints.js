// 测试抖音不同 URL 和 API 端点
const axios = require('axios');
const cheerio = require('cheerio');

const VIDEO_ID = '7172831829785988383';
const urls = [
  { name: '网页版', url: `https://www.douyin.com/video/${VIDEO_ID}`, ua: 'desktop' },
  { name: 'iesdouyin分享', url: `https://www.iesdouyin.com/share/video/${VIDEO_ID}`, ua: 'mobile' },
  { name: 'iesdouyin iteminfo API', url: `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${VIDEO_ID}`, ua: 'mobile' },
  { name: 'douyin.com detail API', url: `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${VIDEO_ID}`, ua: 'desktop' },
];

const UAS = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
};

(async () => {
  for (const { name, url, ua } of urls) {
    console.log(`\n=== ${name}: ${url.slice(0, 80)} ===`);
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': UAS[ua],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Referer': 'https://www.douyin.com/',
          'Cookie': 'msToken=; ttwid=;',
        },
        timeout: 15000,
        maxRedirects: 8,
        responseType: 'text',
        validateStatus: s => s < 500,
      });
      const html = res.data;
      console.log('状态码:', res.status, '| HTML长度:', html.length);
      const finalUrl = res.request?.res?.responseUrl || res.request?.path || url;
      console.log('最终URL:', finalUrl.slice(0, 100));

      // 检查是否是 JSON
      if (html.trim().startsWith('{')) {
        try {
          const json = JSON.parse(html);
          console.log('JSON 响应! keys:', Object.keys(json).join(', '));
          if (json.item_list && json.item_list[0]) {
            const item = json.item_list[0];
            console.log('  desc:', item.desc);
            console.log('  video play_addr:', item.video?.play_addr?.url_list?.[0]?.slice(0, 100));
            console.log('  video bit_rate:', item.video?.bit_rate?.length, '个码流');
          }
        } catch {}
        continue;
      }

      const $ = cheerio.load(html);
      const ogTitle = $('meta[property="og:title"]').attr('content');
      const ogVideo = $('meta[property="og:video"]').attr('content') || $('meta[property="og:video:url"]').attr('content');
      const ogImage = $('meta[property="og:image"]').attr('content');
      console.log('og:title:', ogTitle || '(无)');
      console.log('og:video:', ogVideo ? ogVideo.slice(0, 100) : '(无)');
      console.log('og:image:', ogImage ? ogImage.slice(0, 100) : '(无)');

      // 检查 __INITIAL_STATE__
      const hasInitState = html.includes('__INITIAL_STATE__');
      const hasRenderData = html.includes('_RENDER_DATA');
      const hasSSR = html.includes('_SSR_DATA');
      const hasAwemeDetail = html.includes('awemeDetail') || html.includes('aweme_detail');
      console.log('有 __INITIAL_STATE__:', hasInitState, '| _RENDER_DATA:', hasRenderData, '| _SSR_DATA:', hasSSR, '| awemeDetail:', hasAwemeDetail);

      // WAF 检测
      const wafKeywords = ['verify', 'captcha', '人机', '验证', '安全验证', 'rlim'];
      const wafHit = wafKeywords.filter(k => html.toLowerCase().includes(k.toLowerCase()));
      console.log('WAF关键词:', wafHit.length > 0 ? wafHit.join(',') : '(无)');

      // 找 video 标签
      const videoSrc = $('video source').attr('src') || $('video').attr('src');
      if (videoSrc) console.log('video标签:', videoSrc.slice(0, 100));
    } catch (e) {
      console.log('错误:', e.message);
    }
  }
})();
