// 从小红书首页 feed SSR 提取带 xsec_token 的笔记链接用于测试
const axios = require('axios');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

(async () => {
  const res = await axios.get('https://www.xiaohongshu.com/explore', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9', Cookie: 'xsecappid=xhs-pc-web; webId=abc123;' },
    timeout: 15000, maxRedirects: 5, responseType: 'text', validateStatus: s => s < 500,
  });
  const html = res.data || '';
  console.log('homepage len:', html.length);
  // 找 /explore/{id}?xsec_token= 链接
  const links = [...html.matchAll(/\/explore\/([a-f0-9]{24})\?xsec_token=([A-Za-z0-9_%-]+)[^"']*/g)];
  console.log('found note links:', links.length);
  const seen = new Set();
  for (const m of links.slice(0, 30)) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    console.log(`https://www.xiaohongshu.com/explore/${m[1]}?xsec_token=${m[2]}&xsec_source=pc_feed`);
  }
  // 也从 __INITIAL_STATE__ 找 feed note
  if (html.includes('__INITIAL_STATE__')) {
    console.log('\n(homepage has __INITIAL_STATE__)');
  }
})();
