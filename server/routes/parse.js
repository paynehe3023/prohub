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
      const noteDetail = initState?.note?.noteDetailMap
        ? Object.values(initState.note.noteDetailMap)[0]?.note
        : initState?.note;
      if (noteDetail) {
        title = noteDetail.title || noteDetail.displayTitle || '';
        description = noteDetail.desc || noteDetail.description || '';
        author = noteDetail.user?.nickname || noteDetail.user?.nickName || '';

        const imageList = noteDetail.imageList || noteDetail.image_list || [];
        for (const img of imageList) {
          let imgUrl = img.urlDefault || img.url_default || img.url || img.infoList?.[0]?.url || '';
          if (imgUrl) {
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

  // 策略3: 从 img 找 xhscdn/sns 图片
  if (media.length === 0) {
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (src && (src.includes('xhscdn') || src.includes('sns-img') || src.includes('sns-webpic'))) {
        media.push({ type: 'image', url: src.replace(/\?.*$/, ''), thumb: src });
      }
    });
  }

  return { title, description, author, media };
}

// ==================== 抖音解析 ====================

/**
 * 步骤1: 解析短链 → 跟随 302 重定向 → 提取视频 ID
 * v.douyin.com/xxxxx → https://www.douyin.com/video/7123456789012345678
 */
async function resolveDouyinShortLink(shortUrl) {
  try {
    const res = await axios.get(shortUrl, {
      headers: {
        'User-Agent': MOBILE_UA,
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      maxRedirects: 0,
      timeout: 10000,
      validateStatus: s => s === 301 || s === 302 || s === 307 || s === 308,
    });

    const location = res.headers['location'] || '';
    console.log(`[DY] Short link resolved: ${shortUrl.slice(0, 40)} → ${location.slice(0, 60)}`);

    // 从重定向 URL 提取 video ID
    // 格式: https://www.douyin.com/video/7123456789012345678
    //     或 https://www.douyin.com/note/7123456789012345678 (图集)
    const idMatch = location.match(/\/(?:video|note)\/(\d+)/i)
      || location.match(/modal_id=(\d+)/i)
      || location.match(/video\/(\d+)/i);

    if (idMatch) {
      return { videoId: idMatch[1], redirectUrl: location };
    }

    // fallback: 尝试从路径提取任意数字ID
    const numMatch = location.match(/(\d{15,20})/);
    if (numMatch) {
      return { videoId: numMatch[1], redirectUrl: location };
    }

    console.log('[DY] Could not extract video ID from:', location);
    return null;
  } catch (e) {
    console.log('[DY] Short link resolution failed:', e.message);
    return null;
  }
}

/**
 * 步骤2: 调用抖音官方 API 获取作品详情
 * POST https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=xxx
 */
async function fetchDouyinItemInfo(videoId) {
  const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`;

  console.log(`[DY] Calling API: item_ids=${videoId}`);

  const res = await axios.get(apiUrl, {
    headers: {
      'User-Agent': MOBILE_UA,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://www.douyin.com/',
      'Origin': 'https://www.douyin.com',
      'Cookie': 'odin_tt=1; passport_csrf_token=1;',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
    },
    timeout: 15000,
    responseType: 'json',
  });

  return res.data;
}

/**
 * 步骤3: 解析 API 返回数据 → 提取标题、封面、无水印视频/图片
 */
function parseDouyinItemInfo(data) {
  const items = data?.item_list || [];
  if (!items.length) {
    console.log('[DY] API returned no items');
    return null;
  }

  const item = items[0];
  const title = item.desc || '';
  const author = item.author?.nickname || '';

  // 提取封面
  const coverUrl = item.video?.cover?.url_list?.[0]
    || item.video?.origin_cover?.url_list?.[0]
    || '';

  const result = {
    title,
    description: title,
    author,
    cover: coverUrl,
    video: '',
    images: [],
    type: 'video',
    media: [],
  };

  // --- 视频处理 ---
  if (item.video && item.video.play_addr) {
    result.type = 'video';

    // 无水印处理: play_addr 里的 URL 把 playwm 替换为 play
    let videoUrl = item.video.play_addr.url_list?.[0] || '';
    if (videoUrl) {
      // 关键: 替换 playwm → play 获取无水印1080P直链
      videoUrl = videoUrl.replace(/playwm/g, 'play');
    }

    // fallback: 尝试 download_addr（可能有水印）
    if (!videoUrl) {
      videoUrl = item.video.download_addr?.url_list?.[0] || '';
    }

    result.video = videoUrl;
    if (videoUrl) {
      result.media.push({ type: 'video', url: videoUrl, thumb: coverUrl });
    }
  }

  // --- 图文处理 ---
  const images = item.images || [];
  if (images.length > 0) {
    result.type = 'image';
    for (const img of images) {
      const imgUrl = img.url_list?.[0] || img.urlList?.[0] || '';
      if (imgUrl) {
        result.images.push(imgUrl);
        result.media.push({ type: 'image', url: imgUrl, thumb: imgUrl });
      }
    }
  }

  return result;
}

/**
 * 主解析入口: 综合调度
 */
async function parseDouyin(url) {
  console.log(`[DY] Parsing: ${url.slice(0, 80)}`);

  let videoId = null;

  // 1. 尝试直接从 URL 提取 video ID
  const directId = url.match(/\/video\/(\d+)/i) || url.match(/\/note\/(\d+)/i);
  if (directId) {
    videoId = directId[1];
    console.log(`[DY] Direct video ID from URL: ${videoId}`);
  }

  // 2. 如果是短链，先解析重定向
  if (!videoId && /v\.douyin\.com/i.test(url)) {
    const resolved = await resolveDouyinShortLink(url);
    if (resolved) {
      videoId = resolved.videoId;
      url = resolved.redirectUrl; // 更新为实际 URL
    }
  }

  // 3. 如果是 HTML 页面（非短链），尝试从页面内容提取 ID
  if (!videoId) {
    try {
      const { html } = await fetchPage(url, { mobile: true });
      // 从 HTML 中搜 video ID
      const idMatch = html.match(/video\/(\d{15,20})/i) || html.match(/"item_id"\s*:\s*"?(\d{15,20})/i);
      if (idMatch) {
        videoId = idMatch[1];
        console.log(`[DY] Video ID extracted from HTML: ${videoId}`);
      }
    } catch (e) {
      console.log('[DY] HTML fetch for ID extraction failed:', e.message);
    }
  }

  // 4. 调用 API 获取数据
  if (videoId) {
    try {
      const apiData = await fetchDouyinItemInfo(videoId);
      const result = parseDouyinItemInfo(apiData);
      if (result) return result;
    } catch (e) {
      console.log('[DY] API call failed:', e.message);
    }
  }

  // 5. fallback: 用页面 HTML 的 OG 标签兜底
  try {
    const { html } = await fetchPage(url, { mobile: true });
    const $ = cheerio.load(html);
    const title = metaContent($, 'meta[property="og:title"]') || $('title').text().trim() || '';
    const description = metaContent($, 'meta[property="og:description"]') || metaContent($, 'meta[name="description"]') || '';
    const ogImg = metaContent($, 'meta[property="og:image"]');
    const media = [];
    if (ogImg) media.push({ type: 'image', url: ogImg, thumb: ogImg });

    return {
      title,
      description,
      author: '',
      cover: ogImg,
      video: '',
      images: ogImg ? [ogImg] : [],
      type: 'unknown',
      media,
    };
  } catch (e) {
    console.log('[DY] Fallback failed:', e.message);
  }

  // 6. 彻底失败
  return {
    title: '抖音视频',
    description: '无法获取内容（平台可能限制了访问，请尝试复制纯链接）',
    author: '',
    cover: '',
    video: '',
    images: [],
    type: 'unknown',
    media: [],
  };
}

// ==================== 微博解析 ====================
function parseWeibo(html) {
  const $ = cheerio.load(html);
  const media = [];
  let title = '', description = '', author = '';

  // 策略1: $render_data
  const renderData = extractScriptJSON(html, '$render_data');
  if (renderData) {
    try {
      const status = renderData.status || renderData;
      title = (status.text_raw || status.text || '').replace(/<[^>]+>/g, '');
      description = title;
      author = status.user?.screen_name || '';

      const pics = status.pics || status.pic_ids || [];
      for (const pic of pics) {
        const picUrl = typeof pic === 'string' ? pic : (pic.large?.url || pic.url || pic.pid || '');
        if (picUrl) media.push({ type: 'image', url: picUrl, thumb: picUrl });
      }

      const pageInfo = status.page_info || status.pageInfo || {};
      const vidUrl = pageInfo.media_info?.stream_url_hd
        || pageInfo.media_info?.stream_url
        || pageInfo.media_info?.mp4_720p_mp4
        || '';
      if (vidUrl) {
        media.push({ type: 'video', url: vidUrl, thumb: pageInfo.page_pic?.url || pageInfo.page_pic || '' });
      }
    } catch (e) { console.log('[WB] render_data error:', e.message); }
  }

  // 策略2: 直接从 HTML 正则匹配 sinaimg.cn 图片
  if (media.length === 0) {
    const re = /https?:\/\/[a-zA-Z0-9.-]+\.sinaimg\.cn\/(large|mw\d+|orj\/[a-zA-Z0-9]+)\/[a-zA-Z0-9]+\.[a-z]+/gi;
    const matches = html.match(re) || [];
    for (const u of matches) {
      if (!media.find(m => m.url === u)) {
        media.push({ type: 'image', url: u, thumb: u });
      }
    }
  }

  // 策略3: OG / meta
  if (!title) title = metaContent($, 'meta[property="og:title"]') || $('title').text().trim();
  if (!description) {
    description = metaContent($, 'meta[property="og:description"]')
      || metaContent($, 'meta[name="description"]')
      || title;
  }

  // 策略4: img[src*="sinaimg"]
  if (media.length === 0) {
    $('img[src*="sinaimg"]').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (src && !src.includes('icon')) media.push({ type: 'image', url: src, thumb: src });
    });
  }

  return { title, description, author, media };
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
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`${escapedKey}\\s*=\\s*(\\{[\\s\\S]*?\\});`, 'i'),
    new RegExp(`${escapedKey}\\s*:\\s*(\\{[\\s\\S]*?\\})\\s*[,;\\n]`, 'i'),
    new RegExp(`${escapedKey}\\s*=\\s*(\\{[\\s\\S]*?\\})\\s*<`, 'i'),
    new RegExp(`${escapedKey}\\s*=\\s*(\\{[\\s\\S]*?\\})\\s*</script>`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) { try { return JSON.parse(m[1]); } catch {} }
  }
  return null;
}

// ==================== URL 提取（修复版：中文标点边界） ====================
function extractUrls(text) {
  if (!text) return [];

  // 去掉常见前缀标记
  text = text.replace(/@(?:url|link|href)\s*[:：]\s*/gi, '');
  // 去掉反引号包裹
  text = text.replace(/`([^`]*https?:\/\/[^`]*)`/g, '$1');

  // URL 字符集：在以下字符处停止匹配
  // 英文标点: < > " { } | \ ^ ` [ ]
  // 中文标点: 【 】 《 》 「 」 （ ） ｛ ｝ ， 。 ！ ？ ； ： 、 " " ' '
  const stopChars = '\\s<>"{}|\\\\^`\\[\\]' +
    '\u3000-\u303F\uFF00-\uFFEF\u2018\u2019\u201C\u201D\u2014\u2026' +
    '\u3001\u3002\uFF0C\uFF0E\uFF1B\uFF1A\uFF1F\uFF01' +
    '\u300A\u300B\u3008\u3009\u3010\u3011' +
    '\uFF08\uFF09\uFF3B\uFF3D\uFF5B\uFF5D' +
    '\u2018\u2019\u201C\u201D';
  const re = new RegExp(`https?://[^${stopChars}]+`, 'gi');
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
        // 抖音走独立异步流程（短链追踪 + API 调用）
        result = await parseDouyin(url);
        break;
      case 'weibo':      result = parseWeibo(html); break;
      default:           result = parseGeneric(html);
    }

    // 兼容旧格式：确保 media 存在
    if (!result.media) result.media = [];

    if (!result.title) result.title = `来自${platformLabel(platform)}的内容`;
    if (!result.description) result.description = result.title;

    // 构建响应：包含平台专用字段 (cover, video, images, type)
    res.json({
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

module.exports = router;
