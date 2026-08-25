<template>
  <header class="sticky top-3 z-50 mx-auto max-w-[95%] liquid-glass-strong">
    <div class="px-5 sm:px-6">
      <div class="flex items-center justify-between h-14">
        <router-link to="/" class="flex items-center gap-2.5 group shrink-0">
          <div class="w-8 h-8 rounded-[10px] bg-ios-blue flex items-center justify-center shadow-md shadow-ios-blue/25">
            <IconBox class="w-4.5 h-4.5 text-white" />
          </div>
          <span class="text-[1.0625rem] font-bold tracking-[-0.022em] text-white text-glass whitespace-nowrap">proHub</span>
        </router-link>

        <nav class="hidden md:flex items-center gap-6 mx-4">
          <router-link to="/" class="text-[0.8125rem] font-medium tracking-[-0.01em] text-zinc-300 text-glass-sm hover:text-white transition-colors whitespace-nowrap">首页</router-link>
          <a href="#tools" class="text-[0.8125rem] font-medium tracking-[-0.01em] text-zinc-300 text-glass-sm hover:text-white transition-colors whitespace-nowrap">工具</a>
          <router-link to="/tools/cidr-calculator" class="text-[0.8125rem] font-medium tracking-[-0.01em] text-ios-blue text-glass-sm hover:text-white transition-colors whitespace-nowrap">CIDR</router-link>
          <a href="https://github.com/paynehe3023/prohub" target="_blank" rel="noopener" class="text-[0.8125rem] font-medium tracking-[-0.01em] text-zinc-300 text-glass-sm hover:text-white transition-colors whitespace-nowrap">GitHub</a>
        </nav>

        <button @click="toggleDark" class="w-8 h-8 rounded-full liquid-glass-inset flex items-center justify-center hover:shadow-lg active:scale-[0.95] transition-all shrink-0"
          :title="isDark ? '暗黑' : '亮色'">
          <IconSun v-if="isDark" class="w-3.5 h-3.5 text-ios-yellow" />
          <IconMoon v-else class="w-3.5 h-3.5 text-white/70" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, watchEffect } from 'vue';
import { IconBox, IconSun, IconMoon } from '@tabler/icons-vue';
const isDark = ref(false);
watchEffect(() => {
  const s = localStorage.getItem('prohub-dark');
  isDark.value = s !== null ? s === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', isDark.value);
});
function toggleDark() {
  isDark.value = !isDark.value;
  localStorage.setItem('prohub-dark', String(isDark.value));
  document.documentElement.classList.toggle('dark', isDark.value);
}
</script>
