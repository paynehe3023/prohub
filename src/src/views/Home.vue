<template>
  <div class="theme-page">
  <section class="relative pt-14 pb-16 md:pt-16 md:pb-20">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-[1]">
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass-inset text-[0.8125rem] font-medium text-slate-700 dark:text-zinc-200 text-glass-sm mb-6 tracking-[-0.01em]">
        <IconSparkles class="w-3.5 h-3.5 text-ios-blue" /> 免费 · 开源 · 安全
      </div>
      <h1 class="text-4xl md:text-6xl lg:text-7xl font-extrabold text-slate-950 dark:text-white leading-[1.05] tracking-[-0.03em] text-glass">
        你的<span class="text-ios-blue">全能工具箱</span>
      </h1>
      <p class="mt-5 text-base md:text-lg text-slate-600 dark:text-zinc-300 leading-relaxed tracking-[-0.01em] max-w-xl mx-auto text-glass-sm">
        社交媒体无水印解析 · 文本处理 · 图片工具 · 实用计算<br/>
        一站解决，无需安装，即开即用
      </p>

      <div class="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          @click="openAbout"
          class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-500 active:scale-95"
        >
          关于
        </button>
        <a href="https://github.com/paynehe3023/prohub" target="_blank" rel="noopener" class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-zinc-200 dark:hover:bg-slate-700">
          <IconBrandGithub class="w-4 h-4" /> GitHub
        </a>
      </div>
    </div>
  </section>

  <section id="tools" class="home-tools max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 relative z-[1] scroll-mt-16 sm:scroll-mt-20">
    <div class="flex flex-nowrap items-center gap-2 mb-8 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
      <button v-for="cat in categories" :key="cat.id" @click="activeCategory = cat.id"
        class="shrink-0 whitespace-nowrap min-h-[44px] px-5 py-2 rounded-full text-[0.875rem] font-semibold tracking-[-0.01em] motion-interactive active:scale-[0.96] text-glass-sm"
        :class="activeCategory === cat.id
          ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/20'
          : 'liquid-glass-inset text-slate-600 dark:text-zinc-300'">
        {{ cat.label }}
      </button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <ToolCard v-for="tool in filteredTools" :key="tool.id" :tool="tool" />
    </div>
    <div v-if="filteredTools.length === 0" class="text-center py-20">
      <IconMoodEmpty class="w-14 h-14 mx-auto text-slate-300 dark:text-white/20 mb-3" />
      <p class="text-sm text-slate-500 dark:text-zinc-400 text-glass-sm">该分类下暂无工具</p>
    </div>
  </section>

  <section class="liquid-glass-strong mt-8 mb-2 mx-4 sm:mx-6 lg:mx-8">
    <div class="px-6 py-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="flex items-start gap-3.5">
          <div class="flex-shrink-0 w-10 h-10 rounded-[13px] bg-ios-green/20 flex items-center justify-center">
            <IconShieldCheck class="w-5 h-5 text-ios-green" />
          </div>
          <div>
            <h3 class="font-semibold text-[0.9375rem] text-slate-900 dark:text-white text-glass">安全可靠</h3>
            <p class="text-[0.8125rem] text-slate-500 dark:text-zinc-400 text-glass-sm">所有解析在服务端完成，保护隐私安全</p>
          </div>
        </div>
        <div class="flex items-start gap-3.5">
          <div class="flex-shrink-0 w-10 h-10 rounded-[13px] bg-ios-blue/20 flex items-center justify-center">
            <IconBolt class="w-5 h-5 text-ios-blue" />
          </div>
          <div>
            <h3 class="font-semibold text-[0.9375rem] text-slate-900 dark:text-white text-glass">极速响应</h3>
            <p class="text-[0.8125rem] text-slate-500 dark:text-zinc-400 text-glass-sm">智能 UA 池 + 并发请求</p>
          </div>
        </div>
        <div class="flex items-start gap-3.5">
          <div class="flex-shrink-0 w-10 h-10 rounded-[13px] bg-ios-purple/20 flex items-center justify-center">
            <IconDeviceMobile class="w-5 h-5 text-ios-purple" />
          </div>
          <div>
            <h3 class="font-semibold text-[0.9375rem] text-slate-900 dark:text-white text-glass">全端适配</h3>
            <p class="text-[0.8125rem] text-slate-500 dark:text-zinc-400 text-glass-sm">PC / 平板 / 手机完美体验</p>
          </div>
        </div>
      </div>
    </div>
  </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useHead } from '@vueuse/head';
import { IconSparkles, IconBrandGithub, IconMoodEmpty, IconShieldCheck, IconBolt, IconDeviceMobile } from '@tabler/icons-vue';
import { tools, categories, getToolsByCategory } from '../config/tools';
import ToolCard from '../components/ToolCard.vue';
useHead({ title: 'proHub - 全能在线工具箱' });
const activeCategory = ref('all');
const filteredTools = computed(() => getToolsByCategory(activeCategory.value));
function openAbout() {
  window.dispatchEvent(new Event('prohub:open-about'));
}
</script>

<style scoped>
.home-tools {
  min-height: 800px;
}

@media (max-width: 1023px) {
  .home-tools {
    min-height: 1250px;
  }
}

@media (max-width: 639px) {
  .home-tools {
    min-height: 2150px;
  }
}
</style>
