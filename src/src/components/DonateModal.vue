<template>
  <Teleport to="body">
    <Transition name="donate-modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-slate-950/75"
        @click.self="close"
      >
        <section
          class="w-full max-w-md min-h-[420px] max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-2xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-950/95 dark:text-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="donate-title"
        >
          <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <p class="text-[0.6875rem] uppercase tracking-[0.2em] text-ios-orange">Support proHub</p>
              <h2 id="donate-title" class="mt-1 text-lg font-bold">赞赏支持</h2>
            </div>
            <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="关闭赞赏弹窗" @click="close">
              <IconX size="18" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto space-y-4 p-6">
            <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">如果这个工作台帮你节省了时间，可以请作者喝杯咖啡。</p>
            <div class="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
              <button
                v-for="method in methods"
                :key="method.id"
                type="button"
                class="rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
                :class="activeMethod === method.id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
                @click="activeMethod = method.id"
              >
                {{ method.label }}
              </button>
            </div>
            <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800">
              <img v-if="activeMethod === 'wechat'" src="/donate-qr.jpg" alt="微信赞赏二维码" class="mx-auto aspect-square w-full max-w-[260px] object-contain" />
              <div v-else class="flex aspect-square items-center justify-center rounded-xl bg-slate-50 p-6 text-center text-sm leading-6 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                暂未配置支付宝收款码
              </div>
            </div>
            <p class="text-center text-xs text-slate-500 dark:text-slate-400">感谢每一份支持，愿你今天也有好心情。</p>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import { IconX } from '@tabler/icons-vue';

defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(['update:open']);
const methods = [
  { id: 'wechat', label: '微信' },
  { id: 'alipay', label: '支付宝' },
];
const activeMethod = ref('wechat');

function close() {
  emit('update:open', false);
}
</script>

<style scoped>
.donate-modal-enter-active,
.donate-modal-leave-active {
  transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.donate-modal-enter-active section,
.donate-modal-leave-active section {
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.donate-modal-enter-from,
.donate-modal-leave-to {
  opacity: 0;
}

.donate-modal-enter-from section,
.donate-modal-leave-to section {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
