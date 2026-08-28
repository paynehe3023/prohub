<template>
  <Transition name="back-to-top">
    <button
      v-show="visible"
      type="button"
      class="fixed bottom-6 right-20 z-40 flex h-10 w-10 items-center justify-center rounded-full liquid-glass text-white/80 shadow-md motion-interactive will-change-transform hover:text-white hover:shadow-lg active:scale-95"
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

const SCROLL_THRESHOLD = 300;
const visible = ref(false);
let animationFrameId = null;

function getScrollTop() {
  const scrollingElement = document.scrollingElement;
  return Math.max(
    window.scrollY || 0,
    scrollingElement?.scrollTop || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0,
  );
}

function updateVisibility() {
  const nextVisible = getScrollTop() > SCROLL_THRESHOLD;
  if (visible.value !== nextVisible) visible.value = nextVisible;
}

function scheduleVisibilityUpdate() {
  if (animationFrameId !== null) return;
  animationFrameId = window.requestAnimationFrame(() => {
    animationFrameId = null;
    updateVisibility();
  });
}

function scrollToTop() {
  const scrollingElement = document.scrollingElement;
  if (scrollingElement) {
    scrollingElement.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

onMounted(() => {
  updateVisibility();
  window.addEventListener('scroll', scheduleVisibilityUpdate, { passive: true });
  document.addEventListener('scroll', scheduleVisibilityUpdate, { passive: true, capture: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', scheduleVisibilityUpdate);
  document.removeEventListener('scroll', scheduleVisibilityUpdate, true);
  if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
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
