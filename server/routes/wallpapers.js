const express = require('express');
const axios = require('axios');

const router = express.Router();
const BING_ENDPOINT = 'https://www.bing.com/HPImageArchive.aspx';
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function normalizeCount(value) {
  const count = Number.parseInt(value, 10);
  if (!Number.isFinite(count)) return 7;
  return Math.min(Math.max(count, 1), 7);
}

function normalizeMarket(value) {
  return typeof value === 'string' && /^[a-z]{2,3}-[A-Z]{2}$/.test(value)
    ? value
    : 'zh-CN';
}

function toImageUrl(item) {
  if (!item?.url) return '';
  return new URL(item.url, 'https://www.bing.com').toString();
}

function mapWallpaper(item) {
  return {
    startDate: item.startdate || '',
    endDate: item.enddate || '',
    title: item.title || '',
    copyright: item.copyright || '',
    copyrightLink: item.copyrightlink || '',
    imageUrl: toImageUrl(item),
  };
}

router.get('/wallpapers', async (req, res) => {
  const count = normalizeCount(req.query.count);
  const market = normalizeMarket(req.query.mkt);
  const cacheKey = `${market}:${count}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ items: cached.items, cached: true });
  }

  try {
    const response = await axios.get(BING_ENDPOINT, {
      params: { format: 'js', idx: 0, n: count, mkt: market },
      headers: {
        Accept: 'application/json',
        'User-Agent': 'proHub/1.0',
      },
      timeout: 10000,
      responseType: 'json',
    });

    const items = Array.isArray(response.data?.images)
      ? response.data.images.map(mapWallpaper).filter(item => item.imageUrl)
      : [];

    if (!items.length) {
      return res.status(502).json({ error: 'Bing 暂未返回可用壁纸' });
    }

    cache.set(cacheKey, { items, expiresAt: Date.now() + CACHE_TTL_MS });
    return res.json({ items, cached: false });
  } catch (error) {
    console.error('[wallpapers] Bing request failed:', error.message);
    return res.status(502).json({
      error: 'Bing 壁纸暂时不可用',
      message: error.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : error.message,
    });
  }
});

module.exports = router;
