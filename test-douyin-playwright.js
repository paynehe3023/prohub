// 强 stealth Playwright 测试抖音解析
const { chromium } = require('playwright');

const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const VIDEO_ID = '7172831829785988383';

const stealthScript = `
() => {
  // 覆盖 navigator.webdriver
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  // 覆盖 navigator.plugins
  Object.defineProperty(navigator, 'plugins', {
    get: () => [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfedpexojeelbfhkbhnphlib', description: '' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
    ],
  });
  // 覆盖 navigator.languages
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
  // 覆盖 navigator.platform
  Object.defineProperty(navigator, 'platform', { get: () => 'iPhone' });
  // 添加 chrome 对象
  window.chrome = { runtime: {}, app: { isInstalled: false }, csi: () => {}, loadTimes: () => {} };
  // 覆盖 permissions API
  const origQuery = window.navigator.permissions && window.navigator.permissions.query;
  if (origQuery) {
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : origQuery(parameters);
  }
  // WebGL vendor/renderer
  try {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (p) {
      if (p === 37445) return 'Apple Inc.';
      if (p === 37446) return 'Apple GPU';
      return getParameter.call(this, p);
    };
  } catch {}
}
`;

(async () => {
  console.log('[Test] 启动 Chromium...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: false, // 非 headless，更像真实浏览器
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-infobars',
      '--window-size=390,844',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    hasTouch: true,
    isMobile: true,
  });

  await context.addInitScript(stealthScript);

  const page = await context.newPage();

  let apiData = null;
  // 拦截 API 响应
  page.on('response', async (response) => {
    const reqUrl = response.url();
    if (reqUrl.includes('slidesinfo') || reqUrl.includes('aweme/v1/web/aweme/detail') || reqUrl.includes('aweme/post') || reqUrl.includes('aweme/v1/web/aweme/') || reqUrl.includes('web/api/v2/aweme')) {
      try {
        const json = await response.json();
        if (json) {
          apiData = json;
          console.log('[API 捕获]', reqUrl.slice(0, 100));
        }
      } catch {}
    }
  });

  // 第一步：访问抖音主页获取 cookie
  console.log('[Test] 第1步：访问抖音主页获取 cookie...');
  try {
    await page.goto('https://www.douyin.com/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    console.log('[Test] 主页 title:', await page.title());
  } catch (e) {
    console.log('[Test] 访问主页失败:', e.message);
  }

  // 第二步：访问视频页面
  const videoUrl = `https://www.iesdouyin.com/share/video/${VIDEO_ID}`;
  console.log(`[Test] 第2步：访问视频页面 ${videoUrl}`);
  try {
    await page.goto(videoUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

    // 等待 WAF 验证完成（检测 title 变化或 og:title 出现）
    console.log('[Test] 等待 WAF 验证...');
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(3000);
      const title = await page.title();
      const ogTitle = await page.evaluate(() => {
        const el = document.querySelector('meta[property="og:title"]');
        return el ? el.getAttribute('content') : '';
      }).catch(() => '');
      console.log(`[Test] 第 ${(i + 1) * 3} 秒: title="${title.slice(0, 50)}" og:title="${ogTitle?.slice(0, 50) || ''}"`);
      if (ogTitle && !ogTitle.includes('抖音')) break;
      if (apiData) { console.log('[Test] 已捕获 API 数据!'); break; }
    }

    // 提取页面数据
    const pageData = await page.evaluate(() => {
      const get = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.getAttribute('content') || el.textContent || '' : '';
      };
      return {
        title: document.title,
        ogTitle: get('meta[property="og:title"]'),
        ogDescription: get('meta[property="og:description"]'),
        ogImage: get('meta[property="og:image"]'),
        ogVideo: get('meta[property="og:video"]') || get('meta[property="og:video:url"]'),
        hasInitState: !!document.getElementById('__INITIAL_STATE__') || !!window.__INITIAL_STATE__,
        hasSSR: !!window._SSR_DATA,
        videoSrc: (() => {
          const v = document.querySelector('video source');
          return v ? v.src : (document.querySelector('video')?.src || '');
        })(),
        imgCount: document.querySelectorAll('img').length,
      };
    });
    console.log('\n=== 页面数据 ===');
    console.log('title:', pageData.title);
    console.log('og:title:', pageData.ogTitle);
    console.log('og:description:', pageData.ogDescription?.slice(0, 80));
    console.log('og:image:', pageData.ogImage?.slice(0, 100) || '(无)');
    console.log('og:video:', pageData.ogVideo?.slice(0, 100) || '(无)');
    console.log('hasInitState:', pageData.hasInitState, '| hasSSR:', pageData.hasSSR);
    console.log('videoSrc:', pageData.videoSrc?.slice(0, 100) || '(无)');
    console.log('imgCount:', pageData.imgCount);
    console.log('apiData:', apiData ? '已捕获' : '无');
    if (apiData) {
      console.log('apiData 完整内容:', JSON.stringify(apiData).slice(0, 500));
      const detail = apiData.aweme_details?.[0] || apiData.awemeDetail || apiData.item_list?.[0] || apiData.aweme_list?.[0];
      if (detail) {
        console.log('desc:', detail.desc);
        console.log('author:', detail.author?.nickname);
        console.log('video bit_rate:', detail.video?.bit_rate?.length, '个码流');
        const playUrl = detail.video?.bit_rate?.[0]?.play_addr?.url_list?.[0];
        console.log('play_addr:', playUrl ? playUrl.slice(0, 100) : '(无)');
      } else {
        console.log('未找到 aweme_details/awemeDetail/item_list/aweme_list');
      }
    }
  } catch (e) {
    console.log('[Test] 视频页面错误:', e.message);
  }

  await browser.close();
  console.log('[Test] 完成');
})();
