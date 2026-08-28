<template>
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200/80 hover:text-slate-900 active:scale-95 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700/80 dark:hover:text-white"
    aria-label="回到上一级"
    @click="goBack"
  >
    <IconArrowLeft class="h-4 w-4" />
    返回
  </button>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { IconArrowLeft } from '@tabler/icons-vue';

const router = useRouter();

function goBack() {
  if (window.history.state?.back) {
    router.back();
    return;
  }
  router.push({ name: 'Home' });
}
</script>
