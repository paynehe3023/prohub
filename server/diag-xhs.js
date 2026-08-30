/**
 * 小红书诊断：测试 axios 抓取 + Playwright 渲染
 * docker exec prohub-backend-dev node diag-xhs.js
 */
const axios = require('axios');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
chromium.use(stealth());

const URL_XHS = 'https://www.xiaohongshu.com/explore/67b3a5a9000000000e00c9b1';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

(async () => {
  // === axios 抓取 ===
  console.log('=== axios 抓取 ===');
  try {
    const res = await axios.get(URL_XHS, {
      headers: { 'User-Agent': DESKTOP_UA, 'Accept': 'text/html,*/*;q=0.8', 'Accept-Language': 'zh-CN,zh;q=0.9', Cookie: 'xsecappid=xhs-pc-web; webId=abc123;' },
      timeout: 15000, maxRedirects: 5, responseType: 'text', validateStatus: s => s < 500,
    });
    const html = res.data || '';
    console.log('status:', res.status, 'len:', html.length);
    console.log('has __INITIAL_STATE__:', html.includes('__INITIAL_STATE__'));
    console.log('has noteDetailMap:', html.includes('noteDetailMap'));
    console.log('has imageList:', html.includes('imageList'));
    console.log('has og:image:', html.includes('og:image'));
    console.log('has login/登录:', /登录|login|验证/.test(html));
    fs.writeFileSync('/tmp/xhs-axios.html', html);
    // 提取 og 标签
    const og = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
    console.log('og:image:', og?.[1]?.slice(0, 120) || '(none)');
    const ogT = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
    console.log('og:title:', ogT?.[1]?.slice(0, 100) || '(none)');
  } catch (e) { console.log('axios err:', e.message); }

  // === Playwright 渲染 ===
  console.log('\n=== Playwright 渲染 ===');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'],
  });
  const context = await browser.newContext({ userAgent: DESKTOP_UA, viewport: { width: 1920, height: 1080 }, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
  const page = await context.newPage();
  const apiRes = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (u.includes('note') && (u.includes('detail') || u.includes('feed'))) {
      try { const b = await r.body(); apiRes.push({ url: u.slice(0, 180), status: r.status(), len: b.length, head: b.toString('utf8').slice(0, 500) }); } catch {}
    }
  });
  await page.goto(URL_XHS, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('nav:', e.message));
  await page.waitForTimeout(10000);
  console.log('title:', await page.title().catch(() => ''));
  const state = await page.evaluate(() => {
    try { return window.__INITIAL_STATE__ ? 'has __INITIAL_STATE__' : 'no'; } catch { return 'err'; }
  }).catch(() => 'eval-failed');
  console.log('state:', state);
  const imgs = await page.evaluate(() => [...document.querySelectorAll('img')].map(i => i.src).filter(s => s.includes('xhscdn') || s.includes('sns-img') || s.includes('xiaohongshu')).slice(0, 5)).catch(() => []);
  console.log('imgs:', imgs);
  const html2 = await page.content();
  fs.writeFileSync('/tmp/xhs-pw.html', html2);
  console.log('pw html len:', html2.length, 'has noteDetailMap:', html2.includes('noteDetailMap'), 'has imageList:', html2.includes('imageList'));
  console.log('\nAPI responses:', JSON.stringify(apiRes, null, 2));
  await browser.close();
})();
