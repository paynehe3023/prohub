/**
 * 抖音诊断3：提取 window._ROUTER_DATA 与尝试 douyin.com 桌面页
 */
const { chromium } = require('playwright');
const fs = require('fs');

const VIDEO_ID = '7172831829785988383';
const SHARE_URL = `https://www.iesdouyin.com/share/video/${VIDEO_ID}`;
const DESKTOP_URL = `https://www.douyin.com/video/${VIDEO_ID}`;

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function launch() {
  return chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'],
  });
}

function findVideoData(obj, depth = 0, path = '') {
  if (!obj || typeof obj !== 'object' || depth > 8) return [];
  const found = [];
  // 关键字段：含 play_addr/aweme_id/video 的对象
  if (obj.aweme_id || obj.awemeId || obj.item_id) {
    const v = obj.video || obj.aweme_detail?.video;
    if (v) {
      found.push({ path, aweme_id: obj.aweme_id || obj.awemeId, desc: (obj.desc || '').slice(0, 60), videoKeys: Object.keys(v) });
    }
  }
  for (const k of Object.keys(obj)) {
    found.push(...findVideoData(obj[k], depth + 1, `${path}.${k}`));
  }
  return found;
}

(async () => {
  const browser = await launch();

  // === 1. 移动分享页 _ROUTER_DATA ===
  console.log('=== 移动分享页 _ROUTER_DATA ===');
  const ctxM = await browser.newContext({ userAgent: MOBILE_UA, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
  const pageM = await ctxM.newPage();
  await pageM.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
  const apiResponses = [];
  pageM.on('response', async (res) => {
    const u = res.url();
    if (u.includes('aweme')) {
      try { apiResponses.push({ url: u.slice(0, 180), status: res.status(), body: (await res.text()).slice(0, 300) }); } catch {}
    }
  });
  await pageM.goto(SHARE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('nav err', e.message));
  await pageM.waitForTimeout(10000);

  const routerData = await pageM.evaluate(() => {
    try { return window._ROUTER_DATA || null; } catch { return null; }
  }).catch(() => null);
  if (routerData) {
    console.log('_ROUTER_DATA 顶层 keys:', Object.keys(routerData));
    fs.writeFileSync('/tmp/douyin-router.json', JSON.stringify(routerData, null, 2));
    console.log('保存 /tmp/douyin-router.json, 长度', JSON.stringify(routerData).length);
    const vids = findVideoData(routerData);
    console.log('找到的视频数据节点:', JSON.stringify(vids, null, 2));
  } else {
    console.log('无 _ROUTER_DATA');
  }
  console.log('API 响应:', JSON.stringify(apiResponses, null, 2));
  await ctxM.close().catch(() => {});

  // === 2. 桌面 douyin.com 页面 ===
  console.log('\n=== 桌面 douyin.com 页面 ===');
  const ctxD = await browser.newContext({ userAgent: DESKTOP_UA, viewport: { width: 1920, height: 1080 }, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
  const pageD = await ctxD.newPage();
  await pageD.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN','zh','en'] });
    window.chrome = { runtime: {} };
  });
  const desktopApi = [];
  pageD.on('response', async (res) => {
    const u = res.url();
    if (u.includes('aweme') && (u.includes('detail') || u.includes('post') || u.includes('item'))) {
      try { desktopApi.push({ url: u.slice(0, 200), status: res.status(), body: (await res.text()).slice(0, 500) }); } catch {}
    }
  });
  await pageD.goto('https://www.douyin.com/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await pageD.waitForTimeout(4000);
  await pageD.goto(DESKTOP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('desktop nav err', e.message));
  await pageD.waitForTimeout(12000);
  const dTitle = await pageD.title().catch(() => '');
  console.log('桌面页 title:', dTitle);
  const dBody = await pageD.evaluate(() => document.body.innerText.slice(0, 500)).catch(() => '(failed)');
  console.log('桌面 body:', dBody);
  const dState = await pageD.evaluate(() => {
    try { return window.__INITIAL_STATE__ ? 'has __INITIAL_STATE__' : ''; } catch {}
    try { const el = document.getElementById('_RENDER_DATA'); return el ? 'has _RENDER_DATA' : ''; } catch {}
    return '';
  }).catch(() => '');
  console.log('桌面 state:', dState);
  console.log('桌面 API 响应:', JSON.stringify(desktopApi, null, 2));
  await pageD.screenshot({ path: '/tmp/douyin-desktop.png', fullPage: false }).catch(() => {});
  await ctxD.close().catch(() => {});

  await browser.close();
})();
