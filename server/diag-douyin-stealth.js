/**
 * 抖音诊断5：用 playwright-extra + stealth 插件，测试能否拿到 detail API 真实 JSON
 */
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
chromium.use(stealth());

const VIDEO_ID = '7172831829785988383';
const DESKTOP_URL = `https://www.douyin.com/video/${VIDEO_ID}`;
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({ userAgent: DESKTOP_UA, viewport: { width: 1920, height: 1080 }, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
  const page = await context.newPage();

  const details = [];
  page.on('response', async (res) => {
    const u = res.url();
    if (u.includes('/aweme/detail') && u.includes(VIDEO_ID)) {
      try {
        const buf = await res.body();
        details.push({ status: res.status(), len: buf.length, ct: res.headers()['content-type'], head: buf.toString('utf8').slice(0, 400) });
        if (buf.length > 10 && buf.length < 300000) fs.writeFileSync('/tmp/dy-stealth-detail.json', buf);
      } catch (e) { details.push({ err: e.message }); }
    }
  });

  console.log('访问主页...');
  await page.goto('https://www.douyin.com/', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => console.log('home:', e.message));
  await page.waitForTimeout(6000);
  console.log('访问视频页...');
  await page.goto(DESKTOP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('video:', e.message));
  await page.waitForTimeout(15000);

  console.log('title:', await page.title().catch(() => ''));
  const v = await page.evaluate(() => {
    const vid = document.querySelector('video');
    return { hasVideo: !!vid, src: vid?.src || vid?.currentSrc || '', bodyHead: document.body.innerText.slice(0, 200) };
  }).catch(() => '(failed)');
  console.log('DOM video:', JSON.stringify(v));
  console.log('\ndetail responses:', JSON.stringify(details, null, 2));
  await page.screenshot({ path: '/tmp/dy-stealth.png' }).catch(() => {});
  await browser.close();
})();
