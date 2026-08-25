<template>
  <!-- Hero 区域 -->
  <section class="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
    <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNjYmQ1ZTEiIGZpbGwtb3BhY2l0eT0iMC4wOCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
      <div class="text-center max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-sm font-medium mb-6">
          <IconSparkles class="w-4 h-4" />
          免费 · 开源 · 安全
        </div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
          你的<span class="bg-gradient-to-r from-brand-600 via-blue-500 to-brand-500 bg-clip-text text-transparent">全能工具箱</span>
        </h1>
        <p class="mt-6 text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed">
          社交媒体无水印解析 · 文本格式化 · 图片处理 · 实用计算<br/>
          一站解决，无需安装，即开即用
        </p>
        <div class="mt-8 flex items-center justify-center gap-4">
          <a href="#tools" class="px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5">
            开始使用
          </a>
          <a href="https://github.com/paynehe3023/prohub" target="_blank" rel="noopener" class="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:border-brand-300 dark:hover:border-brand-600 transition-all">
            <IconBrandGithub class="w-5 h-5 inline mr-1" />
            GitHub
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- 工具区域 -->
  <section id="tools" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <!-- 分类导航 -->
    <div class="flex flex-wrap items-center gap-2 mb-10">
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="activeCategory = cat.id"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeCategory === cat.id
          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600'"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 工具卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <ToolCard v-for="tool in filteredTools" :key="tool.id" :tool="tool" />
    </div>

    <!-- 空状态 -->
    <div v-if="filteredTools.length === 0" class="text-center py-20">
      <IconMoodEmpty class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
      <p class="text-gray-400 dark:text-gray-500">该分类下暂无工具</p>
    </div>
  </section>

  <!-- 特性横幅 -->
  <section class="bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
            <IconShieldCheck class="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-1">安全可靠</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">所有解析在服务端完成，保护你的隐私安全</p>
          </div>
        </div>
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <IconBolt class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-1">极速响应</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">智能 UA 池 + 并发请求，解析飞速完成</p>
          </div>
        </div>
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
            <IconDeviceMobile class="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-1">全端适配</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">响应式设计，PC / 平板 / 手机完美体验</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useHead } from '@vueuse/head';
import {
  IconSparkles,
  IconBrandGithub,
  IconMoodEmpty,
  IconShieldCheck,
  IconBolt,
  IconDeviceMobile,
} from '@tabler/icons-vue';
import { tools, categories, getToolsByCategory } from '../config/tools';
import ToolCard from '../components/ToolCard.vue';

// SEO
useHead({
  title: 'proHub - 全能在线工具箱',
  meta: [
    { name: 'description', content: 'proHub 全能工具箱 - 社交媒体无水印解析下载、文本处理、实用计算等一站式在线工具集合' },
    { name: 'keywords', content: 'proHub,工具箱,在线工具,无水印下载,抖音解析,小红书解析,微博解析,文本处理,在线计算' },
    { property: 'og:title', content: 'proHub - 全能在线工具箱' },
    { property: 'og:description', content: '一站式在线工具集合，社交媒体无水印解析、文本处理、实用计算' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ],
});

const activeCategory = ref('all');
const filteredTools = computed(() => getToolsByCategory(activeCategory.value));

// 保留 URL hash 导航
watch(activeCategory, (val) => {
  window.location.hash = val === 'all' ? 'tools' : `tools-${val}`;
});
</script>
