<template>
  <router-link
    :to="tool.route"
    class="group relative block p-6 rounded-2xl border transition-all duration-300 cursor-pointer"
    :class="[
      tool.status === 'coming_soon'
        ? 'border-dashed border-gray-300 dark:border-gray-600 opacity-60 hover:opacity-80'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-xl hover:shadow-brand-500/5 hover:border-brand-300 dark:hover:border-brand-700 hover:-translate-y-1',
      cardBgClass,
    ]"
  >
    <!-- Coming Soon 角标 -->
    <span
      v-if="tool.status === 'coming_soon'"
      class="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
    >
      即将上线
    </span>

    <!-- 图标 -->
    <div
      class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
      :class="iconBgClass"
    >
      <component :is="iconComp" class="w-6 h-6" :class="iconColorClass" />
    </div>

    <!-- 标题 -->
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
      {{ tool.title }}
    </h3>

    <!-- 描述 -->
    <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
      {{ tool.desc }}
    </p>

    <!-- 分类标签 -->
    <div class="mt-4 flex items-center gap-2">
      <span class="px-2.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
        {{ tool.category }}
      </span>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue';
import {
  IconDownload,
  IconFileText,
  IconPhoto,
  IconPalette,
  IconArrowsExchange,
} from '@tabler/icons-vue';

const props = defineProps({
  tool: { type: Object, required: true },
});

const iconMap = {
  IconDownload,
  IconFileText,
  IconPhoto,
  IconPalette,
  IconArrowsExchange,
};

const iconComp = computed(() => iconMap[props.tool.icon] || IconDownload);

const cardBgClass = computed(() => {
  if (props.tool.status === 'coming_soon') return 'bg-white/50 dark:bg-gray-800/30';
  return 'bg-white dark:bg-gray-800';
});

const iconBgClass = computed(() => {
  const map = {
    '媒体/去水印': 'bg-blue-50 dark:bg-blue-900/30',
    '文本处理':   'bg-emerald-50 dark:bg-emerald-900/30',
    '实用计算':   'bg-purple-50 dark:bg-purple-900/30',
  };
  return map[props.tool.category] || 'bg-gray-50 dark:bg-gray-700';
});

const iconColorClass = computed(() => {
  const map = {
    '媒体/去水印': 'text-blue-600 dark:text-blue-400',
    '文本处理':   'text-emerald-600 dark:text-emerald-400',
    '实用计算':   'text-purple-600 dark:text-purple-400',
  };
  return map[props.tool.category] || 'text-gray-600 dark:text-gray-400';
});
</script>
