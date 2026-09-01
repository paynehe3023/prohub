import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Notifications from '../views/Notifications.vue';
import AdminNotifications from '../views/AdminNotifications.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: 'proHub - 全能在线工具箱',
      description: 'proHub 全能工具箱 - 社交媒体无水印解析下载、文本处理、实用计算等一站式在线工具集合',
      keywords: 'proHub,工具箱,在线工具,无水印下载,小红书解析,微博解析,文本处理,在线计算',
    },
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: Notifications,
    meta: {
      title: '网页通知 - proHub',
      description: '查看 proHub 项目维护者发布的网页通知。',
      keywords: '通知,公告,proHub',
    },
  },
  {
    path: '/notifications/:id',
    name: 'NotificationDetail',
    component: Notifications,
    meta: {
      title: '通知详情 - proHub',
      description: 'proHub 通知详情。',
      keywords: '通知详情,proHub',
    },
  },
  {
    path: '/admin/notifications',
    name: 'AdminNotifications',
    component: AdminNotifications,
    meta: {
      title: '通知管理 - proHub',
      description: 'proHub 通知管理页面。',
      keywords: '通知管理,proHub',
    },
  },
  {
    path: '/clipboard/:roomId?',
    name: 'RealtimeClipboard',
    component: () => import('../views/tools/RealtimeClipboard.vue'),
    meta: {
      title: '网页极速剪贴板 - proHub',
      description: '免登录房间式剪贴板，支持文本、图片、文件跨端实时同步，二维码直达与阅后即焚自动清空。',
      keywords: '剪贴板,实时同步,跨端同步,二维码,图片同步,文件同步,Socket.io',
    },
  },
  {
    path: '/tools/media-downloader',
    name: 'MediaDownloader',
    component: () => import('../views/tools/MediaDownloader.vue'),
    meta: {
      title: '社交平台无水印解析下载 - proHub',
      description: '免费在线社交媒体无水印解析下载工具，支持小红书、微博链接解析，提取无水印原图/视频与文案',
      keywords: '无水印下载,小红书去水印,微博去水印,视频解析,图片下载,免费工具',
    },
  },
  {
    path: '/tools/photo-bg-changer',
    name: 'PhotoBgChanger',
    component: () => import('../views/tools/IdPhoto.vue'),
    meta: {
      title: '证件照一键换底 - proHub',
      description: 'AI 智能抠图换底，支持常用证件照底色，一键生成标准证件照',
      keywords: '证件照,换底,抠图,背景,照片,AI',
    },
  },
  {
    path: '/tools/cidr-calculator',
    name: 'CidrCalculator',
    component: () => import('../views/tools/CidrCalculator.vue'),
    meta: {
      title: 'CIDR 子网划分与重叠校验器 - proHub',
      description: '纯前端 CIDR 子网划分工具，支持多网段输入、重叠检测、可视化区间条和华为/Cisco ACL 导出。',
      keywords: 'CIDR,子网划分,重叠检测,IPv4,ACL,华为,Cisco,网络工具',
    },
  },
  {
    path: '/tools/color-palette',
    name: 'ColorPalette',
    component: () => import('../views/tools/ColorPalette.vue'),
    meta: {
      title: '调色板生成器 - proHub',
      description: '在线调色板生成器，支持多种配色方案、渐变预览和 CSS、JSON、Tailwind 导出。',
      keywords: '调色板,配色,渐变色,CSS,Tailwind,颜色工具',
    },
  },
  {
    path: '/tools/unit-converter',
    name: 'UnitConverter',
    component: () => import('../views/tools/UnitConverter.vue'),
    meta: {
      title: '全能单位换算 - proHub',
      description: '支持长度、重量、温度、面积、体积、速度、时间、数据存储和实时汇率的在线单位换算工具。',
      keywords: '单位换算,汇率,长度,重量,温度,面积,体积,速度,时间,数据存储',
    },
  },
  {
    path: '/tools/text-formatter',
    name: 'TextFormatter',
    component: () => import('../views/tools/TextFormatter.vue'),
    meta: {
      title: '文本格式化工具 - proHub',
      description: '支持 JSON 格式化、压缩、校验，Base64 与 URL 编解码，以及大小写和空白处理。',
      keywords: 'JSON格式化,Base64,URL编解码,大小写,空白处理,文本工具',
    },
  },
  {
    path: '/tools/image-studio',
    name: 'ImageStudio',
    component: () => import('../views/tools/ImageStudio.vue'),
    meta: {
      title: '全能极速图片处理工作台 - proHub',
      description: '纯前端图片压缩、尺寸裁剪、隐私水印、格式转换、长图拼接和九宫格工具。',
      keywords: '图片压缩,图片裁剪,水印,打码,格式转换,长图,九宫格,HEIC,WebP',
    },
  },
  {
    path: '/tools/media-studio',
    name: 'MediaStudio',
    component: () => import('../views/tools/MediaStudio.vue'),
    meta: {
      title: '自媒体全流程创作与安全工作台 - proHub',
      description: '自媒体全链路工具：灵感素材收集、DeepSeek AI 润色、违禁词合规清洗、防折叠实机预览与多平台格式分发。',
      keywords: '自媒体,小红书,抖音,公众号,AI润色,DeepSeek,违禁词,全网发布',
    },
  },
  {
    path: '/tools/video-extractor-studio',
    name: 'VideoExtractorStudio',
    component: () => import('../views/tools/VideoExtractorStudio.vue'),
    meta: {
      title: '视频提取工作台 - proHub',
      description: '本地预览视频并提取字幕、语音转录稿和背景音乐。',
      keywords: '视频提取,字幕提取,语音转录,BGM提取,视频工具',
    },
  },
  {
    path: '/pay-merge',
    name: 'PayMerge',
    component: () => import('../views/PayMerge.vue'),
    meta: {
      title: '聚合收款码 - proHub',
      description: '微信支付宝二合一聚合收款码，扫码自动识别付款环境',
      keywords: '聚合收款码,二维码合并,微信,支付宝',
    },
  },
  // 预留路由
  {
    path: '/tools/coming-soon',
    name: 'ComingSoon',
    component: () => import('../views/tools/ComingSoon.vue'),
    meta: {
      title: '即将上线 - proHub',
      description: '该工具正在开发中，敬请期待',
      keywords: '即将上线,proHub,工具箱',
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 返回上一页时恢复离开时的滚动位置（如从二级页返回主页时回到功能入口位置），
  // 进入新页面时回到顶部
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  },
});

// 空闲时预加载所有懒加载路由组件：
// 消除首次点击功能卡片进入二级页面时的 chunk 网络加载卡顿
function preloadLazyRoutes() {
  for (const record of router.getRoutes()) {
    const comp = record.components && record.components.default;
    if (typeof comp === 'function') {
      Promise.resolve(comp()).catch(() => {});
    }
  }
}

if (typeof window !== 'undefined') {
  const scheduleIdle = window.requestIdleCallback
    ? (cb) => window.requestIdleCallback(cb, { timeout: 5000 })
    : (cb) => window.setTimeout(cb, 2000);
  if (document.readyState === 'complete') {
    scheduleIdle(preloadLazyRoutes);
  } else {
    window.addEventListener('load', () => scheduleIdle(preloadLazyRoutes), { once: true });
  }
}

// 全局路由守卫：自动更新 Head meta
router.afterEach((to) => {
  // SEO meta 由 useHead 在各组件内动态更新
  // 此处做 fallback 设置
  if (to.meta.title) {
    document.title = to.meta.title;
  }
  const descTag = document.querySelector('meta[name="description"]');
  if (descTag && to.meta.description) {
    descTag.setAttribute('content', to.meta.description);
  }
  const kwTag = document.querySelector('meta[name="keywords"]');
  if (kwTag && to.meta.keywords) {
    kwTag.setAttribute('content', to.meta.keywords);
  }
});

export default router;
