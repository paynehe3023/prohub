<template>
  <Transition name="back-to-top">
    <button
      v-if="visible"
      type="button"
      class="fixed bottom-6 right-20 z-40 flex h-10 w-10 items-center justify-center rounded-full liquid-glass text-white/80 shadow-lg transition-all hover:text-white hover:shadow-xl active:scale-95"
      title="回到顶部"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <IconArrowUp class="h-4 w-4" />
    </button>
  </Transition>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { IconArrowUp } from '@tabler/icons-vue';

const visible = ref(false);

function updateVisibility() {
  visible.value = window.scrollY > 400;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(() => {
  updateVisibility();
  window.addEventListener('scroll', updateVisibility, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateVisibility);
});
</script>

<style scoped>
.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.92);
}
</style>
