// 抖音网页版 Playwright 测试（桌面 UA + SPA 自动调用 API）
const { chromium } = require('playwright');

const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const VIDEO_ID = '7172831829785988383';

const stealthScript = `
() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', {
    get: () => [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfedpexojeelbfhkbhnphlib', description: '' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
    ],
  });
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
  window.chrome = { runtime: {}, app: { isInstalled: false }, csi: () => {}, loadTimes: () => {} };
  const origQuery = window.navigator.permissions && window.navigator.permissions.query;
  if (origQuery) {
    window.navigator.permissions.query = (p) =>
      p.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : origQuery(p);
  }
}
`;

(async () => {
  console.log('[Test] 启动 Chromium (桌面模式)...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-infobars',
      '--window-size=1920,1080',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  });

  await context.addInitScript(stealthScript);
  const page = await context.newPage();

  // 收集所有 API 响应
  const apiResponses = [];
  page.on('response', async (response) => {
    const reqUrl = response.url();
    if (reqUrl.includes('aweme') && (reqUrl.includes('detail') || reqUrl.includes('post') || reqUrl.includes('item'))) {
      try {
        const json = await response.json();
        apiResponses.push({ url: reqUrl, data: json });
        console.log('[API]', reqUrl.slice(0, 120));
      } catch {}
    }
  });

  // 第1步：访问主页获取 cookie
  console.log('[Test] 第1步：访问抖音主页...');
  await page.goto('https://www.douyin.com/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(5000);
  console.log('[Test] 主页 title:', await page.title());

  // 第2步：访问视频页面
  const videoUrl = `https://www.douyin.com/video/${VIDEO_ID}`;
  console.log(`[Test] 第2步：访问视频页面 ${videoUrl}`);
  await page.goto(videoUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

  // 等待 API 响应或页面渲染
  console.log('[Test] 等待数据...');
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(3000);
    const title = await page.title();
    console.log(`[Test] ${(i + 1) * 3}s: title="${title.slice(0, 60)}" apiCount=${apiResponses.length}`);
    if (apiResponses.length > 0) break;
  }

  // 分析 API 数据
  console.log('\n=== API 响应 ===');
  console.log('总数:', apiResponses.length);
  for (const r of apiResponses) {
    const jsonStr = JSON.stringify(r.data);
    console.log('URL:', r.url.slice(0, 100));
    console.log('内容(前300):', jsonStr.slice(0, 300));
    // 查找视频详情
    const detail = r.data.aweme_detail || r.data.awemeDetail || r.data.aweme_details?.[0] || r.data.item_list?.[0] || r.data.aweme_list?.[0];
    if (detail) {
      console.log('  desc:', detail.desc);
      console.log('  author:', detail.author?.nickname);
      const br = detail.video?.bit_rate;
      if (br && br.length > 0) {
        console.log('  bit_rate:', br.length, '个码流');
        const playUrl = br[0]?.play_addr?.url_list?.[0];
        console.log('  play_addr[0]:', playUrl ? playUrl.slice(0, 120) : '(无)');
      }
      if (detail.images?.length > 0) {
        console.log('  图文! 图片数:', detail.images.length);
      }
    }
  }

  // 也检查页面 DOM
  const domData = await page.evaluate(() => {
    const get = (sel) => document.querySelector(sel)?.getAttribute('content') || '';
    return {
      title: document.title,
      ogTitle: get('meta[property="og:title"]'),
      ogVideo: get('meta[property="og:video"]') || get('meta[property="og:video:url"]'),
      ogImage: get('meta[property="og:image"]'),
      videoSrc: document.querySelector('video')?.src || document.querySelector('video source')?.src || '',
      renderData: !!document.getElementById('_RENDER_DATA'),
      initState: !!window.__INITIAL_STATE__,
    };
  });
  console.log('\n=== DOM ===');
  console.log('title:', domData.title);
  console.log('og:title:', domData.ogTitle);
  console.log('og:video:', domData.ogVideo?.slice(0, 100) || '(无)');
  console.log('og:image:', domData.ogImage?.slice(0, 100) || '(无)');
  console.log('videoSrc:', domData.videoSrc?.slice(0, 100) || '(无)');
  console.log('_RENDER_DATA:', domData.renderData, '| __INITIAL_STATE__:', domData.initState);

  await browser.close();
  console.log('\n[Test] 完成');
})();
