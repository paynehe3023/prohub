<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <nav class="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-8">
      <router-link to="/" class="hover:text-brand-600 dark:hover:text-brand-400">首页</router-link>
      <IconChevronRight class="w-4 h-4" />
      <span class="text-gray-600 dark:text-gray-300">即将上线</span>
    </nav>

    <div class="text-center py-20">
      <div class="w-24 h-24 mx-auto mb-6 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
        <IconTools class="w-12 h-12 text-amber-500" />
      </div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">即将上线</h2>
      <p class="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
        该工具正在紧锣密鼓开发中，敬请期待！我们会尽快为您带来更强大的功能体验。
      </p>
      <router-link to="/" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 transition-all">
        <IconArrowLeft class="w-4 h-4" />
        返回首页
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import { IconChevronRight, IconTools, IconArrowLeft } from '@tabler/icons-vue';

useHead({
  title: '即将上线 - proHub',
  meta: [
    { name: 'description', content: '该工具正在开发中，敬请期待' },
  ],
});
</script>
