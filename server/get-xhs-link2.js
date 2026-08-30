// 用 Playwright+stealth 渲染小红书首页，提取带 xsec_token 的笔记链接
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
chromium.use(stealth());
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'],
  });
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1920, height: 1080 }, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
  const page = await ctx.newPage();
  await page.goto('https://www.xiaohongshu.com/explore', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('nav:', e.message));
  await page.waitForTimeout(10000);
  // 提取所有 /explore/{id} 链接（带 xsec_token）
  const links = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href]')].map(x => x.getAttribute('href')).filter(h => h && h.includes('/explore/') && h.includes('xsec_token'));
    return [...new Set(a)];
  }).catch(() => []);
  console.log('found links:', links.length);
  links.slice(0, 15).forEach(l => console.log(l.startsWith('http') ? l : 'https://www.xiaohongshu.com' + l));
  // 也提取 note 卡片标题
  const titles = await page.evaluate(() => [...document.querySelectorAll('a[href*="/explore/"]')].slice(0, 8).map(a => a.innerText?.trim()?.slice(0, 40))).catch(() => []);
  console.log('\ntitles:', titles);
  await browser.close();
})();
