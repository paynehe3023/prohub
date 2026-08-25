<template>
  <header class="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-2 group">
          <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <IconBox class="w-5 h-5 text-white" />
          </div>
          <span class="text-xl font-bold bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
            proHub
          </span>
        </router-link>

        <!-- 导航 -->
        <nav class="hidden md:flex items-center gap-6">
          <router-link to="/" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            首页
          </router-link>
          <a href="#tools" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            工具
          </a>
          <a href="https://github.com/paynehe3023/prohub" target="_blank" rel="noopener" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            GitHub
          </a>
        </nav>

        <!-- 暗黑模式切换 -->
        <button
          @click="toggleDark"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          :title="isDark ? '切换到亮色模式' : '切换到暗黑模式'"
        >
          <IconSun v-if="isDark" class="w-5 h-5 text-yellow-400" />
          <IconMoon v-else class="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, watchEffect } from 'vue';
import { IconBox, IconSun, IconMoon } from '@tabler/icons-vue';

const isDark = ref(false);

// 从 localStorage 或系统偏好读取暗黑模式
watchEffect(() => {
  const stored = localStorage.getItem('prohub-dark');
  if (stored !== null) {
    isDark.value = stored === 'true';
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  document.documentElement.classList.toggle('dark', isDark.value);
});

function toggleDark() {
  isDark.value = !isDark.value;
  localStorage.setItem('prohub-dark', String(isDark.value));
  document.documentElement.classList.toggle('dark', isDark.value);
}
</script>
