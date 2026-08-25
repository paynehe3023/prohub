<template>
  <div class="fixed bottom-6 right-6 z-40">
    <button @click="show = !show"
      class="w-10 h-10 rounded-full liquid-glass flex items-center justify-center hover:shadow-lg active:scale-[0.95] transition-all"
      :class="{ 'ring-2 ring-ios-blue/40': show }" title="支持一下">
      <IconCoffee class="w-4.5 h-4.5 text-ios-orange" />
    </button>
    <Transition name="donate">
      <div v-if="show" class="absolute bottom-14 right-0 rounded-[28px] w-52 liquid-glass overflow-hidden" @click.stop>
        <p class="text-[0.75rem] text-center text-zinc-300 pt-4 pb-3 leading-relaxed text-glass-sm">如果觉得好用<br/>可以请我喝杯咖啡</p>
        <img src="/donate-qr.jpg" alt="扫码支持" class="w-full aspect-square object-cover" />
        <p class="text-[0.625rem] text-center text-zinc-500 py-3 text-glass-sm">感谢每一份支持</p>
      </div>
    </Transition>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'; import { IconCoffee } from '@tabler/icons-vue'; const show = ref(false);
function onClickOutside(e) {
  if (show.value) {
    const el = document.querySelector('.fixed.bottom-6.right-6');
    if (el && !el.contains(e.target)) show.value = false;
  }
}
onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));
</script>
<style scoped>
.donate-enter-active { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
.donate-leave-active { transition: all 0.15s ease-in; }
.donate-enter-from { opacity: 0; transform: translateY(8px) scale(0.92); }
.donate-leave-to   { opacity: 0; transform: translateY(8px) scale(0.92); }
</style>
