import { useHead } from '@vueuse/head';
import { computed } from 'vue';

/**
 * SEO 组合式函数 — 动态注入 HTML Meta 标签
 * @param {Object|import('vue').Ref} meta - 包含 title, description, keywords 的对象
 */
export function useSEO(meta) {
  const seoMeta = computed(() => {
    const m = meta && meta.value ? meta.value : meta;
    return {
      title: m?.title || 'proHub - 全能工具箱',
      description: m?.description || 'proHub 全能工具箱 - 一站式在线工具集合',
      keywords: m?.keywords || '',
    };
  });

  useHead({
    title: seoMeta.value.title,
    meta: [
      { name: 'description', content: seoMeta.value.description },
      { name: 'keywords',    content: seoMeta.value.keywords },
      { property: 'og:title',       content: seoMeta.value.title },
      { property: 'og:description', content: seoMeta.value.description },
      { property: 'og:type',        content: 'website' },
      { name: 'twitter:card',        content: 'summary' },
      { name: 'twitter:title',       content: seoMeta.value.title },
      { name: 'twitter:description', content: seoMeta.value.description },
    ],
  });
}
