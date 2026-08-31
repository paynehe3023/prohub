<template>
  <footer class="app-footer liquid-glass-strong mx-4 sm:mx-6 lg:mx-8 mb-4">
    <div class="px-6 py-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <div class="w-6 h-6 rounded-lg bg-ios-blue flex items-center justify-center"><IconBox class="w-3.5 h-3.5 text-white" /></div>
            <span class="font-bold text-sm text-slate-900 dark:text-white text-glass">proHub</span>
          </div>
          <p class="text-[0.75rem] text-slate-500 dark:text-zinc-500 text-glass-sm">一站式全能在线工具箱</p>
        </div>
        <div>
          <h4 class="font-semibold text-[0.75rem] text-slate-700 dark:text-zinc-300 mb-2 text-glass-sm">快速链接</h4>
          <ul class="space-y-1.5">
            <li><router-link to="/" class="text-[0.75rem] text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white transition-colors text-glass-sm">首页</router-link></li>
            <li><router-link to="/tools/media-downloader" class="text-[0.75rem] text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white transition-colors text-glass-sm">无水印解析</router-link></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold text-[0.75rem] text-slate-700 dark:text-zinc-300 mb-2 text-glass-sm">免责声明</h4>
          <p class="text-[0.6875rem] text-slate-500 dark:text-zinc-500 leading-relaxed text-glass-sm">仅供学习交流使用，请勿用于商业或侵权用途。</p>
        </div>
      </div>
      <div class="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p class="text-[0.6875rem] text-slate-500 dark:text-zinc-500 text-glass-sm">&copy; {{ year }} proHub</p>
        <div class="flex items-center gap-3">
          <a href="/sitemap.xml" class="text-[0.6875rem] text-slate-500 hover:text-slate-950 dark:text-zinc-500 dark:hover:text-white transition-colors text-glass-sm">Sitemap</a>
          <a href="/robots.txt" class="text-[0.6875rem] text-slate-500 hover:text-slate-950 dark:text-zinc-500 dark:hover:text-white transition-colors text-glass-sm">robots.txt</a>
        </div>
      </div>
    </div>
  </footer>
</template>
<script setup>
import { IconBox } from '@tabler/icons-vue'; const year = new Date().getFullYear();
</script>

<style scoped>
.app-footer {
  flex-shrink: 0;
}
</style>
