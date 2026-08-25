<template>
  <section class="relative py-20 md:py-28">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-[1]">
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass-inset text-[0.8125rem] font-medium text-zinc-200 text-glass-sm mb-6 tracking-[-0.01em]">
        <IconSparkles class="w-3.5 h-3.5 text-ios-blue" /> 免费 · 开源 · 安全
      </div>
      <h1 class="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-[-0.03em] text-glass">
        你的<span class="text-ios-blue">全能工具箱</span>
      </h1>
      <p class="mt-5 text-base md:text-lg text-zinc-300 leading-relaxed tracking-[-0.01em] max-w-xl mx-auto text-glass-sm">
        社交媒体无水印解析 · 文本处理 · 图片工具 · 实用计算<br/>
        一站解决，无需安装，即开即用
      </p>
      <div class="mt-8 flex items-center justify-center gap-3">
        <a href="#tools" class="btn-ios btn-ios-primary">开始使用</a>
        <a href="https://github.com/paynehe3023/prohub" target="_blank" rel="noopener" class="btn-ios btn-ios-glass">
          <IconBrandGithub class="w-4.5 h-4.5" /> GitHub
        </a>
      </div>
    </div>
  </section>

  <section id="tools" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 relative z-[1]">
    <div class="flex flex-wrap items-center gap-2 mb-8">
      <button v-for="cat in categories" :key="cat.id" @click="activeCategory = cat.id"
        class="px-4 py-2 rounded-full text-[0.8125rem] font-medium tracking-[-0.01em] transition-all active:scale-[0.97] text-glass-sm"
        :class="activeCategory === cat.id
          ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/20'
          : 'liquid-glass-inset text-zinc-300'">
        {{ cat.label }}
      </button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <ToolCard v-for="tool in filteredTools" :key="tool.id" :tool="tool" />
    </div>
    <div v-if="filteredTools.length === 0" class="text-center py-20">
      <IconMoodEmpty class="w-14 h-14 mx-auto text-white/20 mb-3" />
      <p class="text-sm text-zinc-400 text-glass-sm">该分类下暂无工具</p>
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
            <h3 class="font-semibold text-[0.9375rem] text-white text-glass">安全可靠</h3>
            <p class="text-[0.8125rem] text-zinc-400 text-glass-sm">所有解析在服务端完成，保护隐私安全</p>
          </div>
        </div>
        <div class="flex items-start gap-3.5">
          <div class="flex-shrink-0 w-10 h-10 rounded-[13px] bg-ios-blue/20 flex items-center justify-center">
            <IconBolt class="w-5 h-5 text-ios-blue" />
          </div>
          <div>
            <h3 class="font-semibold text-[0.9375rem] text-white text-glass">极速响应</h3>
            <p class="text-[0.8125rem] text-zinc-400 text-glass-sm">智能 UA 池 + 并发请求</p>
          </div>
        </div>
        <div class="flex items-start gap-3.5">
          <div class="flex-shrink-0 w-10 h-10 rounded-[13px] bg-ios-purple/20 flex items-center justify-center">
            <IconDeviceMobile class="w-5 h-5 text-ios-purple" />
          </div>
          <div>
            <h3 class="font-semibold text-[0.9375rem] text-white text-glass">全端适配</h3>
            <p class="text-[0.8125rem] text-zinc-400 text-glass-sm">PC / 平板 / 手机完美体验</p>
          </div>
        </div>
      </div>
    </div>
  </section>
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
</script>
