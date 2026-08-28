<template>
  <div class="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-[calc(1.5rem+env(safe-area-inset-right))] z-[80] flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 p-1.5 shadow-lg shadow-slate-900/10 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-950/80 dark:shadow-black/25">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
      @click="feedbackOpen = true"
    >
      <IconMessageCircle class="h-4 w-4 text-ios-blue" />
      反馈
    </button>
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-transform hover:from-orange-400 hover:to-amber-300 active:scale-95"
      @click="donateOpen = true"
    >
      <IconCoffee class="h-4 w-4" />
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
import { onUnmounted, ref } from 'vue';
import { IconCheck, IconCoffee, IconMessageCircle } from '@tabler/icons-vue';
import FeedbackModal from './FeedbackModal.vue';
import DonateModal from './DonateModal.vue';

const feedbackOpen = ref(false);
const donateOpen = ref(false);
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
