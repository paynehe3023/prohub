/**
 * 抖音 Playwright 诊断：直接渲染移动分享页，记录所有网络请求 + DOM + 截图
 * docker exec prohub-backend-dev node diag-douyin-pw.js
 */
const { chromium } = require('playwright');
const fs = require('fs');

const VIDEO_ID = '7172831829785988383';
const SHARE_URL = `https://www.iesdouyin.com/share/video/${VIDEO_ID}`;

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

(async () => {
  const SYS_CHROME = '/usr/bin/chromium-browser';
  const fs2 = require('fs');
  const exePath = fs2.existsSync(SYS_CHROME) ? SYS_CHROME : undefined;
  console.log('启动 chromium, exePath=', exePath);
  const browser = await chromium.launch({
    executablePath: exePath,
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--disable-features=IsolateOrigins,site-per-process'],
  });
  const context = await browser.newContext({
    userAgent: MOBILE_UA,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
  });
  const page = await context.newPage();

  const requests = [];
  page.on('request', (req) => {
    const t = req.resourceType();
    if (t === 'xhr' || t === 'fetch' || req.url().includes('aweme') || req.url().includes('detail')) {
      requests.push({ method: req.method(), url: req.url(), type: t });
    }
  });
  page.on('response', async (res) => {
    const u = res.url();
    if (u.includes('aweme') || u.includes('detail') || u.includes('iteminfo') || u.includes('post')) {
      try {
        const ct = res.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const body = await res.text();
          console.log(`\n[API RESPONSE] ${res.status()} ${u.slice(0, 150)}`);
          console.log('  body (first 600):', body.slice(0, 600));
          fs.writeFileSync(`/tmp/douyin-api-${Date.now()}.json`, body);
        }
      } catch (e) {
        console.log('[API RESPONSE parse err]', e.message, u.slice(0, 120));
      }
    }
  });

  console.log('导航到:', SHARE_URL);
  try {
    await page.goto(SHARE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('导航错误:', e.message);
  }

  console.log('等待 12 秒让 JS 渲染...');
  await page.waitForTimeout(12000);

  const title = await page.title();
  console.log('\n页面 title:', title);
  const url = page.url();
  console.log('当前 URL:', url);

  // DOM 内容
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1500)).catch(() => '(evaluate failed)');
  console.log('\nbody innerText (first 1500):');
  console.log(bodyText);

  // 查找 video 标签或 img
  const mediaInfo = await page.evaluate(() => {
    const videos = [...document.querySelectorAll('video')].map(v => ({ src: v.src || v.currentSrc, poster: v.poster }));
    const imgs = [...document.querySelectorAll('img')].map(i => i.src).slice(0, 8);
    const btns = [...document.querySelectorAll('button, [role="button"], a')].map(b => b.innerText?.trim()).filter(Boolean).slice(0, 15);
    // 查找 __INITIAL_STATE__ 等
    let stateData = null;
    try { if (window.__INITIAL_STATE__) stateData = 'found __INITIAL_STATE__'; } catch {}
    try { if (window._ROUTER_DATA) stateData = (stateData || '') + ' found _ROUTER_DATA'; } catch {}
    return { videos, imgs, btns, stateData, hasVerify: /验证|滑块|滑动/.test(document.body.innerText) };
  }).catch(() => ({ videos: [], imgs: [], btns: [], stateData: 'evaluate failed' }));
  console.log('\nDOM media info:');
  console.log(JSON.stringify(mediaInfo, null, 2));

  // 截图
  await page.screenshot({ path: '/tmp/douyin-pw.png', fullPage: true }).catch(() => {});
  console.log('\n截图保存到 /tmp/douyin-pw.png');

  // 完整 HTML
  const html = await page.content();
  fs.writeFileSync('/tmp/douyin-pw.html', html);
  console.log('HTML 长度:', html.length, '保存到 /tmp/douyin-pw.html');

  console.log('\n=== 捕获的 XHR/fetch 请求 ===');
  console.log(JSON.stringify(requests, null, 2));

  await browser.close();
})();
