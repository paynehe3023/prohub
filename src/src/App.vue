<template>
  <div class="app-root relative isolate">
    <!-- 壁纸层：sticky 视口尺寸（100vw×100vh），按手机屏幕比例 cover 居中裁剪；
         mb-[-100vh] 抵消占位，内容从页面顶部开始并覆盖在壁纸之上。
         sticky 非 fixed：地址栏收起/展开、橡皮筋回弹时位置尺寸恒定，不重算不抽搐。 -->
    <div class="app-page-background sticky top-0 -z-10 mb-[-100vh] h-screen min-h-screen w-full overflow-hidden pointer-events-none" aria-hidden="true">
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
});

onBeforeUnmount(() => {
  window.removeEventListener('prohub:background-changed', syncPageColor);
});
</script>

