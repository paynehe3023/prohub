<template>
  <nav class="flex items-center gap-1.5 text-[0.8125rem] text-zinc-400 tracking-[-0.01em] text-glass-sm pt-2 pb-5">
    <router-link to="/" class="hover:text-white transition-colors">首页</router-link>
    <IconChevronRight class="w-3.5 h-3.5 shrink-0" />
    <span class="text-zinc-300">{{ label }}</span>
  </nav>
</template>

<script setup>
import { IconChevronRight } from '@tabler/icons-vue';
defineProps({ label: { type: String, required: true } });
</script>
