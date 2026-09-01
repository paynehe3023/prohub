<template>
  <div class="flex flex-wrap items-center justify-between gap-3 pt-2 pb-5">
    <BackButton />
    <nav class="flex min-w-0 items-center gap-1.5 text-[0.8125rem] tracking-[-0.01em] text-slate-500 dark:text-zinc-400 text-glass-sm">
      <router-link to="/" class="shrink-0 transition-colors hover:text-slate-950 dark:hover:text-white">首页</router-link>
      <IconChevronRight class="h-3.5 w-3.5 shrink-0" />
      <span class="truncate text-slate-700 dark:text-zinc-300">{{ label }}</span>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { IconChevronRight } from '@tabler/icons-vue';
import BackButton from './BackButton.vue';
defineProps<{ label: string }>();
</script>
