/**
 * 抖音 Playwright 解析器
 * 使用 headless Chrome 绕过 WAF，提取视频/图文数据
 */
const { createPage } = require('../utils/browser');

const PARSE_TIMEOUT = 45000;
const MAX_RETRIES = 2;
const VERSION_NOTICE_PATTERN = /版本过低[，,]\s*升级后可展示全部信息/g;

/**
 * 解析抖音分享链接
 * @param {string} url - 抖音分享链接 (v.douyin.com/...)
 * @returns {Promise<object>} 解析结果
 */
function cleanDouyinText(value) {
  return String(value || '')
    .replace(VERSION_NOTICE_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function applySharedCaption(result, sharedCaption) {
  if (!result) return result;
  const caption = cleanDouyinText(sharedCaption);
  return {
    ...result,
    title: cleanDouyinText(result.title),
    description: caption || cleanDouyinText(result.description),
    hasSharedCaption: Boolean(caption),
  };
}

async function parseDouyin(url, sharedCaption = '') {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let pageCtx = null;
    let apiData = null;
    try {
      console.log(`[Douyin/Playwright] 尝试 #${attempt + 1}: ${url.slice(0, 60)}`);
      // 先创建浏览器（不导航）
      const browser = await (require('../utils/browser').getBrowser)();
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });
      pageCtx = { page, context };

      // 在导航前设置 API 响应拦截
      page.on('response', async (response) => {
        const reqUrl = response.url();
        if (reqUrl.includes('slidesinfo') || reqUrl.includes('aweme/v1/web/aweme/detail') || reqUrl.includes('aweme/post') || reqUrl.includes('aweme/favorite') || reqUrl.includes('aweme/v1/web/aweme/') || reqUrl.includes('aweme/v1/web/note/') || reqUrl.includes('api/note') || reqUrl.includes('web/api/v2/aweme')) {
          try {
            const json = await response.json();
            if (json) {
              apiData = json;
              console.log('[Douyin] API 捕获:', reqUrl.slice(0, 80), '| 数据:', JSON.stringify(json).slice(0, 100));
            }
          } catch {}
        }
      });

      // 导航
      await page.goto(url, { waitUntil: 'networkidle', timeout: PARSE_TIMEOUT }).catch(() => {});
      // 如果还在加载中，等待空闲
      try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}

      // 等待页面渲染（最长 10 秒）
      await page.waitForTimeout(8000);

      // 提取数据（先检查 API 拦截的数据）
      let data = apiData;
      if (!data) {
        data = await page.evaluate(() => {
          try {
            const el = document.getElementById('__INITIAL_STATE__');
            if (el) return JSON.parse(el.textContent || '{}');
          } catch {}
          try { if (window.__INITIAL_STATE__) return window.__INITIAL_STATE__; } catch {}
          try {
            const el = document.getElementById('__RENDER_DATA__');
            if (el) {
              const decoded = decodeURIComponent(el.textContent || '');
              return JSON.parse(decoded);
            }
          } catch {}
          try { if (window._SSR_DATA) return window._SSR_DATA; } catch {}
          // 尝试找到 <script> 中包含 aweme_detail 的 JSON
          try {
            const scripts = document.querySelectorAll('script');
            for (const s of scripts) {
              const t = s.textContent || '';
              if (t.includes('aweme_detail') || t.includes('__INITIAL_STATE__')) {
                const m = t.match(/window.__INITIAL_STATE__s*=s*({[sS]+?});s*$/m);
                if (m) return JSON.parse(m[1]);
              }
            }
          } catch {}
          return null;
        });
      }

      // 如果还没数据，等待更多时间
      if (!data) {
        console.log('[Douyin] 等待页面渲染...');
        await page.waitForTimeout(5000);
        data = await page.evaluate(() => {
          try { if (window.__INITIAL_STATE__) return window.__INITIAL_STATE__; } catch {}
          try { if (window._SSR_DATA) return window._SSR_DATA; } catch {}
          return null;
        });
      }

      // 如果还没数据，尝试拦截 API 响应
      if (!data) {
        console.log('[Douyin] 尝试从 API 响应提取...');
        data = await page.evaluate(() => {
          try {
            const scripts = document.querySelectorAll('script');
            for (const s of scripts) {
              const t = s.textContent || '';
              if (t.includes('aweme_detail') || t.includes('video')) {
                const m = t.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/);
                if (m) return JSON.parse(m[1]);
              }
            }
          } catch {}
          return null;
        });
      }

      // 提取 OG 标签（兜底） + 页面 DOM 数据
      if (!data || !data.awemeDetail) {
        const ogData = await page.evaluate(() => {
          const get = (sel) => {
            const el = document.querySelector(sel);
            return el ? el.getAttribute('content') || '' : '';
          };
          return {
            title: get('meta[property="og:title"]') || document.title,
            description: get('meta[property="og:description"]') || get('meta[name="description"]'),
            image: get('meta[property="og:image"]'),
            video: get('meta[property="og:video"]') || get('meta[property="og:video:url"]'),
            url: get('meta[property="og:url"]'),
          };
        });
        // 从 DOM 提取图片（slides 页面可能有 img 标签）
        // 从 slides 页面提取图片（抖音图文有专门的图片列表）
        if (!ogData.image || !ogData.images) {
          const slidesImgs = await page.evaluate(() => {
            // 查找 slide 容器中的图片
            const containers = document.querySelectorAll('[class*="slide"], [class*="image"], [class*="media"], .swiper-slide, [class*="carousel"]');
            const urls = new Set();
            for (const c of containers) {
              const imgs = c.querySelectorAll('img');
              imgs.forEach(i => { if (i.src && i.src.startsWith('http')) urls.add(i.src); });
            }
            // 也找所有大图
            document.querySelectorAll('img[src*="douyinpic"], img[src*="pstatp"]').forEach(i => {
              if (i.src && i.src.startsWith('http')) urls.add(i.src);
            });
            return Array.from(urls).filter(u => !u.includes('avatar') && !u.includes('logo')).slice(0, 50);
          });
          if (slidesImgs.length > 0) {
            ogData.images = slidesImgs;
            ogData.image = ogData.images[0];
          }
        }
        // 查找 video 标签
        if (!ogData.video) {
          const videoSrc = await page.evaluate(() => {
            const v = document.querySelector('video source');
            return v ? v.src : (document.querySelector('video')?.src || '');
          });
          if (videoSrc) ogData.video = videoSrc;
        }
        if (!ogData.image) {
          const domImg = await page.evaluate(() => {
            const allImgs = Array.from(document.querySelectorAll('img[src]'));
            return allImgs.map(i => i.src).filter(s => {
              if (!s) return false;
              if (s.includes('avatar') || s.includes('logo') || s.includes('icon') || s.includes('pixel')) return false;
              return s.includes('douyin') || s.includes('douyinpic') || s.includes('douyincdn') || s.includes('pstatp') || s.includes('snssdk');
            }).slice(0, 20);
          });
          if (domImg.length > 0) {
            ogData.image = domImg[0];
            ogData.images = domImg;
          }
        }
        // 不提前返回，继续用 API 数据覆盖（OG 只有封面，API 有完整数据）
        // 将 OG 数据作为兜底
        if (ogData && !data) {
          data = { __ogFallback: true, ...ogData };
        }
      }

      // 合并 apiData 到 data（优先使用 slidesinfo API 数据）
      if (apiData?.aweme_details?.length > 0) {
        data = apiData; // API 数据最完整，覆盖掉 OG 兜底
        console.log('[Douyin] 使用 API 数据，图片数:', apiData.aweme_details[0]?.images?.length || 0);
      }

      // 解析数据
      if (data) {
        const result = extractDouyinData(data, page);
        if (result && result.media.length > 0) {
          await context.close().catch(() => {});
          return applySharedCaption(result, sharedCaption);
        }
        // 如果 API 数据解析失败，但 data 有 OG 字段，fallback
        if (data.__ogFallback) {
          await context.close().catch(() => {});
          return applySharedCaption(formatResult(data), sharedCaption);
        }
      }

      // 最后尝试从页面截图分析或直接获取页面信息
      const title = await page.title();
      const url_ = page.url();

      await context.close().catch(() => {});

      if (title && title !== '抖音') {
        return applySharedCaption(formatResult({ title, url: url_ }), sharedCaption);
      }

      // 如果到达这里，说明解析失败
      if (attempt < MAX_RETRIES) {
        console.log(`[Douyin] 第 ${attempt + 1} 次尝试失败，重试...`);
        // 等待后重试
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
    } catch (e) {
      console.log(`[Douyin] 错误:`, e.message);
      if (pageCtx?.context) {
        await pageCtx.context.close().catch(() => {});
      }
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
    }
  }

  // 所有尝试失败
  return applySharedCaption({
    title: '抖音',
    description: '抖音解析失败：无法绕过 WAF 风控，请尝试在抖音 APP 中直接保存。',
    author: '',
    cover: '',
    video: '',
    images: [],
    type: 'unknown',
    media: [],
  }, sharedCaption);
}

/**
 * 从 __INITIAL_STATE__ 或其他数据中提取视频/图文信息
 */
function extractDouyinData(data, page) {
  try {
    // iesdouyin.com slidesinfo API 响应结构
    const details = data?.aweme_details || [];
    if (details.length > 0) {
      const d = details[0];
      const images = [];
      const imgList = d?.images || [];
      for (const img of imgList) {
        const urlList = img?.url_list || img?.urlList || [];
        // 优先取无水印版本（不包含 water-v2）
        const noWatermark = urlList.find(u => !u.includes('water-v2') && !u.includes('watermark'));
        const best = noWatermark || urlList[0] || '';
        if (best) images.push(best);
      }

      let videoUrl = '';
      const video = d?.video;
      if (video) {
        videoUrl = video?.play_addr?.url_list?.[0]
          || video?.playAddr?.[0]
          || video?.play_api?.url_list?.[0]
          || video?.download_addr?.url_list?.[0]
          || '';
        // 背景音乐（.mp3）不算视频
        if (videoUrl && /\.mp3(\?|$)/i.test(videoUrl)) videoUrl = '';
      }

      const title = d?.desc || '';
      const author = d?.author?.nickname || d?.author?.nick_name || d?.author?.unique_id || '';
      const cover = images[0] || '';

      const media = images.map(u => ({ type: 'image', url: u, thumb: u }));
      if (videoUrl) {
        media.push({ type: 'video', url: videoUrl, thumb: cover });
      }

      const type = images.length > 0 ? 'image' : (videoUrl ? 'video' : 'text');

      return {
        title: title || '抖音视频',
        description: title || '',
        author,
        cover,
        video: videoUrl || '',
        images,
        type,
        media,
      };
    }

    // 桌面端 douyin.com 数据结构（兜底）
    const awemeDetail = data?.awemeDetail
      || data?.aweme?.detail
      || data?.videoData
      || data?.mediaData
      || data?.noteData
      || data?.data;

    const video = awemeDetail?.video || awemeDetail?.aweme_detail?.video || data?.video;
    const images = [];
    let videoUrl = '';
    let cover = '';

    const imageList = awemeDetail?.images || awemeDetail?.imageList || awemeDetail?.image_list || [];
    for (const img of imageList) {
      const url = img?.urlList?.[0] || img?.url_list?.[0] || img?.url || img?.display_url || '';
      if (url) images.push(url);
    }

    if (video) {
      videoUrl = video?.playAddr?.[0] || video?.play_addr?.[0]?.url_list?.[0] || video?.playAddr || video?.play_url?.url_list?.[0] || video?.playApi || video?.downloadAddr || video?.download_addr?.[0]?.url_list?.[0] || '';
      cover = video?.cover?.urlList?.[0] || video?.cover?.url_list?.[0] || video?.originCover?.urlList?.[0] || video?.origin_cover?.url_list?.[0] || video?.dynamicCover || video?.dynamic_cover || '';
    }

    const title = awemeDetail?.desc || awemeDetail?.title || data?.title || '';
    const author = awemeDetail?.author?.nickname || awemeDetail?.author?.nick_name || awemeDetail?.user?.nickname || data?.author || '';

    const media = images.map(u => ({ type: 'image', url: u, thumb: u }));
    if (videoUrl) media.push({ type: 'video', url: videoUrl, thumb: cover });

    return {
      title: title || '抖音视频',
      description: title || '',
      author,
      cover: cover || images[0] || '',
      video: videoUrl || '',
      images,
      type: videoUrl ? 'video' : (images.length > 0 ? 'image' : 'text'),
      media,
    };
  } catch (e) {
    console.log('[Douyin/Extract] 错误:', e.message);
    return null;
  }
}

/**
 * 从 OG 标签格式化结果
 */
function formatResult(og) {
  const media = [];
  if (og.image) media.push({ type: 'image', url: og.image, thumb: og.image });
  if (og.video) media.push({ type: 'video', url: og.video, thumb: og.image || '' });
  const images = og.image ? [og.image] : [];
  return {
    title: og.title || '抖音',
    description: og.description || og.title || '',
    author: og.author || '',
    cover: og.image || '',
    video: og.video || '',
    images,
    type: og.video ? 'video' : (images.length > 0 ? 'image' : 'text'),
    media,
  };
}

module.exports = { parseDouyin };
