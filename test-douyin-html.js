// 获取抖音分享页面 HTML，分析可用数据
const axios = require('axios');
const cheerio = require('cheerio');

const url = 'https://www.iesdouyin.com/share/video/7172831829785988383';

(async () => {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://www.douyin.com/',
        'Cookie': 'msToken=; ttwid=',
      },
      timeout: 15000,
      maxRedirects: 8,
      responseType: 'text',
      validateStatus: s => s < 500,
    });

    const html = res.data;
    console.log('状态码:', res.status);
    console.log('最终URL:', res.request?.res?.responseUrl || res.request?.path || url);
    console.log('HTML长度:', html.length);

    const $ = cheerio.load(html);
    console.log('\n=== meta 标签 ===');
    console.log('title:', $('title').text());
    console.log('og:title:', $('meta[property="og:title"]').attr('content'));
    console.log('og:description:', $('meta[property="og:description"]').attr('content'));
    console.log('og:image:', $('meta[property="og:image"]').attr('content'));
    console.log('og:video:', $('meta[property="og:video"]').attr('content'));
    console.log('og:video:url:', $('meta[property="og:video:url"]').attr('content'));
    console.log('og:url:', $('meta[property="og:url"]').attr('content'));

    // 查找 __INITIAL_STATE__
    console.log('\n=== 脚本数据 ===');
    const scripts = $('script').toArray();
    console.log('script 标签数:', scripts.length);
    for (const s of scripts) {
      const t = $(s).text() || '';
      if (t.includes('__INITIAL_STATE__') || t.includes('aweme_detail') || t.includes('awemeDetail') || t.includes('video_id') || t.includes('play_addr')) {
        console.log('找到相关 script, 长度:', t.length);
        console.log('前 200 字符:', t.slice(0, 200));
        // 提取 JSON
        const m = t.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\})\s*<\/script>/);
        if (m) {
          console.log('提取到 __INITIAL_STATE__ JSON, 长度:', m[1].length);
        }
        const m2 = t.match(/window\._SSR_DATA\s*=\s*(\{[\s\S]+?\})\s*<\/script>/);
        if (m2) {
          console.log('提取到 _SSR_DATA JSON, 长度:', m2[1].length);
        }
      }
    }

    // 查找 video 标签
    console.log('\n=== video 标签 ===');
    const videoSrc = $('video source').attr('src') || $('video').attr('src');
    console.log('video src:', videoSrc || '(无)');

    // 查找图片
    console.log('\n=== 图片 ===');
    const imgs = $('img').map((i, el) => $(el).attr('src')).get().filter(s => s && (s.includes('douyin') || s.includes('pstatp') || s.includes('byteimg')));
    console.log('抖音图片数:', imgs.length);
    imgs.slice(0, 5).forEach((u, i) => console.log(`  img${i}:`, u.slice(0, 120)));

    // 检查是否有 WAF 验证页面
    console.log('\n=== WAF 检查 ===');
    if (html.includes('验证') || html.includes('verify') || html.includes('captcha') || html.includes('人机')) {
      console.log('检测到 WAF 验证页面!');
    } else {
      console.log('未检测到 WAF 验证关键词');
    }
  } catch (e) {
    console.error('错误:', e.message);
  }
})();
