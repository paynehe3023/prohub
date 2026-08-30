/**
 * 抖音诊断4：精确捕获桌面 detail API 响应（body+headers），并等待完整渲染
 */
const { chromium } = require('playwright');
const fs = require('fs');

const VIDEO_ID = '7172831829785988383';
const DESKTOP_URL = `https://www.douyin.com/video/${VIDEO_ID}`;
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'],
  });
  const context = await browser.newContext({ userAgent: DESKTOP_UA, viewport: { width: 1920, height: 1080 }, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN','zh','en'] });
    window.chrome = { runtime: {}, app: { isInstalled: false } };
  });

  const detailResponses = [];
  page.on('response', async (res) => {
    const u = res.url();
    if (u.includes('/aweme/v1/web/aweme/detail') || u.includes('/aweme/v1/web/aweme/post')) {
      try {
        const buf = await res.body();
        const bodyText = buf.toString('utf8').slice(0, 2000);
        detailResponses.push({
          url: u.slice(0, 250),
          status: res.status(),
          contentLength: buf.length,
          contentType: res.headers()['content-type'] || '',
          bodyPreview: bodyText,
        });
        if (buf.length > 0 && buf.length < 200000) {
          fs.writeFileSync(`/tmp/dy-detail-${detailResponses.length}.json`, buf);
        }
      } catch (e) {
        detailResponses.push({ url: u.slice(0, 250), status: res.status(), err: e.message });
      }
    }
  });

  console.log('访问主页预热...');
  await page.goto('https://www.douyin.com/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(5000);
  console.log('访问视频页:', DESKTOP_URL);
  await page.goto(DESKTOP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('nav:', e.message));
  await page.waitForTimeout(15000);

  console.log('\ntitle:', await page.title().catch(() => ''));
  const dom = await page.evaluate(() => {
    const v = [...document.querySelectorAll('video')].map(x => ({ src: x.src, currentSrc: x.currentSrc, poster: x.poster }));
    const initState = window.__INITIAL_STATE__ ? 'yes' : 'no';
    const renderEl = document.getElementById('_RENDER_DATA') ? 'yes' : 'no';
    const videoSrc = document.querySelector('video')?.src || '';
    return { videos: v, initState, renderEl, bodyLen: document.body.innerText.length, bodyHead: document.body.innerText.slice(0, 300) };
  }).catch(() => '(eval failed)');
  console.log('DOM:', JSON.stringify(dom, null, 2));

  console.log('\n=== detail API responses ===');
  console.log(JSON.stringify(detailResponses, null, 2));
  await page.screenshot({ path: '/tmp/dy-detail.png' }).catch(() => {});
  await browser.close();
})();
