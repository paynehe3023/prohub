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
      keywords: 'proHub,工具箱,在线工具,无水印下载,抖音解析,小红书解析,微博解析,文本处理,在线计算',
    },
  },
  {
    path: '/tools/media-downloader',
    name: 'MediaDownloader',
    component: () => import('../views/tools/MediaDownloader.vue'),
    meta: {
      title: '社交平台无水印解析下载 - proHub',
      description: '免费在线社交媒体无水印解析下载工具，支持小红书、抖音、微博链接解析，提取无水印原图/视频与文案',
      keywords: '无水印下载,抖音去水印,小红书去水印,微博去水印,视频解析,图片下载,免费工具',
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
