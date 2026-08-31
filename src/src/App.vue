<template>
  <div class="app-root relative isolate">
    <!-- 壁纸层：固定视口尺寸（100vw×100vh），按手机屏幕比例 cover 居中裁剪，滚动时保持静止。 -->
    <div class="app-page-background fixed inset-0 -z-10 h-screen w-full overflow-hidden pointer-events-none select-none" aria-hidden="true">
      <div class="app-bg-canvas"></div>
      <div class="app-ambient-glow app-ambient-glow-emerald"></div>
      <div class="app-ambient-glow app-ambient-glow-cyan"></div>
      <div class="app-ambient-glow app-ambient-glow-slate"></div>
    </div>
    <div class="app-shell flex min-h-screen flex-col relative z-10">
      <AppHeader />
      <main class="flex-1 relative z-[1] min-h-0">
        <router-view />
      </main>
      <AppFooter />
      <FloatingToolbar />
      <BgSwitcher />
      <BackToTop />
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import FloatingToolbar from './components/FloatingToolbar.vue';
import BgSwitcher from './components/BgSwitcher.vue';
import BackToTop from './components/BackToTop.vue';

let modalObserver;
let modalScrollLocked = false;
let previousBodyOverflow = '';
let previousBodyPosition = '';
let previousBodyTop = '';
let previousBodyWidth = '';
let previousBodyPaddingRight = '';
let modalScrollY = 0;

function syncModalScrollLock() {
  const hasOpenModal = Boolean(document.querySelector('[data-modal-overlay]'));
  if (hasOpenModal && !modalScrollLocked) {
    modalScrollY = window.scrollY;
    previousBodyOverflow = document.body.style.overflow;
    previousBodyPosition = document.body.style.position;
    previousBodyTop = document.body.style.top;
    previousBodyWidth = document.body.style.width;
    previousBodyPaddingRight = document.body.style.paddingRight;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${modalScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    modalScrollLocked = true;
  } else if (!hasOpenModal && modalScrollLocked) {
    document.body.style.overflow = previousBodyOverflow;
    document.body.style.position = previousBodyPosition;
    document.body.style.top = previousBodyTop;
    document.body.style.width = previousBodyWidth;
    document.body.style.paddingRight = previousBodyPaddingRight;
    window.scrollTo(0, modalScrollY);
    modalScrollLocked = false;
  }
}

function syncPageColor() {
  const cssBg = getComputedStyle(document.documentElement).getPropertyValue('--prohub-background-color').trim();
  if (cssBg) {
    document.documentElement.style.backgroundColor = cssBg;
    document.body.style.backgroundColor = cssBg;
  }
}

onMounted(() => {
  syncPageColor();
  window.addEventListener('prohub:background-changed', syncPageColor);
  syncModalScrollLock();
  modalObserver = new MutationObserver(syncModalScrollLock);
  modalObserver.observe(document.body, { childList: true, subtree: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('prohub:background-changed', syncPageColor);
  modalObserver?.disconnect();
  modalObserver = null;
  document.body.style.overflow = previousBodyOverflow;
});
</script>

