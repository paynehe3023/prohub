/**
 * 共享：无水印 URL 检测与择优工具。
 * 被 parse.js / douyin.js 两端复用，避免 parse.js <-> douyin.js 的循环依赖。
 */

const WATERMARK_IMAGE_HINTS = /water-v2|water_v2|\/wm\/|\bwm[=\/]|wm_video|wm_image|_wm_|logo_mask|mask_logo|mark_image|_wm\.|\.wm\.|sinaimg\.cn.*wm\./i;
const WATERMARK_VIDEO_HINTS = /water-v2|water_v2|\/wm\/|\bwm_video\b|play_wm|wm-play|_wm\.mp4|watermarked|wm_h264|video_wm|_wm_url|download_suffix_logo_addr|logo_name=aweme_dark/i;

/**
 * 解析 watermark 查询参数值：watermark=0/false/no 表示无水印；=1/true/yes 表示有水印
 */
function watermarkQueryValue(u) {
  try {
    const v = u.searchParams.get('watermark');
    if (v == null) return null;
    return /^(0|false|no|none)$/i.test(v) ? false : true;
  } catch {
    return null;
  }
}

function isWatermarkedImageUrl(url) {
  if (!url) return false;
  let u = null;
  try { u = new URL(url); } catch { u = null; }
  if (u) {
    // watermark=0/false -> 显式无水印
    const wq = watermarkQueryValue(u);
    if (wq === false) return false;
    if (wq === true) return true;
    const hay = `${u.hostname}${u.pathname}${u.search}`;
    if (WATERMARK_IMAGE_HINTS.test(hay)) return true;
    if (/\/wm_images?\//i.test(u.pathname)) return true;
    return false;
  }
  // 非 URL 字符串：先排除 watermark=0
  const s = String(url);
  if (/watermark\s*=\s*(0|false|no|none)/i.test(s)) return false;
  if (/watermark\s*=\s*(1|true|yes)/i.test(s)) return true;
  return WATERMARK_IMAGE_HINTS.test(s);
}

function isWatermarkedVideoUrl(url) {
  if (!url) return false;
  let u = null;
  try { u = new URL(url); } catch { u = null; }
  if (u) {
    const wq = watermarkQueryValue(u);
    if (wq === false) return false;
    if (wq === true) return true;
    const hay = `${u.hostname}${u.pathname}${u.search}`;
    if (WATERMARK_VIDEO_HINTS.test(hay) || WATERMARK_IMAGE_HINTS.test(hay)) return true;
    return false;
  }
  const s = String(url);
  if (/watermark\s*=\s*(0|false|no|none)/i.test(s)) return false;
  if (/watermark\s*=\s*(1|true|yes)/i.test(s)) return true;
  return WATERMARK_VIDEO_HINTS.test(s) || WATERMARK_IMAGE_HINTS.test(s);
}

/**
 * @param {unknown[]} candidates
 * @param {'image'|'video'} kind
 * @returns {string}
 */
function pickNoWatermark(candidates, kind = 'image') {
  const list = Array.isArray(candidates)
    ? candidates.filter((x) => typeof x === 'string' && x.trim().length > 0)
    : [];
  if (list.length === 0) return '';
  const isWm = kind === 'video' ? isWatermarkedVideoUrl : isWatermarkedImageUrl;
  return list.find((u) => !isWm(u)) || list[0];
}

/**
 * 严格判断：传入的整批 URL 全部都不是水印版本才算 true。
 * 空数组返回 false，避免“无任何媒体但 noWatermark=true”的误报。
 */
function allNoWatermark(items, kind = 'image') {
  if (!Array.isArray(items) || items.length === 0) return false;
  const isWm = kind === 'video' ? isWatermarkedVideoUrl : isWatermarkedImageUrl;
  return items.every((u) => !isWm(u));
}

module.exports = {
  isWatermarkedImageUrl,
  isWatermarkedVideoUrl,
  pickNoWatermark,
  allNoWatermark,
};
