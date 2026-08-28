<template>
  <div class="theme-page max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <BreadcrumbNav label="即将上线" />
    <div class="text-center py-16">
      <div class="w-20 h-20 mx-auto mb-5 rounded-[20px] liquid-glass flex items-center justify-center">
        <IconTools class="w-10 h-10 text-ios-orange" />
      </div>
      <h2 class="text-2xl font-bold text-white mb-2.5 tracking-[-0.025em] text-glass">即将上线</h2>
      <p class="text-[0.9375rem] text-zinc-400 mb-8 max-w-md mx-auto leading-relaxed text-glass-sm">该工具正在开发中，敬请期待！</p>
      <router-link to="/" class="btn-ios btn-ios-primary inline-flex items-center gap-2">
        <IconArrowLeft class="w-4 h-4" /> 返回首页
      </router-link>
    </div>
  </div>
</template>
<script setup>
import { useHead } from '@vueuse/head'; import { IconChevronRight, IconTools, IconArrowLeft } from '@tabler/icons-vue';
import BreadcrumbNav from '../../components/BreadcrumbNav.vue';
useHead({ title: '即将上线 - proHub' });
</script>
