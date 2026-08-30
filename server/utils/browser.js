/**
 * Playwright 浏览器管理器
 * 管理浏览器实例的生命周期，提供页面创建/关闭功能
 *
 * 使用 playwright-extra + puppeteer-extra-plugin-stealth 绕过抖音等平台的自动化检测。
 * 浏览器优先级：CHROME_PATH 环境变量 > Playwright 自带 chromium > 系统 chromium。
 */
let chromium;
let stealthPlugin;
try {
  // playwright-extra 在 stealth 应用后能绕过 WAF（抖音 a_bogus 签名校验）
  chromium = require('playwright-extra').chromium;
  stealthPlugin = require('puppeteer-extra-plugin-stealth');
  chromium.use(stealthPlugin());
} catch (e) {
  // 退回到原生 playwright（stealth 未安装时）
  chromium = require('playwright').chromium;
  console.warn('[Browser] playwright-extra/stealth 未安装，退回原生 playwright:', e.message);
}

const fs = require('fs');

// 解析可执行文件路径：优先 CHROME_PATH，其次常见系统 chromium 路径
function resolveExecutablePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === 'win32') {
    const winPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    return fs.existsSync(winPath) ? winPath : '';
  }
  // Linux/Mac：检查系统 chromium（Docker apk 安装的位置）
  const sysCandidates = ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
  for (const p of sysCandidates) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  // Playwright 自带 chromium（由 npx playwright install 下载）
  return '';
}

const CHROME_PATH = resolveExecutablePath();
const HEADLESS = process.env.HEADLESS !== 'false'; // 默认 true，HEADLESS=false 时用非 headless

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
  const stealthOn = !!stealthPlugin;
  console.log(`[Browser] 启动 Chromium (headless=${HEADLESS}, stealth=${stealthOn}, exe=${CHROME_PATH || 'bundled'})...`);
  const launchOptions = {
    headless: HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-infobars',
      ...(process.platform === 'win32' ? ['--single-process'] : ['--disable-setuid-sandbox']),
      '--no-zygote',
    ],
  };
  // 如果解析到可执行路径则用指定的，否则用 Playwright 自带的 chromium
  if (CHROME_PATH) {
    launchOptions.executablePath = CHROME_PATH;
  }
  browser = await chromium.launch(launchOptions);
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
