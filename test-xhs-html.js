// 获取小红书页面 HTML，分析可用数据
const axios = require('axios');
const cheerio = require('cheerio');

const url = 'https://www.xiaohongshu.com/explore/67b3a5a9000000000e00c9b1';

(async () => {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://www.xiaohongshu.com/',
        'Cookie': 'a1=18; webId=abc;',
      },
      timeout: 15000,
      maxRedirects: 8,
      responseType: 'text',
      validateStatus: s => s < 500,
    });

    const html = res.data;
    console.log('状态码:', res.status);
    console.log('最终URL:', res.request?.res?.responseUrl || url);
    console.log('HTML长度:', html.length);

    const $ = cheerio.load(html);
    console.log('\n=== meta 标签 ===');
    console.log('title:', $('title').text());
    console.log('og:title:', $('meta[property="og:title"]').attr('content'));
    console.log('og:image:', $('meta[property="og:image"]').attr('content'));
    console.log('og:video:', $('meta[property="og:video"]').attr('content'));

    // 检查 __INITIAL_STATE__
    console.log('\n=== 脚本数据 ===');
    console.log('有 __INITIAL_STATE__:', html.includes('__INITIAL_STATE__'));
    console.log('有 noteDetailMap:', html.includes('noteDetailMap'));
    console.log('有 noteData:', html.includes('noteData'));

    // 提取 __INITIAL_STATE__
    const m = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\})\s*<\/script>/);
    if (m) {
      console.log('提取到 __INITIAL_STATE__ JSON, 长度:', m[1].length);
      try {
        const json = JSON.parse(m[1]);
        console.log('keys:', Object.keys(json).join(', '));
        if (json.note?.noteDetailMap) {
          const note = Object.values(json.note.noteDetailMap)[0]?.note;
          if (note) {
            console.log('note.title:', note.title);
            console.log('note.type:', note.type);
            console.log('note.imageList:', note.imageList?.length, '张');
            console.log('note.video:', note.video ? '有' : '无');
          }
        }
      } catch (e) {
        console.log('JSON 解析失败:', e.message);
      }
    }

    // 检查图片
    const imgs = $('img').map((i, el) => $(el).attr('src')).get().filter(s => s && (s.includes('xhscdn') || s.includes('sns-img')));
    console.log('\n小红书图片数:', imgs.length);
    imgs.slice(0, 3).forEach((u, i) => console.log(`  img${i}:`, u.slice(0, 100)));
  } catch (e) {
    console.error('错误:', e.message);
  }
})();
