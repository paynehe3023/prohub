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
            <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">如果 proHub 恰好帮到了你，欢迎请作者喝杯咖啡；不强求，你的使用与反馈已是最好的鼓励。</p>

            <!-- 两个收款码并排展示：微信在前，尺寸一致；
                 移动端点击 → 支付宝直达"输入金额"付款页，微信打开扫一扫（个人码无公开直达 scheme） -->
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="method in methods"
                :key="method.id"
                type="button"
                class="group rounded-2xl border border-slate-200 bg-white p-2 transition motion-interactive active:scale-95 dark:border-slate-800 dark:bg-slate-900"
                :aria-label="`用${method.label}赞赏`"
                @click="jumpToApp(method.id)"
              >
                <span class="mb-2 block text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">{{ method.label }}</span>
                <img
                  :src="method.qrUrl"
                  :alt="`${method.label}二维码`"
                  class="aspect-square w-full rounded-xl object-contain"
                  draggable="false"
                />
              </button>
            </div>

            <p class="text-xs leading-5 text-slate-400 dark:text-slate-500">手机上点击二维码即可唤起对应 App：支付宝会直达付款页输入金额；微信请先截图，再在扫一扫中从相册识别。谢谢你的心意～</p>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { IconX } from '@tabler/icons-vue';

defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(['update:open']);

// 微信在前；两个码等大（grid 等宽 + aspect-square）
// 支付宝收款码真实链接（解码自 donate-qr-alipay.jpg），用于 scheme 直达付款页
const ALIPAY_QR_URL = 'https://qr.alipay.com/fkx10297lg1x1ccowmy1pdd';

const methods = [
  { id: 'wechat', label: 'WeChat', qrUrl: '/donate-qr-wechat.jpg' },
  { id: 'alipay', label: 'AiPay', qrUrl: '/donate-qr-alipay.jpg' },
];

// 移动端（粗指针 / 移动 UA）点击二维码 → 唤起对应 App：
// - 支付宝：alipays scheme 携带收款码 URL，直接进入"向TA付款"输入金额页（appId 20000186 为扫码结果容器）
// - 微信：个人收款码（wxp://）无公开 scheme 直达金额页，仅能打开扫一扫，由用户从相册识别截图
// 桌面端点击无动作
function isMobileDevice() {
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return coarse || uaMobile || iPadOs;
}

function jumpToApp(methodId) {
  if (!isMobileDevice()) return;
  if (methodId === 'alipay') {
    window.location.href = `alipays://platformapi/startapp?appId=20000186&url=${encodeURIComponent(ALIPAY_QR_URL)}`;
    return;
  }
  window.location.href = 'weixin://scanqrcode';
}

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
