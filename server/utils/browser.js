/**
 * Playwright 浏览器管理器
 * 管理浏览器实例的生命周期，提供页面创建/关闭功能
 */
const { chromium } = require('playwright');

const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let browser = null;
let browserLock = false;
let lastUsed = 0;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 分钟无活动则关闭浏览器
const NAV_TIMEOUT = 30000; // 页面加载超时

/**
 * 获取或创建浏览器实例
 */
async function getBrowser() {
  if (browser && browser.isConnected()) {
    lastUsed = Date.now();
    return browser;
  }
  // 等待上一个关闭操作完成
  while (browserLock) {
    await new Promise(r => setTimeout(r, 100));
  }
  if (browser && browser.isConnected()) {
    lastUsed = Date.now();
    return browser;
  }
  console.log('[Browser] 启动 Chromium...');
  browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      ...(process.platform === 'win32' ? ['--single-process'] : ['--disable-setuid-sandbox']),
      '--no-zygote',
    ],
  });
  lastUsed = Date.now();
  console.log('[Browser] Chromium 已启动');
  return browser;
}

/**
 * 创建新页面并导航到指定 URL
 * @param {string} url - 目标 URL
 * @param {object} opts - 配置选项
 * @returns {Promise<{page: import('playwright').Page, response: import('playwright').Response}>}
 */
async function createPage(url, opts = {}) {
  const b = await getBrowser();
  const context = await b.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  });
  const page = await context.newPage();

  // 覆盖自动化检测
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });

  try {
    const response = await page.goto(url, {
      waitUntil: opts.waitUntil || 'networkidle',
      timeout: opts.timeout || NAV_TIMEOUT,
    });
    return { page, context, response };
  } catch (e) {
    // 超时也可能有部分内容，返回 page 供解析
    return { page, context, response: null, error: e.message };
  }
}

/**
 * 关闭浏览器（空闲时调用）
 */
async function closeBrowser() {
  if (browserLock) return;
  browserLock = true;
  try {
    if (browser) {
      await browser.close().catch(() => {});
      browser = null;
      console.log('[Browser] Chromium 已关闭');
    }
  } finally {
    browserLock = false;
  }
}

// 定时检查空闲关闭
setInterval(async () => {
  if (browser && browser.isConnected() && Date.now() - lastUsed > IDLE_TIMEOUT) {
    console.log('[Browser] 空闲超时，关闭浏览器');
    await closeBrowser();
  }
}, 60000);

// 进程退出时清理
process.on('SIGINT', async () => { await closeBrowser(); process.exit(0); });
process.on('SIGTERM', async () => { await closeBrowser(); process.exit(0); });

module.exports = { getBrowser, createPage, closeBrowser };
