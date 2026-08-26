const express = require('express');

const router = express.Router();

// 内置基础违禁/限流词库（前端会先使用此列表，再通过热更新合并）
// 来源：小红书/抖音/公众号平台常见限流词与《广告法》绝对化用语
const DEFAULT_WORDS = [
  { word: '最', platforms: ['小红书', '抖音', '公众号'], replacement: '非常' },
  { word: '第一', platforms: ['小红书', '抖音', '公众号'], replacement: '首选' },
  { word: '国家级', platforms: ['小红书', '抖音', '公众号'], replacement: '专业级' },
  { word: '世界级', platforms: ['小红书', '抖音', '公众号'], replacement: '行业领先' },
  { word: '顶级', platforms: ['小红书', '抖音', '公众号'], replacement: '优质' },
  { word: '极致', platforms: ['小红书', '抖音', '公众号'], replacement: '很不错' },
  { word: '绝对', platforms: ['小红书', '抖音', '公众号'], replacement: '一定' },
  { word: '永久', platforms: ['小红书', '抖音', '公众号'], replacement: '长期' },
  { word: '全网', platforms: ['小红书', '抖音', '公众号'], replacement: '平台内' },
  { word: '销量第一', platforms: ['小红书', '抖音', '公众号'], replacement: '口碑不错' },
  { word: '全网最低', platforms: ['小红书', '抖音', '公众号'], replacement: '性价比高' },
  { word: '100%', platforms: ['小红书', '抖音', '公众号'], replacement: '绝大多数' },
  { word: '立即见效', platforms: ['小红书', '抖音', '公众号'], replacement: '坚持使用' },
  { word: '保证不反弹', platforms: ['小红书', '抖音', '公众号'], replacement: '规律使用' },
  { word: '加微信', platforms: ['小红书', '抖音'], replacement: '私信我' },
  { word: 'vx', platforms: ['小红书', '抖音'], replacement: '主页沟通' },
  { word: '微信', platforms: ['小红书', '抖音'], replacement: '私下交流' },
  { word: '公众号', platforms: ['小红书', '抖音'], replacement: '主页' },
  { word: '点击链接', platforms: ['小红书', '抖音'], replacement: '看主页' },
  { word: '刷单', platforms: ['小红书', '抖音', '公众号'], replacement: '兼职合作' },
  { word: '兼职日结', platforms: ['小红书', '抖音'], replacement: '灵活用工' },
  { word: '转账', platforms: ['小红书', '抖音'], replacement: '资金往来' },
  { word: '免费领取', platforms: ['小红书', '抖音', '公众号'], replacement: '限时体验' },
  { word: '抽奖', platforms: ['小红书', '抖音'], replacement: '互动活动' },
  { word: '转发抽奖', platforms: ['小红书', '抖音'], replacement: '参与活动' },
  { word: '内幕', platforms: ['小红书', '抖音', '公众号'], replacement: '行业观察' },
  { word: '揭秘', platforms: ['小红书', '抖音', '公众号'], replacement: '分享' },
  { word: '赚钱', platforms: ['小红书', '抖音'], replacement: '增加收入' },
  { word: '暴富', platforms: ['小红书', '抖音', '公众号'], replacement: '稳步提升' },
  { word: '躺着赚', platforms: ['小红书', '抖音'], replacement: '轻松做' },
  { word: '躺赚', platforms: ['小红书', '抖音'], replacement: '轻松做' },
  { word: '稳赚不赔', platforms: ['小红书', '抖音', '公众号'], replacement: '相对稳健' },
  { word: '必看', platforms: ['小红书', '抖音', '公众号'], replacement: '值得看' },
  { word: '不看后悔', platforms: ['小红书', '抖音', '公众号'], replacement: '建议收藏' },
  { word: '震惊', platforms: ['小红书', '抖音', '公众号'], replacement: '没想到' },
  { word: '吓人', platforms: ['小红书', '抖音', '公众号'], replacement: '出乎意料' },
  { word: '包治百病', platforms: ['小红书', '抖音', '公众号'], replacement: '辅助改善' },
  { word: '治疗', platforms: ['小红书', '抖音', '公众号'], replacement: '改善' },
  { word: '药到病除', platforms: ['小红书', '抖音'], replacement: '针对性改善' },
  { word: '保证疗效', platforms: ['小红书', '抖音'], replacement: '坚持体验' },
  { word: '官方指定', platforms: ['小红书', '抖音', '公众号'], replacement: '官方合作' },
  { word: '政府指定', platforms: ['小红书', '抖音', '公众号'], replacement: '权威背书' },
  { word: '唯一', platforms: ['小红书', '抖音', '公众号'], replacement: '主打' },
  { word: '独一无二', platforms: ['小红书', '抖音', '公众号'], replacement: '很有特色' },
  { word: '史无前例', platforms: ['小红书', '抖音', '公众号'], replacement: '很有突破' },
  { word: '前无古人', platforms: ['小红书', '抖音', '公众号'], replacement: '很有创新' },
];

router.get('/forbidden-words', (_req, res) => {
  res.json({ ok: true, words: DEFAULT_WORDS, source: 'server' });
});

module.exports = router;