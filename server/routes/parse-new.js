const axios = require('axios');
const cheerio = require('cheerio');

// ==================== 浏览器 UA 池 ====================
const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
];
const MOBILE_UA = UA_POOL[2];

function randomUA() { return UA_POOL[Math.floor(Math.random() * UA_POOL.length)]; }

// ==================== 平台识别（含短链） ====================
function detectPlatform(url) {
  if (/xhslink\.(com|cn)|xiaohongshu\.com|www\.xhs\.link/i.test(url)) return 'xiaohongshu';
  if (/douyin\.com|iesdouyin\.com|v\.douyin\.com/i.test(url)) return 'douyin';
  if (/weibo\.com|weibo\.cn|t\.cn/i.test(url)) return 'weibo';
  return 'unknown';
}

// ==================== HTTP 请求 ====================
const PLATFORM_COOKIES = {
  douyin: 'passport_csrf_token=fake; odin_tt=1;',
  weibo: 'SUB=_2AkMR; SUBP=0033WrSXqPxfM;',
  xiaohongshu: 'a1=18; webId=abc;',
};

async function fetchPage(url, opts = {}) {
  const ua = opts.mobile ? MOBILE_UA : randomUA();
  const platform = detectPlatform(url);
  const cookie = PLATFORM_COOKIES[platform] || '';
  const referer = opts.referer || {
    douyin: 'https://www.douyin.com/',
    xiaohongshu: 'https://www.xiaohongshu.com/',
    weibo: 'https://weibo.com/',
  }[platform] || 'https://www.google.com/';

  console.log(`[Fetch] ${url.slice(0, 80)} | Platform: ${platform}`);

  const res = await axios.get(url, {
    headers: {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': referer,
      'Cookie': cookie,
      'Cache-Control': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
    },
    timeout: 15000,
    maxRedirects: 8,
    responseType: 'text',
    validateStatus: s => s < 500,
  });

  const finalUrl = res.request?.res?.responseUrl || res.request?.path || url;
  return { html: res.data, url: finalUrl };
}

// ==================== 辅助: meta 标签取值 ====================
function metaContent($, selector) {
  return $(selector).attr('content')?.trim() || '';
}

// ==================== 小红书解析 ====================
function parseXiaohongshu(html) {
  const $ = cheerio.load(html);
  const media = [];
  let title = '', description = '', author = '';

  // 策略1: __INITIAL_STATE__
  const initState = extractScriptJSON(html, 'window.__INITIAL_STATE__');
  if (initState) {
    try {
      // 直接从已知路径提取笔记详情
      let noteDetail = initState?.noteData?.data?.noteData
        || initState?.note?.noteDetailMap
           ? Object.values(initState.note.noteDetailMap)[0]?.note
           : null;

      // 递归兜底
      if (!noteDetail) {
        function find(obj) {
          if (!obj || typeof obj !== 'object') return null;
          if (obj.imageList || obj.image_list) return obj;
          for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'object' && v !== null) {
              const r = find(v);
              if (r) return r;
            }
          }
          return null;
        }
        noteDetail = find(initState);
      }

      if (noteDetail) {
        title = noteDetail.title || noteDetail.displayTitle || '';
        description = noteDetail.desc || noteDetail.description || '';
        author = noteDetail.user?.nickname || noteDetail.user?.nickName || '';

        const imageList = noteDetail.imageList || noteDetail.image_list || [];
        for (const img of imageList) {
          let imgUrl = img.urlDefault || img.url_default || img.url || img.infoList?.[0]?.url || '';
          if (imgUrl && !imgUrl.includes('avatar')) {
            imgUrl = imgUrl.replace(/\?.*$/, '');
            media.push({ type: 'image', url: imgUrl, thumb: imgUrl + '?imageView2/1/w/400' });
          }
        }

        const video = noteDetail.video;
        if (video) {
          const vUrl = video.consumer?.originVideoKey
            || video.media?.stream?.h264?.[0]?.masterUrl
            || video.media?.stream?.h265?.[0]?.masterUrl
            || '';
          if (vUrl) {
            media.push({ type: 'video', url: vUrl, thumb: video.image?.firstFrameFileid || video.cover?.urlDefault || '' });
          }
        }
      }
    } catch (e) { console.log('[XHS] INIT_STATE error:', e.message); }
  }

  // 策略2: OG 标签
  if (!title) title = metaContent($, 'meta[property="og:title"]');
  if (!description) description = metaContent($, 'meta[property="og:description"]') || metaContent($, 'meta[name="description"]');

  // 策略3: 从 img 找 xhscdn/sns 图片（仅当策略1失败时）
  // 过滤掉头像：排除 /avatar/、尺寸 < 100px 的图片
  if (media.length === 0) {
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (src && (src.includes('xhscdn') || src.includes('sns-img') || src.includes('sns-webpic'))) {
        // 排除头像
        if (src.includes('avatar') || src.includes('/avatar/')) return;
        media.push({ type: 'image', url: src.replace(/\\?.*$/, ''), thumb: src });
      }
    });
  }

  // 构建 images 数组（前端需要此字段渲染预览）
  const images = media.filter(m => m.type === 'image').map(m => m.url);
  const videoUrls = media.filter(m => m.type === 'video').map(m => m.url);
  const cover = media.find(m => m.type === 'video')?.thumb || images[0] || '';
  const type = videoUrls.length > 0 ? 'video' : (images.length > 0 ? 'image' : 'text');

  return { title, description, author, media, images, cover, video: videoUrls[0] || '', type };
}

// ==================== 抖音解析（基于 jiji262/douyin-downloader 架构） ====================

/**
 * 抖音解析新方案：
 * 1. 短链重定向 → 提取 aweme_id
 * 2. 使用 www.douyin.com 的 aweme/detail API（非 iesdouyin.com）
 * 3. 携带完整 device fingerprint 参数 + X-Bogus 签名
 * 4. 从 aweme_detail 提取 images/video/author/desc
 *
 * 参考: https://github.com/jiji262/douyin-downloader
 */

// 抖音 PC 端 API 所需的设备指纹参数（与 douyin-downloader 一致）
function buildDouyinQueryParams(msToken = '') {
  const params = new URLSearchParams({
    device_platform: 'webapp',
    aid: '6383',
    channel: 'channel_pc_web',
    update_version_code: '170400',
    pc_client_type: '1',
    pc_libra_divert: 'Windows',
    version_code: '290100',
    version_name: '29.1.0',
    cookie_enabled: 'true',
    screen_width: '1536',
    screen_height: '864',
    browser_language: 'zh-CN',
    browser_platform: 'Win32',
    browser_name: 'Chrome',
    browser_version: '139.0.0.0',
    browser_online: 'true',
    engine_name: 'Blink',
    engine_version: '139.0.0.0',
    os_name: 'Windows',
    os_version: '10',
    cpu_core_num: '16',
    device_memory: '8',
    platform: 'PC',
    downlink: '10',
    effective_type: '4g',
    round_trip_time: '200',
    support_h265: '1',
    support_dash: '1',
    msToken: msToken,
  });
  return params.toString();
}

const DY_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';

// 缓存的 cookies（ttwid + msToken）
let dyCookies = null;
let dyCookieExpiry = 0;

async function getDyCookies() {
  if (dyCookies && Date.now() < dyCookieExpiry) return dyCookies;

  console.log('[DY] Fetching cookies from douyin.com...');
  try {
    const res = await axios.get('https://www.douyin.com/', {
      headers: {
        'User-Agent': DY_UA,
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      timeout: 10000,
      maxRedirects: 3,
      validateStatus: s => s < 500,
    });
    const cookies = res.headers['set-cookie'] || [];
    const ttwid = (cookies.find(c => c.includes('ttwid=')) || '').match(/ttwid=([^;]+)/)?.[1] || '';
    const msToken = (cookies.find(c => c.includes('msToken=')) || '').match(/msToken=([^;]+)/)?.[1] || '';
    dyCookies = { ttwid, msToken };
    dyCookieExpiry = Date.now() + 10 * 60 * 1000;
    console.log(`[DY] Got cookies: ttwid=${ttwid ? ttwid.slice(0,16) : 'none'}... msToken=${msToken ? msToken.slice(0,16) : 'empty'}...`);
    return dyCookies;
  } catch (e) {
    console.log('[DY] Cookie fetch failed:', e.message);
    return { ttwid: '1', msToken: '' };
  }
}

/**
 * 步骤1: 短链重定向 → 提取 aweme_id
 */
async function resolveDouyinShortUrl(url) {
  try {
    console.log('[DY] Resolving short URL chain...');
    const res = await axios.head(url, {
      headers: { 'User-Agent': DY_UA },
      timeout: 15000,
      maxRedirects: 10,
      validateStatus: s => s < 500,
    });
    const finalUrl = res.request?.res?.responseUrl || res.config?.url || url;
    console.log('[DY] Final URL:', finalUrl.slice(0, 100));

    // 从最终 URL 提取 aweme_id
    const idMatch = finalUrl.match(/\/(?:share\/)?(?:video|note)\/(\d{15,25})/i)
      || finalUrl.match(/modal_id=(\d{15,25})/i);
    if (idMatch) {
      return { videoId: idMatch[1], finalUrl, type: finalUrl.includes('/note/') ? 'note' : 'video' };
    }

    // 数字提取兜底
    const numMatch = finalUrl.match(/(\d{15,25})/);
    if (numMatch) {
      return { videoId: numMatch[1], finalUrl, type: finalUrl.includes('note') ? 'note' : 'video' };
    }

    console.log('[DY] Could not extract ID from redirect URL');
    return null;
  } catch (e) {
    console.log('[DY] Short URL resolution failed:', e.message);
    // 如果 URL 已经是完整链接，直接提取
    const idMatch = url.match(/\/(?:video|note)\/(\d{15,25})/i) || url.match(/(\d{15,25})/);
    if (idMatch) {
      return { videoId: idMatch[1], finalUrl: url, type: url.includes('note') ? 'note' : 'video' };
    }
    return null;
  }
}

/**
 * 步骤2: 调用 www.douyin.com API 获取作品详情
 */
async function fetchDouyinApiDetail(awemeId) {
  const cookies = await getDyCookies();
  const queryParams = buildDouyinQueryParams(cookies.msToken);
  const xb = xbogus(queryParams, DY_UA);

  const apiUrl = `https://www.douyin.com/aweme/v1/web/aweme/detail/?${xb}`;

  console.log('[DY] Calling www.douyin.com API with X-Bogus...');

  try {
    const res = await axios.get(apiUrl, {
      params: { aweme_id: awemeId },
      headers: {
        'User-Agent': DY_UA,
        'Referer': 'https://www.douyin.com/?recommend=1',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cookie': cookies.ttwid ? `ttwid=${cookies.ttwid}` : '',
      },
      timeout: 15000,
      responseType: 'json',
      validateStatus: s => s < 500,
    });

    console.log('[DY] API status_code:', res.data?.status_code, 'keys:', Object.keys(res.data || {}).slice(0, 10).join(','));
    return res.data;
  } catch (e) {
    console.log('[DY] API call failed:', e.message);
    return null;
  }
}

/**
 * 步骤3: 从 aweme_detail 提取媒体信息
 */
function extractDouyinMedia(apiData) {
  if (!apiData) return null;

  const detail = apiData.aweme_detail;
  if (!detail) {
    console.log('[DY] No aweme_detail in response, status_code:', apiData.status_code);
    if (apiData.status_code === 2483) {
      console.log('[DY] Login required (status_code=2483)');
    }
    return null;
  }

  const author = detail.author || {};
  const authorName = author.nickname || 'unknown';
  const desc = detail.desc || '';

  // 判断类型：图集 vs 视频
  const images = detail.images || [];
  const video = detail.video || {};

  let type = 'video';
  let mediaUrls = [];
  let coverUrl = '';

  if (images.length > 0) {
    // 图文作品
    type = 'image';
    mediaUrls = images
      .map(img => {
        const urlList = img.url_list || img.urlList || [];
        return urlList.find(u => u.includes('large') || u.includes('origin')) || urlList[0] || '';
      })
      .filter(Boolean);
    console.log(`[DY] Note with ${mediaUrls.length} images`);
  } else if (video.play_addr) {
    // 视频作品
    type = 'video';
    const playUrls = video.play_addr.url_list || video.play_addr.urlList || [];
    mediaUrls = [playUrls.find(u => !u.includes('wm') && u.includes('video')) || playUrls[0] || ''].filter(Boolean);
    coverUrl = video.origin_cover?.url_list?.[0] || video.cover?.url_list?.[0] || '';
    console.log(`[DY] Video: ${mediaUrls.length} URLs, cover: ${coverUrl ? 'yes' : 'no'}`);
  } else {
    console.log('[DY] No media found in aweme_detail');
    return null;
  }

  return {
    type,
    title: `${authorName} 的作品`,
    author: authorName,
    desc,
    images: mediaUrls,
    cover: coverUrl,
    video: type === 'video' ? mediaUrls[0] : null,
    source_url: `https://www.douyin.com/${type === 'image' ? 'note' : 'video'}/${detail.aweme_id}`,
  };
}

/**
 * 步骤4: SSR 页面回退（当 API 失败时）
 */
async function fallbackToSSR(videoId, isNote) {
  const cookies = await getDyCookies();
  const pageType = isNote ? 'note' : 'video';
  const pageUrl = `https://www.douyin.com/${pageType}/${videoId}`;

  console.log(`[DY] SSR fallback: ${pageUrl}`);

  try {
    const res = await axios.get(pageUrl, {
      headers: {
        'User-Agent': DY_UA,
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cookie': cookies.ttwid ? `ttwid=${cookies.ttwid}` : '',
        'Referer': 'https://www.douyin.com/',
      },
      timeout: 15000,
      maxRedirects: 3,
      responseType: 'text',
      validateStatus: s => s < 500,
    });

    const html = typeof res.data === 'string' ? res.data : '';
    if (html.length < 1000) return null;

    // 提取 RENDER_DATA
    const renderMatch = html.match(/<script id="RENDER_DATA"[^>]*>(.*?)<\/script>/s);
    if (renderMatch) {
      try {
        const decoded = decodeURIComponent(renderMatch[1]);
        const data = JSON.parse(decoded);
        // 查找 aweme 数据
        for (const key of Object.keys(data)) {
          const item = data[key];
          if (item && item.awemeDetail) {
            return extractDouyinMedia({ aweme_detail: item.awemeDetail });
          }
        }
      } catch (e) {
        console.log('[DY] RENDER_DATA parse failed:', e.message);
      }
    }

    // 兜底：正则提取图片
    const allImages = [...new Set((html.match(/https?:\/\/[^"\'\s]+douyinpic\.com[^"\'\s]+\.(jpg|jpeg|png|webp)/gi) || []))];
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/"desc"\s*:\s*"([^"]+)"/);

    if (allImages.length > 0) {
      return {
        type: 'image',
        title: titleMatch?.[1] || '',
        author: '',
        desc: descMatch?.[1] || '',
        images: allImages.slice(0, 18),
        cover: allImages[0],
        source_url: pageUrl,
      };
    }

    console.log('[DY] SSR fallback: no RENDER_DATA or images found');
    return null;
  } catch (e) {
    console.log('[DY] SSR fallback failed:', e.message);
    return null;
  }
}

/**
 * 主解析入口
 */
async function parseDouyin(url) {
  console.log('[DY] ========== Douyin Parse Start ==========');
  console.log('[DY] Input URL:', url.slice(0, 120));

  // 步骤1: 短链重定向 → aweme_id
  const resolved = await resolveDouyinShortUrl(url);
  if (!resolved) {
    console.log('[DY] Failed to resolve short URL');
    return null;
  }

  const { videoId, finalUrl, type } = resolved;
  const isNote = type === 'note' || finalUrl.includes('/note/');
  console.log(`[DY] aweme_id=${videoId} type=${isNote ? 'note' : 'video'}`);

  // 步骤2: API 请求（www.douyin.com + X-Bogus + device fingerprint）
  let apiData = await fetchDouyinApiDetail(videoId);

  // 步骤3: 提取媒体
  let media = extractDouyinMedia(apiData);

  // 步骤4: API 失败时回退到 SSR
  if (!media) {
    console.log('[DY] API extraction failed, trying SSR fallback...');
    media = await fallbackToSSR(videoId, isNote);
  }

  if (media) {
    console.log(`[DY] SUCCESS: type=${media.type} images=${media.images?.length || 0} video=${media.video ? 'yes' : 'no'}`);
  } else {
    console.log('[DY] All methods failed');
  }

  return media;
}


// ==================== 微博解析 ====================

/**
 * 从微博 URL 中提取微博 ID (mid)
 * 支持格式:
 *   https://weibo.com/5230190006/5325419545888627  → uid=5230190006, mid=5325419545888627
 *   https://m.weibo.cn/detail/5325419545888627       → mid=5325419545888627
 *   https://weibo.com/5230190006/OxAbCdEfG          → 需要解码短码
 *   https://m.weibo.cn/status/5325419545888627       → mid=5325419545888627
 */
function extractWeiboId(url) {
  // 数字 mid（最常见格式）
  const numMatch = url.match(/weibo\.(?:com|cn)\/\d+\/(\d{10,20})/i)
    || url.match(/m\.weibo\.cn\/(?:detail|status)\/(\d{10,20})/i)
    || url.match(/weibo\.com\/\d+\/(\d{10,20})/i);
  if (numMatch) return { mid: numMatch[1] };

  // 短码 (如 OxAbCdEfG) — 需要 base62 解码
  const shortMatch = url.match(/weibo\.com\/\d+\/([A-Za-z0-9]{6,10})(?:\?|$|\/)/i);
  if (shortMatch) {
    const mid = base62Decode(shortMatch[1]);
    if (mid) return { mid };
  }

  return null;
}

/** 微博短码 base62 → 数字 mid */
function base62Decode(str) {
  const table = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = BigInt(0);
  for (let i = 0; i < str.length; i++) {
    const idx = table.indexOf(str[i]);
    if (idx === -1) return null;
    result = result * BigInt(62) + BigInt(idx);
  }
  return result.toString();
}

/**
 * 调用微博移动端 API 获取微博详情
 * API: GET https://m.weibo.cn/statuses/show?id={mid}
 * 返回 JSON，无需cookie
 */
async function fetchWeiboItemInfo(mid) {
  const apiUrl = `https://m.weibo.cn/statuses/show?id=${mid}`;

  console.log(`[WB] Calling API: mid=${mid}`);

  const res = await axios.get(apiUrl, {
    headers: {
      'User-Agent': MOBILE_UA,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://m.weibo.cn/',
      'Origin': 'https://m.weibo.cn',
      'X-Requested-With': 'XMLHttpRequest',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
    timeout: 15000,
    responseType: 'json',
  });

  return res.data;
}

/**
 * 解析微博 API 返回的 JSON
 */
function parseWeiboItemInfo(data) {
  // m.weibo.cn API 返回 data.data
  const status = data?.data || data;
  if (!status || (!status.text && !status.text_raw)) return null;

  // 纯文本：去除 HTML 标签
  const rawText = status.text_raw || status.text || '';
  const title = rawText.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  const author = status.user?.screen_name || '';

  const media = [];
  let cover = '';
  let videoUrl = '';
  const images = [];

  // --- 图文 ---
  const pics = status.pics || [];
  for (const pic of pics) {
    // 取高清原图：large.url → 替换为 mw2000
    let imgUrl = pic.large?.url || pic.url || pic.pid || '';
    if (imgUrl) {
      // 将 /large/ 替换为 /mw2000/ 获取最高清无水印版本
      imgUrl = imgUrl.replace(/\/large\//, '/mw2000/');
      images.push(imgUrl);
      media.push({ type: 'image', url: imgUrl, thumb: imgUrl });
    }
  }

  // --- 视频 ---
  const pageInfo = status.page_info || status.pageInfo || {};
  if (pageInfo && pageInfo.type === 'video') {
    const mediaInfo = pageInfo.media_info || pageInfo.mediaInfo || {};
    videoUrl = mediaInfo.mp4_hd_url
      || mediaInfo.mp4_720p_mp4
      || mediaInfo.stream_url_hd
      || mediaInfo.stream_url
      || '';
    cover = pageInfo.page_pic?.url || pageInfo.page_pic || status.original_pic || '';
    if (videoUrl) {
      media.push({ type: 'video', url: videoUrl, thumb: cover });
    }
  }

  // --- 原始图片（无pics但有original_pic） ---
  if (images.length === 0 && status.original_pic) {
    cover = status.original_pic;
    images.push(status.original_pic);
    media.push({ type: 'image', url: status.original_pic, thumb: status.original_pic });
  }

  // --- 转发的微博 ---
  let retweetedTitle = '';
  const retweeted = status.retweeted_status;
  if (retweeted) {
    retweetedTitle = (retweeted.text_raw || retweeted.text || '')
      .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    // 转发微博的图片
    const rPics = retweeted.pics || [];
    for (const pic of rPics) {
      let imgUrl = pic.large?.url || pic.url || pic.pid || '';
      if (imgUrl) {
        imgUrl = imgUrl.replace(/\/large\//, '/mw2000/');
        images.push(imgUrl);
        media.push({ type: 'image', url: imgUrl, thumb: imgUrl });
      }
    }
  }

  const description = retweetedTitle
    ? `${title}\n\n//@${retweeted.user?.screen_name || ''}: ${retweetedTitle}`
    : title;

  return {
    title,
    description,
    author,
    cover,
    video: videoUrl,
    images,
    type: videoUrl ? 'video' : (images.length > 0 ? 'image' : 'text'),
    media,
  };
}

/**
 * 微博主解析入口
 */
async function parseWeibo(url) {
  console.log(`[WB] Parsing: ${url.slice(0, 80)}`);

  // 1. 提取 ID
  const idInfo = extractWeiboId(url);
  if (!idInfo) {
    console.log('[WB] Could not extract Weibo ID from URL');
    return { title: '微博', description: '无法从链接中提取微博ID', author: '', cover: '', video: '', images: [], type: 'unknown', media: [] };
  }

  console.log(`[WB] Extracted mid: ${idInfo.mid}`);

  // 2. 调用移动端 API
  try {
    const apiData = await fetchWeiboItemInfo(idInfo.mid);
    const result = parseWeiboItemInfo(apiData);
    if (result) return result;
  } catch (e) {
    console.log('[WB] API call failed:', e.message);
  }

  // 3. fallback: 尝试 PC 端 Ajax API
  try {
    const pcUrl = `https://weibo.com/ajax/statuses/show?id=${idInfo.mid}`;
    console.log(`[WB] Trying PC API: ${pcUrl.slice(0, 60)}...`);
    const res = await axios.get(pcUrl, {
      headers: {
        'User-Agent': MOBILE_UA,
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://weibo.com/',
        'Cookie': 'SUB=_2AkMR; SUBP=0033WrSXqPxfM;',
      },
      timeout: 10000,
      responseType: 'json',
    });
    const result = parseWeiboItemInfo(res.data);
    if (result) return result;
  } catch (e) {
    console.log('[WB] PC API also failed:', e.message);
  }

  return {
    title: '微博',
    description: '获取内容失败，微博可能限制了访问。请确认链接无误后重试。',
    author: '',
    cover: '',
    video: '',
    images: [],
    type: 'unknown',
    media: [],
  };
}

// ==================== 通用解析 ====================
function parseGeneric(html) {
  const $ = cheerio.load(html);
  const media = [];
  let title = '', description = '', author = '';

  // JSON-LD
  const jsonLd = extractScriptJSON(html, 'application/ld+json', 'type');
  if (jsonLd) {
    title = jsonLd.headline || jsonLd.name || '';
    description = jsonLd.description || '';
    author = jsonLd.author?.name || '';
    if (jsonLd.image) {
      const imgs = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
      for (const img of imgs) {
        const u = typeof img === 'string' ? img : img.url || img.contentUrl || '';
        if (u) media.push({ type: 'image', url: u, thumb: u });
      }
    }
  }

  // OG
  if (!title) title = metaContent($, 'meta[property="og:title"]') || $('title').text().trim();
  if (!description) description = metaContent($, 'meta[property="og:description"]') || metaContent($, 'meta[name="description"]');

  // OG image
  if (media.length === 0) {
    const ogImg = metaContent($, 'meta[property="og:image"]');
    if (ogImg) media.push({ type: 'image', url: ogImg, thumb: ogImg });
  }

  // OG video
  const ogVideo = metaContent($, 'meta[property="og:video"]') || metaContent($, 'meta[property="og:video:url"]');
  if (ogVideo) media.push({ type: 'video', url: ogVideo, thumb: '' });

  // video 标签
  if (media.length === 0) {
    const v = $('video').first();
    if (v.length) {
      const src = v.attr('src') || v.find('source').attr('src') || '';
      if (src) media.push({ type: 'video', url: src, thumb: v.attr('poster') || '' });
    }
  }

  // fallback 图片
  if (media.length === 0) {
    $('img[src]').each((_, el) => {
      if (media.length >= 5) return false;
      const src = $(el).attr('src');
      if (src && !src.includes('data:') && !src.includes('icon') && !src.includes('logo')
        && !src.includes('avatar') && !src.includes('pixel')) {
        media.push({ type: 'image', url: src, thumb: src });
      }
    });
  }

  return { title, description, author, media };
}

// ==================== 辅助函数 ====================
function findDeep(obj, key) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj[key]) return obj[key];
  for (const k of Object.keys(obj)) {
    const found = findDeep(obj[k], key);
    if (found) return found;
  }
  return null;
}

function extractScriptJSON(html, key, matchBy = 'content') {
  if (matchBy === 'type') {
    const regex = new RegExp(`<script[^>]+type=["']${key.replace(/[+/]/g, '\\$&')}["'][^>]*>([\\s\\S]*?)</script>`, 'i');
    const match = html.match(regex);
    if (match) { try { return JSON.parse(match[1]); } catch {} }
    return null;
  }

  // 定位 key 的起始位置（优先精确匹配 `key = {` 模式）
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 查找最后一次出现的 key（通常最后一个是真实赋值）
  const keyRegex = new RegExp(`${escapedKey}\\s*=\\s*`, 'gi');
  let keyMatch, lastMatch;
  while ((keyMatch = keyRegex.exec(html)) !== null) { lastMatch = keyMatch; }
  if (!lastMatch) return null;

  const startIdx = lastMatch.index + lastMatch[0].length;
  const char = html[startIdx];
  if (char !== '{' && char !== '[') return null;

  // 括号计数法提取完整嵌套 JSON
  const openChar = char;
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0, inString = false, escape = false;
  for (let i = startIdx; i < html.length; i++) {
    const c = html[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"' || c === "'") { inString = !inString; continue; }
    if (inString) continue;
    if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) {
        const jsonStr = html.slice(startIdx, i + 1);
        // 清理 JS 字面量（undefined → null）
        const clean = jsonStr.replace(/\bundefined\b/g, 'null');
        try { return JSON.parse(clean); } catch { return null; }
      }
    }
  }
  return null;
}

// ==================== URL 提取 ====================
function extractUrls(text) {
  if (!text) return [];

  // 去掉常见前缀标记
  text = text.replace(/@(?:url|link|href)\s*[:：]\s*/gi, '');
  // 去掉反引号包裹
  text = text.replace(/`([^`]*https?:\/\/[^`]*)`/g, '$1');

  // 核心正则：匹配 http(s):// 开头，遇到空白或中文字符时停止
  const re = /https?:\/\/[^\s\u4e00-\u9fa5]+/gi;
  const matches = text.match(re);
  if (!matches) return [];

  // 清理尾部标点
  return matches.map(u =>
    u.replace(/[.,;!?)〉》】〉》'"\uFF0C\u3001\u3002\uFF1B\uFF01\uFF1F\uFF09\u3009\u300B\u300D\u3011\uFF3D\uFF5D]+$/, '')
  );
}

// ==================== Express Router ====================
const router = require('express').Router();

router.post('/parse', async (req, res) => {
  try {
    // 核心修复：不管前端传的是什么（纯 URL 还是带文字），统一从这里提取纯链接
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const extracted = extractUrls(bodyStr);
    if (!extracted.length) {
      return res.status(400).json({
        code: 400,
        success: false,
        error: '未检测到有效网址，请粘贴包含 http:// 或 https:// 的链接',
      });
    }
    // 取最长的 URL（避免截断片段）
    let url = extracted.reduce((a, b) => b.length > a.length ? b : a, extracted[0]);

    url = url.replace(/[.,;!?)〉》】〉》'"\uFF0C\u3001\u3002\uFF1B\uFF01\uFF1F\uFF09]+$/, '').trim();
    const platform = detectPlatform(url);
    console.log(`[Parse] ${url.slice(0, 100)} | Platform: ${platform}`);

    const { html, url: finalUrl } = await fetchPage(url, {
      mobile: ['xiaohongshu', 'douyin'].includes(platform),
    });

    let result;
    switch (platform) {
      case 'xiaohongshu': result = parseXiaohongshu(html); break;
      case 'douyin':
        result = await parseDouyin(url);
        break;
      case 'weibo':
        // 微博走独立异步流程（移动端 API 调用）
        result = await parseWeibo(url);
        break;
      default:           result = parseGeneric(html);
    }

    // 兼容旧格式：确保 media 存在
    if (!result.media) result.media = [];

    if (!result.title) result.title = `来自${platformLabel(platform)}的内容`;
    if (!result.description) result.description = result.title;

    // 构建响应：包含平台专用字段 (cover, video, images, type)
    res.json({
      code: 200,
      success: true,
      platform,
      url,
      title: result.title,
      description: result.description,
      author: result.author || '',
      // 新增：抖音/图文专用字段
      type: result.type || 'unknown',
      cover: result.cover || '',
      video: result.video || '',
      images: result.images || [],
      // 保持向后兼容
      media: (result.media || []).slice(0, 20),
    });
  } catch (err) {
    console.error('[Parse Error]', err.message);
    res.status(502).json({
      code: 400,
      success: false,
      error: '请求目标网址失败，请确认链接有效且可公开访问',
      message: err.message,
    });
  }
});

function platformLabel(p) {
  const map = { xiaohongshu: '小红书', douyin: '抖音', weibo: '微博', unknown: '网页' };
  return map[p] || '网页';
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== 图片代理（解决微博等图床防盗链 403） ====================
router.get('/proxy-image', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return res.status(400).json({ error: '缺少 url 参数' });
    }

    // 只允许已知图床域名
    const allowed = ['sinaimg.cn', 'weibocdn.com', 'xhscdn.com', 'pstatp.com', 'douyincdn.com',
      'douyin.com', 'douyinpic.com', 'ixigua.com', 'bytednsdoc.com', 'ibyteimg.com'];
    const host = new URL(imageUrl).hostname;
    if (!allowed.some(d => host.includes(d))) {
      return res.status(403).json({ error: '不支持的图片域名' });
    }

    console.log(`[ProxyImg] ${imageUrl.slice(0, 80)}`);

    const imgRes = await axios.get(imageUrl, {
      headers: {
        'User-Agent': MOBILE_UA,
        'Referer': { 'sinaimg.cn': 'https://weibo.com/', 'xhscdn.com': 'https://www.xiaohongshu.com/', 'pstatp.com': 'https://www.douyin.com/' }[host.split('.').slice(-2).join('.')] || '',
      },
      responseType: 'arraybuffer',
      timeout: 20000,
      validateStatus: s => s < 500,
    });

    const ct = imgRes.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(imgRes.data));
  } catch (e) {
    console.error('[ProxyImg Error]', e.message);
    res.status(502).json({ error: '图片代理失败' });
  }
});

// ==================== 视频代理（解决微博视频防盗链 403） ====================
router.get('/proxy-video', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl || !videoUrl.startsWith('http')) {
      return res.status(400).json({ error: '缺少 url 参数' });
    }

    console.log(`[ProxyVideo] ${videoUrl.slice(0, 80)}`);

    const imgRes = await axios.get(videoUrl, {
      headers: {
        'User-Agent': MOBILE_UA,
        'Referer': 'https://weibo.com/',
      },
      responseType: 'stream',
      timeout: 60000,
      validateStatus: s => s < 500,
    });

    const ct = imgRes.headers['content-type'] || 'video/mp4';
    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    res.setHeader('Access-Control-Allow-Origin', '*');
    imgRes.data.pipe(res);
  } catch (e) {
    console.error('[ProxyVideo Error]', e.message);
    res.status(502).json({ error: '视频代理失败' });
  }
});

// ==================== AI 抠图（已迁移至 remove-bg.js 独立模块） ====================

module.exports = router;

