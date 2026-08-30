<template>
  <router-link :to="tool.route"
    class="tool-card-link group relative block p-5 rounded-[28px] motion-interactive liquid-glass hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.16)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.42)]"
    :class="{ 'opacity-50 hover:opacity-65 border-dashed': tool.status === 'coming_soon' }">
    <span v-if="tool.isNew"
      class="absolute top-3 right-3 px-2.5 py-0.5 text-[0.625rem] font-semibold tracking-wider rounded-full bg-ios-blue/20 text-ios-blue border border-ios-blue/30">
      新工具
    </span>
    <span v-if="tool.status === 'coming_soon'"
      class="absolute top-3 right-3 px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider rounded-full bg-ios-orange/20 text-ios-orange border border-ios-orange/30">
      即将上线
    </span>
    <div class="w-10 h-10 rounded-[13px] flex items-center justify-center mb-4 transition-transform duration-200 ease-out group-hover:scale-[1.02] shadow-sm"
      :class="iconBgClass">
      <component :is="iconComp" class="w-5 h-5" :class="iconColorClass" />
    </div>
    <h3 class="text-base font-semibold text-slate-900 dark:text-white mb-1.5 tracking-[-0.022em] text-glass">
      {{ tool.title }}
    </h3>
    <p class="text-[0.8125rem] text-slate-600 dark:text-zinc-300 leading-relaxed tracking-[-0.01em] line-clamp-2 text-glass-sm">
      {{ tool.desc }}
    </p>
    <div class="mt-4">
      <span class="px-2.5 py-0.5 text-[0.6875rem] rounded-full liquid-glass-inset text-slate-500 dark:text-zinc-400 text-glass-sm">
        {{ tool.category }}
      </span>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue';
import { IconDownload, IconFileText, IconPhoto, IconPalette, IconArrowsExchange, IconCamera, IconNetwork, IconClipboardText } from '@tabler/icons-vue';
const props = defineProps({ tool: { type: Object, required: true } });
const iconMap = { IconDownload, IconFileText, IconPhoto, IconPalette, IconArrowsExchange, IconCamera, IconNetwork, IconClipboardText };
const iconComp = computed(() => iconMap[props.tool.icon] || IconDownload);
const iconBgClass = computed(() => ({ '协作同步':'bg-ios-blue/20', '媒体/去水印':'bg-ios-blue/20', '文本处理':'bg-ios-green/20', '实用计算':'bg-ios-purple/20' }[props.tool.category] || 'bg-white/10'));
const iconColorClass = computed(() => ({ '协作同步':'text-ios-blue', '媒体/去水印':'text-ios-blue', '文本处理':'text-ios-green', '实用计算':'text-ios-purple' }[props.tool.category] || 'text-slate-500 dark:text-white/70'));
</script>
