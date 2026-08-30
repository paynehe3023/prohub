<template>
  <div
    class="floating-bar-root fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-[calc(1.5rem+env(safe-area-inset-right))] z-[80] flex items-center gap-2"
    :class="{ 'floating-bar-hidden': barHidden }"
  >
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur-md transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200 motion-interactive"
      @click="feedbackOpen = true"
    >
      <IconMessageCircle class="h-4 w-4 text-ios-blue" />
      反馈
    </button>
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur-md transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200 motion-interactive"
      @click="donateOpen = true"
    >
      <IconCoffee class="h-4 w-4 text-orange-500" />
      赞赏支持
    </button>
  </div>

  <FeedbackModal v-model:open="feedbackOpen" @submitted="showToast('反馈已成功发送至管理员邮箱！感谢你的支持。')" @copied="showToast('邮箱已复制到剪贴板')" />
  <DonateModal v-model:open="donateOpen" />

  <Teleport to="body">
    <Transition name="floating-toast">
      <div v-if="toastMessage" class="fixed right-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-[9999] max-w-[min(92vw,360px)] rounded-2xl border border-emerald-300/50 bg-white/95 px-4 py-3 text-sm text-emerald-700 shadow-2xl shadow-slate-900/25 backdrop-blur-md dark:border-emerald-400/30 dark:bg-slate-950/95 dark:text-emerald-200">
        <div class="flex items-center gap-2">
          <IconCheck class="h-4 w-4 shrink-0" />
          <span>{{ toastMessage }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue';
import { IconCheck, IconCoffee, IconMessageCircle } from '@tabler/icons-vue';
import FeedbackModal from './FeedbackModal.vue';
import DonateModal from './DonateModal.vue';
import { useHideOnScroll } from '../composables/useHideOnScroll';

const { hidden: scrollHidden } = useHideOnScroll();

// 任一模态框打开时不隐藏
const feedbackOpen = ref(false);
const donateOpen = ref(false);
const barHidden = computed(() => scrollHidden.value && !feedbackOpen.value && !donateOpen.value);

const toastMessage = ref('');
let toastTimer = null;

function showToast(message) {
  toastMessage.value = message;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastMessage.value = '';
    toastTimer = null;
  }, 2600);
}

onUnmounted(() => {
  if (toastTimer) window.clearTimeout(toastTimer);
});
</script>

<style scoped>
/* 与顶栏一致的下滑隐藏动画（340ms cubic-bezier），向下滑出视口底部 + 渐隐更柔和 */
.floating-bar-root {
  transition: transform 340ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease;
}

.floating-bar-hidden {
  transform: translateY(calc(100% + 1.5rem + env(safe-area-inset-bottom)));
  opacity: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .floating-bar-root {
    transition: none;
  }
}

.floating-toast-enter-active,
.floating-toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.floating-toast-enter-from,
.floating-toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
