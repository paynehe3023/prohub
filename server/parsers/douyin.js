/**
 * 抖音 Playwright 解析器
 * 策略：桌面 UA + 先访问主页获取 cookie + douyin.com/video/{id} + 拦截 aweme detail API
 */
const { getBrowser } = require('../utils/browser');
const axios = require('axios');
const {
  isWatermarkedImageUrl,
  isWatermarkedVideoUrl,
  pickNoWatermark,
  allNoWatermark,
} = require('../utils/watermark');

const PARSE_TIMEOUT = 45000;
const MAX_RETRIES = 1;
const VERSION_NOTICE_PATTERN = /版本过低[，,]\s*升级后可展示全部信息/g;

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const STEALTH_SCRIPT = `() => {
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
}`;

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

/**
 * 从各种 URL 格式提取抖音视频 ID
 */
function extractDouyinVideoId(url) {
  let m = url.match(/\/(?:video|share\/video)\/(\d+)/);
  if (m) return m[1];
  m = url.match(/[?&](?:item_id|aweme_id)=(\d+)/);
  if (m) return m[1];
  m = url.match(/\/note\/(\d+)/);
  if (m) return m[1];
  return '';
}

/**
 * 跟随短链重定向获取真实 URL
 */
async function resolveShortUrl(url) {
  if (!/v\.douyin\.com|iesdouyin\.com\/share/i.test(url)) return url;
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': DESKTOP_UA, 'Accept': 'text/html,*/*;q=0.8' },
      timeout: 10000,
      maxRedirects: 8,
      responseType: 'text',
      validateStatus: s => s < 500,
    });
    return res.request?.res?.responseUrl || res.request?.path || url;
  } catch {
    return url;
  }
}

/**
 * 解析抖音分享链接
 * @param {string} url - 抖音分享链接
 * @param {string} sharedCaption - 分享文案
 * @returns {Promise<object>} 解析结果
 */
async function parseDouyin(url, sharedCaption = '') {
  // 1. 提取 video ID（短链先跟随重定向）
  let realUrl = url;
  if (/v\.douyin\.com/i.test(url)) {
    realUrl = await resolveShortUrl(url);
  }
  const videoId = extractDouyinVideoId(realUrl) || extractDouyinVideoId(url);
  if (!videoId) {
    return applySharedCaption({
      title: '抖音',
      description: '无法识别抖音视频 ID，请确认链接正确。',
      author: '', cover: '', video: '', images: [], type: 'unknown', media: [], noWatermark: false,
    }, sharedCaption);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let context = null;
    let targetApiData = null;
    let lastApiData = null;
    try {
      
      console.log(`[Douyin] 尝试 #${attempt + 1}: videoId=${videoId}`);
      const browser = await getBrowser();
      context = await browser.newContext({
        userAgent: DESKTOP_UA,
        viewport: { width: 1920, height: 1080 },
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
      });
      const page = await context.newPage();
      await context.addInitScript(STEALTH_SCRIPT);

      // 拦截 aweme detail API 响应（广泛匹配）
      page.on('response', async (response) => {
        const reqUrl = response.url();
        if (reqUrl.includes('aweme') && (reqUrl.includes('detail') || reqUrl.includes('post') || reqUrl.includes('item'))) {
          try {
            const json = await response.json();
            if (json?.aweme_detail) {
              lastApiData = json;
              const id = String(json.aweme_detail.aweme_id || json.aweme_detail.item_id || '');
              if (id === videoId) {
                targetApiData = json;
                console.log('[Douyin] 捕获目标视频 API');
              }
            } else if (json?.aweme_details) {
              for (const d of json.aweme_details) {
                const id = String(d.aweme_id || d.item_id || '');
                if (id === videoId) {
                  targetApiData = { aweme_detail: d };
                  console.log('[Douyin] 捕获目标视频 API (multi)');
                }
              }
            }
          } catch {}
        }
      });

      // 2. 先访问主页获取 cookie
      console.log('[Douyin] 访问主页获取 cookie...');
      await page.goto('https://www.douyin.com/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(5000);

      // 3. 导航到视频页面
      const videoPageUrl = `https://www.douyin.com/video/${videoId}`;
      console.log(`[Douyin] 访问视频页面: ${videoPageUrl}`);
      await page.goto(videoPageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

      // 4. 等待 API 响应
      for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(3000);
        console.log(`[Douyin] ${(i + 1) * 3}s: target=${!!targetApiData} last=${!!lastApiData}`);
        if (targetApiData) break;
      }

      // 5. 提取数据
      const apiData = targetApiData || lastApiData;
      if (apiData?.aweme_detail) {
        const result = extractDouyinData({ awemeDetail: apiData.aweme_detail }, page);
        if (result && result.media.length > 0) {
          return applySharedCaption(result, sharedCaption);
        }
      }

      // 5.5 从 DOM <script> 提取嵌入的 JSON 数据
      const scriptData = await page.evaluate(() => {
        try { if (window.__INITIAL_STATE__) return window.__INITIAL_STATE__; } catch {}
        try { if (window._SSR_DATA) return window._SSR_DATA; } catch {}
        try {
          const el = document.getElementById('_RENDER_DATA');
          if (el) return JSON.parse(decodeURIComponent(el.textContent || ''));
        } catch {}
        try {
          const scripts = document.querySelectorAll('script');
          for (const s of scripts) {
            const t = s.textContent || '';
            if (t.includes('aweme_detail') || t.includes('awemeDetail')) {
              const m = t.match(/\{[\s\S]*"aweme_detail"[\s\S]*\}/);
              if (m) {
                try { return JSON.parse(m[0]); } catch {}
              }
            }
          }
        } catch {}
        return null;
      }).catch(() => null);

      if (scriptData) {
        console.log('[Douyin] 从 DOM script 提取到数据');
        const result = extractDouyinData(scriptData, page);
        if (result && result.media.length > 0) {
          return applySharedCaption(result, sharedCaption);
        }
      }

      // 6. OG/DOM 兜底
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
      }).catch(() => ({}));

      if (ogData && (ogData.video || ogData.image)) {
        return applySharedCaption(formatResult(ogData), sharedCaption);
      }

      // 7. 页面 title 兜底
      const title = await page.title().catch(() => '');
      if (title && title !== '抖音' && !title.includes('记录美好生活')) {
        return applySharedCaption(formatResult({ title, url: videoPageUrl }), sharedCaption);
      }

      if (attempt < MAX_RETRIES) {
        console.log('[Douyin] 重试...');
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
    } catch (e) {
      console.log('[Douyin] 错误:', e.message);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
    } finally {
      if (context) await context.close().catch(() => {});
    }
  }

  return applySharedCaption({
    title: '抖音',
    description: '抖音解析失败：无法绕过 WAF 风控，请尝试在抖音 APP 中直接保存。',
    author: '', cover: '', video: '', images: [], type: 'unknown', media: [], noWatermark: false,
  }, sharedCaption);
}

/**
 * 从 __INITIAL_STATE__ 或 API 数据中提取视频/图文信息
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
        const urlList = [
          ...(img?.url_list || []),
          ...(img?.urlList || []),
          img?.download_url_list?.[0],
          img?.noWatermarkUrl,
          img?.url,
          img?.display_url,
        ].flat(2).filter(Boolean);
        const best = pickNoWatermark(urlList, 'image');
        if (best) images.push(best);
      }

      let videoUrl = '';
      const video = d?.video;
      if (video) {
        const bitRateList = [].concat(
          video?.bit_rate || [],
          video?.bitRate || [],
          video?.video?.bit_rate || [],
          video?.bitRateList || [],
        ).filter(Boolean);

        const bitRatePlayUrls = bitRateList.flatMap((b) => [
          ...(b?.play_addr?.url_list || []),
          ...(b?.playAddr || []),
          ...(b?.url_list || []),
          b?.url,
        ]).filter(Boolean);

        const videoCandidates = [
          ...bitRatePlayUrls,
          ...(video?.play_addr?.url_list || []),
          ...(video?.playAddr?.[0]?.url_list || []),
          video?.play_api?.url_list?.[0],
          ...(video?.download_addr?.url_list || []),
          video?.download_suffix_logo_addr?.url_list?.[0],
        ].filter(Boolean).map((u) => (typeof u === 'string' ? u : u?.url || ''));

        const bestVideo = pickNoWatermark(videoCandidates, 'video');
        if (bestVideo && !/\.mp3(\?|$)/i.test(bestVideo)) videoUrl = bestVideo;
      }

      const title = d?.desc || '';
      const author = d?.author?.nickname || d?.author?.nick_name || d?.author?.unique_id || '';
      const cover = images[0] || '';

      const media = images.map(u => ({ type: 'image', url: u, thumb: u }));
      if (videoUrl) {
        media.push({ type: 'video', url: videoUrl, thumb: cover });
      }

      const type = images.length > 0 ? 'image' : (videoUrl ? 'video' : 'text');
      const noWatermark = (images.length > 0 ? allNoWatermark(images, 'image') : true)
        && (videoUrl ? !isWatermarkedVideoUrl(videoUrl) : true);

      return {
        title: title || '抖音视频',
        description: title || '',
        author,
        cover,
        video: videoUrl || '',
        images,
        type,
        media,
        noWatermark,
      };
    }

    // 桌面端 douyin.com / aweme_detail 数据结构
    const awemeDetail = data?.awemeDetail
      || data?.aweme?.detail
      || data?.aweme_detail
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
      const candidates = [
        ...(img?.urlList || []),
        ...(img?.url_list || []),
        ...(img?.download_url_list || []),
        img?.noWatermarkUrl,
        img?.url,
        img?.display_url,
      ].filter(Boolean);
      const best = pickNoWatermark(candidates, 'image');
      if (best) images.push(best);
    }

    if (video) {
      const bitRateList = [].concat(
        video?.bit_rate || [],
        video?.bitRate || [],
        video?.bitRateList || [],
      ).filter(Boolean);
      const bitRatePlayUrls = bitRateList.flatMap((b) => [
        ...(b?.play_addr?.url_list || []),
        ...(b?.playAddr || []),
        ...(b?.url_list || []),
        b?.url,
      ]).filter(Boolean);
      const videoCandidates = [
        ...bitRatePlayUrls,
        ...(Array.isArray(video?.playAddr) ? video.playAddr : []),
        video?.play_addr?.[0]?.url_list?.[0],
        video?.play_url?.url_list?.[0],
        video?.playApi,
        ...(Array.isArray(video?.downloadAddr) ? video.downloadAddr : []),
        video?.download_addr?.[0]?.url_list?.[0],
        video?.download_suffix_logo_addr?.url_list?.[0],
      ].filter(Boolean).map((u) => (typeof u === 'string' ? u : u?.url || ''));
      const bestVideo = pickNoWatermark(videoCandidates, 'video');
      if (bestVideo && !/\.mp3(\?|$)/i.test(bestVideo)) videoUrl = bestVideo;
      cover = video?.cover?.urlList?.[0] || video?.cover?.url_list?.[0] || video?.originCover?.urlList?.[0] || video?.origin_cover?.url_list?.[0] || video?.dynamicCover || video?.dynamic_cover || '';
    }

    const title = awemeDetail?.desc || awemeDetail?.title || data?.title || '';
    const author = awemeDetail?.author?.nickname || awemeDetail?.author?.nick_name || awemeDetail?.user?.nickname || data?.author || '';

    const media = images.map(u => ({ type: 'image', url: u, thumb: u }));
    if (videoUrl) media.push({ type: 'video', url: videoUrl, thumb: cover });

    const noWatermark = (images.length > 0 ? allNoWatermark(images, 'image') : true)
      && (videoUrl ? !isWatermarkedVideoUrl(videoUrl) : true);

    return {
      title: title || '抖音视频',
      description: title || '',
      author,
      cover: cover || images[0] || '',
      video: videoUrl || '',
      images,
      type: videoUrl ? 'video' : (images.length > 0 ? 'image' : 'text'),
      media,
      noWatermark,
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
  const images = [];
  let videoUrl = '';
  const ogImage = og.image && !isWatermarkedImageUrl(og.image) ? og.image : '';
  const ogVideo = og.video && !isWatermarkedVideoUrl(og.video) ? og.video : '';
  if (ogImage) {
    media.push({ type: 'image', url: ogImage, thumb: ogImage });
    images.push(ogImage);
  }
  if (ogVideo) {
    media.push({ type: 'video', url: ogVideo, thumb: ogImage || '' });
    videoUrl = ogVideo;
  }
  const noWatermark = (images.length > 0 ? allNoWatermark(images, 'image') : true)
    && (videoUrl ? !isWatermarkedVideoUrl(videoUrl) : true);
  return {
    title: og.title || '抖音',
    description: og.description || og.title || '',
    author: og.author || '',
    cover: ogImage || '',
    video: videoUrl,
    images,
    type: videoUrl ? 'video' : (images.length > 0 ? 'image' : 'text'),
    media,
    noWatermark,
  };
}

module.exports = { parseDouyin };
