const axios = require('axios');
const cheerio = require('cheerio');
const { parseDouyin } = require('../parsers/douyin');

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

  if (/weibo\.com|weibo\.cn|t\.cn/i.test(url)) return 'weibo';

  if (/douyin\.com|iesdouyin\.com|v\.douyin\.com/i.test(url)) return 'douyin';
  return 'unknown';
}

// ==================== HTTP 请求 ====================
const PLATFORM_COOKIES = {
  weibo: 'SUB=_2AkMR; SUBP=0033WrSXqPxfM;',
  xiaohongshu: 'a1=18; webId=abc;',
  douyin: 'msToken=; ttwid=;',
};

async function fetchPage(url, opts = {}) {
  const ua = opts.mobile ? MOBILE_UA : randomUA();
  const platform = detectPlatform(url);
  const cookie = PLATFORM_COOKIES[platform] || '';
  const referer = opts.referer || {
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
      // 注意：|| 优先级高于 ? :，必须显式分组，否则会触发 "Cannot read properties of undefined (reading 'noteDetailMap')"
      let noteDetail;
      if (initState?.noteData?.data?.noteData) {
        noteDetail = initState.noteData.data.noteData;
      } else if (initState.note?.noteDetailMap) {
        const mapValues = Object.values(initState.note.noteDetailMap);
        noteDetail = mapValues[0]?.note;
      } else if (initState.noteData?.noteData) {
        // 另一种常见结构：noteData.noteData
        noteDetail = initState.noteData.noteData;
      } else if (initState.note?.noteDetail) {
        // 直接 noteDetail 对象
        noteDetail = initState.note.noteDetail;
      } else if (initState.currentNoteId && initState.note?.noteDetailMap?.[initState.currentNoteId]) {
        // 通过 currentNoteId 索引
        noteDetail = initState.note.noteDetailMap[initState.currentNoteId].note;
      }

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
          let imgUrl = img.urlDefault || img.url_default || img.url || img.infoList?.[0]?.url || img.info_list?.[0]?.url || '';
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
            || video.media?.video?.url
            || video.m3u8_url
            || video.url
            || '';
          if (vUrl) {
            media.push({ type: 'video', url: vUrl, thumb: video.image?.firstFrameFileid || video.cover?.urlDefault || video.cover?.url || video.firstFrameFileid || '' });
          }
        }
      }
    } catch (e) { console.log('[XHS] INIT_STATE error:', e.message); }
  }

  // 策略2: OG 标签
  if (!title) title = metaContent($, 'meta[property="og:title"]');
  if (!description) description = metaContent($, 'meta[property="og:description"]') || metaContent($, 'meta[name="description"]');

  // 策略 2.5: 从 meta[property="og:image"] 提取封面图
  if (media.length === 0) {
    const ogImg = metaContent($, 'meta[property="og:image"]');
    if (ogImg) {
      media.push({ type: 'image', url: ogImg.replace(/\?.*$/, ''), thumb: ogImg });
    }
  }

  // 策略 2.6: 从 link[rel="preload"][as="image"] 提取图片
  if (media.length === 0) {
    $('link[rel="preload"][as="image"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href && (href.includes('xhscdn') || href.includes('sns-img') || href.includes('sns-webpic'))) {
        media.push({ type: 'image', url: href.replace(/\?.*$/, ''), thumb: href });
      }
    });
  }

  // 策略3: 从 img 找 xhscdn/sns 图片（仅当策略1失败时）
  // 过滤掉头像：排除 /avatar/、尺寸 < 100px 的图片
  if (media.length === 0) {
    // 策略3.1: 从 picture > source 标签的 srcset 提取
    $('picture source[srcset]').each((_, el) => {
      const srcset = $(el).attr('srcset') || '';
      if (srcset && (srcset.includes('xhscdn') || srcset.includes('sns-img') || srcset.includes('sns-webpic'))) {
        const firstUrl = srcset.split(',')[0]?.trim().split(' ')[0] || '';
        if (firstUrl) {
          media.push({ type: 'image', url: firstUrl.replace(/\?.*$/, ''), thumb: firstUrl });
        }
      }
    });
  }
  if (media.length === 0) {
    // 策略3.2: 从 img 标签提取（扩展 ci.xiaohongshu.com 域名）
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (src && (src.includes('xhscdn') || src.includes('sns-img') || src.includes('sns-webpic') || src.includes('ci.xiaohongshu.com'))) {
        // 排除头像
        if (src.includes('avatar') || src.includes('/avatar/')) return;
        media.push({ type: 'image', url: src.replace(/\?.*$/, ''), thumb: src });
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
  const hasMediaPayload = status && (
    status.pics
    || status.pic_ids
    || status.pic_infos
    || status.picInfo
    || status.original_pic
    || status.page_info
    || status.retweeted_status
  );
  if (!status || (!status.text && !status.text_raw && !hasMediaPayload)) return null;

  // 纯文本：去除 HTML 标签
  const rawText = status.text_raw || status.text || '';
  const title = rawText.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  const author = status.user?.screen_name || '';

  const media = [];
  let cover = '';
  let videoUrl = '';
  const pageInfo = status.page_info || status.pageInfo || {};
  const images = collectWeiboImageUrls(status, pageInfo.type !== 'video');
  for (const imageUrl of images) {
    media.push({ type: 'image', url: imageUrl, thumb: imageUrl });
  }

  // --- 视频 ---
  if (pageInfo && pageInfo.type === 'video') {
    const mediaInfo = pageInfo.media_info || pageInfo.mediaInfo || {};
    // 优先无水印码流：swift_mp4_url / video_sources 中无 wm 标记的地址 / mp4_720p_mp4
    const videoSources = collectWeiboVideoUrls(mediaInfo.video_sources);
    const sourceCandidates = [
      mediaInfo.swift_mp4_url,
      ...videoSources,
      mediaInfo.mp4_720p_mp4,
      mediaInfo.mp4_hd_url,
      mediaInfo.stream_url_hd,
      mediaInfo.stream_url,
      mediaInfo.mp4_sd_url,
      mediaInfo.url,
    ].filter(Boolean).map((u) => normalizeWeiboVideoUrl(u));
    const uniqueUrls = Array.from(new Set(sourceCandidates));
    // 无水印优先：URL 含 /wm/ 或 watermark 的排后
    videoUrl = uniqueUrls.find((u) => !isWatermarkedWeiboUrl(u)) || uniqueUrls[0] || '';
    cover = pageInfo.page_pic?.url || pageInfo.page_pic || status.original_pic || '';
    if (videoUrl) {
      media.push({ type: 'video', url: videoUrl, thumb: cover });
    }
  }
  // --- 转发的微博 ---
  let retweetedTitle = '';
  const retweeted = status.retweeted_status;
  if (retweeted) {
    retweetedTitle = (retweeted.text_raw || retweeted.text || '')
      .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    const retweetedImages = collectWeiboImageUrls(retweeted, true);
    for (const imageUrl of retweetedImages) {
      if (!images.includes(imageUrl)) {
        images.push(imageUrl);
        media.push({ type: 'image', url: imageUrl, thumb: imageUrl });
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

function collectWeiboImageUrls(status, includeOriginalPic) {
  const imageUrls = [];
  const seen = new Set();
  const sources = [status, status?.mblog, status?.status].filter((value) => value && typeof value === 'object');

  for (const source of sources) {
    const infoMap = {};
    for (const key of ['pic_infos', 'picInfos', 'pic_info', 'picInfo']) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        Object.assign(infoMap, source[key]);
      }
    }

    const entries = [];
    for (const key of ['pics', 'pic_ids', 'picIds']) {
      const value = source[key];
      if (Array.isArray(value)) {
        value.forEach((pic, index) => entries.push({ key: String(index), pic }));
      } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([entryKey, pic]) => entries.push({ key: entryKey, pic }));
      }
    }
    Object.entries(infoMap).forEach(([key, pic]) => entries.push({ key, pic }));

    const handled = new Set();
    for (const entry of entries) {
      const pid = getWeiboPicId(entry.pic, entry.key);
      const info = (pid && infoMap[pid]) || {};
      const candidates = [
        getWeiboMediaUrl(info.original),
        getWeiboMediaUrl(info.largest),
        getWeiboMediaUrl(info.large),
        getWeiboMediaUrl(info.mw2000),
        getWeiboMediaUrl(entry.pic?.original),
        getWeiboMediaUrl(entry.pic?.largest),
        getWeiboMediaUrl(entry.pic?.large),
        getWeiboMediaUrl(entry.pic?.mw2000),
        getWeiboMediaUrl(entry.pic),
        getWeiboMediaUrl(entry.pic?.thumbnail_pic),
        getWeiboMediaUrl(entry.pic?.bmiddle),
        getWeiboMediaUrl(entry.pic?.thumbnail),
        typeof entry.pic === 'string' ? entry.pic : '',
      ];
      const referenceUrl = candidates.find((candidate) => /^https?:\/\//i.test(String(candidate || '')));
      if (pid && !referenceUrl && /^[\w-]+(?:\.[a-z0-9]+)?$/i.test(pid)) {
        candidates.push(`https://wx1.sinaimg.cn/large/${pid}${/\.[a-z0-9]+$/i.test(pid) ? '' : '.jpg'}`);
      }

      const normalizedCandidates = candidates.map(normalizeWeiboImageUrl).filter(Boolean);
      const imageUrl = normalizedCandidates.find((candidate) => !isWatermarkedWeiboUrl(candidate))
        || normalizedCandidates[0]
        || '';
      if (imageUrl && !handled.has(pid || imageUrl)) {
        handled.add(pid || imageUrl);
        if (!seen.has(imageUrl)) {
          seen.add(imageUrl);
          imageUrls.push(imageUrl);
        }
      }
    }

    if (includeOriginalPic) {
      const originalPic = normalizeWeiboImageUrl(source.original_pic || source.originalPic || '');
      if (originalPic && !seen.has(originalPic)) {
        seen.add(originalPic);
        imageUrls.push(originalPic);
      }
    }
  }

  return imageUrls;
}

function getWeiboPicId(pic, fallback) {
  if (typeof pic === 'string') return pic;
  return String(pic?.pid || pic?.pic_id || pic?.picId || pic?.id || fallback || '');
}

function getWeiboMediaUrl(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value.url || value.src || value.uri || value.contentUrl || '';
}

function normalizeWeiboImageUrl(value) {
  let imageUrl = String(value || '').trim();
  if (!imageUrl) return '';
  if (imageUrl.startsWith('//')) imageUrl = `https:${imageUrl}`;
  if (!/^https?:\/\//i.test(imageUrl)) return '';
  try {
    const parsed = new URL(imageUrl);
    parsed.hash = '';
    if (/sinaimg\.cn$/i.test(parsed.hostname)) parsed.search = '';
    return parsed.toString();
  } catch {
    return imageUrl;
  }
}

/**
 * 微博主解析入口
 */
function collectWeiboVideoUrls(value) {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectWeiboVideoUrls(item));
  if (typeof value !== 'object') return [];

  const urls = [
    value.url,
    value.url_1080p,
    value.url_720p,
    value.quality_url,
    value.mp4_url,
    value.mp4_hd_url,
    value.mp4_720p_mp4,
    value.swift_mp4_url,
  ].filter(Boolean);

  for (const [key, nested] of Object.entries(value)) {
    if (!urls.includes(nested) && (Array.isArray(nested) || (nested && typeof nested === 'object'))) {
      urls.push(...collectWeiboVideoUrls(nested));
    }
  }
  return urls;
}

/**
 * 微博视频 URL 归一化：确保 https、补齐域名、清理空白与非法字符
 */
function normalizeWeiboVideoUrl(value) {
  let url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('//')) url = 'https:' + url;
  if (!/^https?:\/\//i.test(url)) return '';
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * 判断是否是水印版本微博视频 URL
 */
function isWatermarkedWeiboUrl(url) {
  return /\/wm\/|\bwm\b|watermark|mark_|_wm\.mp4|watermarked/i.test(url);
}

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

  // 清理尾部标点/括号/引号（JSON 结尾、Markdown 链接等）
  // 多轮清理，直到没有可去掉的尾部字符为止
  const dirtyChars = /[.,;!?)\]}>"'\uFF0C\u3001\u3002\uFF1B\uFF01\uFF1F\uFF09\u3009\u300B\u300D\u3011\uFF3D\uFF5D]+$/;
  return matches.map(u => {
    let prev;
    do {
      prev = u;
      u = u.replace(dirtyChars, '');
    } while (u !== prev);
    return u;
  });
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
      case 'weibo':
        // 微博走独立异步流程（移动端 API 调用）
        result = await parseWeibo(url);
        break;
      case 'douyin':
        // 抖音 Playwright 解析（绕过 WAF）
        result = await parseDouyin(url);
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
  const map = { xiaohongshu: '小红书', weibo: '微博', douyin: '抖音', unknown: '网页' };
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
    const allowed = ['sinaimg.cn', 'weibocdn.com', 'xhscdn.com', 'douyinpic.com', 'douyincdn.com', 'douyinvod.com', 'pstatp.com', 'bytedance.com', 'zjcdn.com', 'bytecdn.com', 'douyinstatic.com', 'ixigua.com', 'bytednsdoc.com', 'ibyteimg.com'];
    const host = new URL(imageUrl).hostname;
    if (!allowed.some(d => host.includes(d))) {
      return res.status(403).json({ error: '不支持的图片域名' });
    }

    console.log(`[ProxyImg] ${imageUrl.slice(0, 80)}`);

    const imgRes = await axios.get(imageUrl, {
      headers: {
        'User-Agent': MOBILE_UA,
        'Referer': { 'sinaimg.cn': 'https://weibo.com/', 'xhscdn.com': 'https://www.xiaohongshu.com/' }[host.split('.').slice(-2).join('.')] || '',
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
// 关键技术点：
// 1. 转发客户端 Range 头并透传 206/Content-Range/Accept-Ranges，否则 <video> 无法 seek/播放
// 2. 关闭 axios 自动解压（视频流不应被 gzip 二次包装，否则播放器解码失败）
// 3. 透传 Content-Type / Content-Length 等关键响应头
router.get('/proxy-video', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl || !videoUrl.startsWith('http')) {
      return res.status(400).json({ error: '缺少 url 参数' });
    }

    const range = req.headers.range;
    console.log(`[ProxyVideo] ${videoUrl.slice(0, 80)} | Range: ${range || 'none'}`);

    const upstreamHeaders = {
      'User-Agent': MOBILE_UA,
      'Referer': 'https://weibo.com/',
      'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'identity',
    };
    if (range) upstreamHeaders['Range'] = range;

    const upRes = await axios.get(videoUrl, {
      headers: upstreamHeaders,
      responseType: 'stream',
      timeout: 120000,
      maxRedirects: 6,
      validateStatus: s => s < 400,
      decompress: false,
    });

    const upstream = upRes.data;
    if (!upstream) {
      return res.status(502).json({ error: '上游无数据' });
    }

    const ct = upRes.headers['content-type'] || 'video/mp4';
    const cl = upRes.headers['content-length'];
    const cr = upRes.headers['content-range'];
    const ar = upRes.headers['accept-ranges'];
    const status = upRes.status || 200;

    res.status(status);
    res.setHeader('Content-Type', ct);
    res.setHeader('Accept-Ranges', ar || 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    if (cl) res.setHeader('Content-Length', cl);
    if (cr) res.setHeader('Content-Range', cr);
    if (status === 200) res.setHeader('Content-Disposition', 'inline; filename="video.mp4"');

    upstream.on('error', (err) => {
      console.error('[ProxyVideo Stream Error]', err.message);
      if (!res.headersSent) res.status(502).json({ error: '视频流传输中断' });
      else res.end();
    });
    res.on('close', () => {
      if (!res.writableEnded && typeof upstream.destroy === 'function') upstream.destroy();
    });
    upstream.pipe(res);
  } catch (e) {
    console.error('[ProxyVideo Error]', e.message);
    if (!res.headersSent) res.status(502).json({ error: '视频代理失败' });
    else res.end();
  }
});
// ==================== AI 抠图（已迁移至 remove-bg.js 独立模块） ====================

module.exports = router;


