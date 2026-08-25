import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';

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
  scrollBehavior() {
    return { top: 0 };
  },
});

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
