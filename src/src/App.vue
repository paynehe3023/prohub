<template>
  <div
    class="app-root relative isolate"
    :style="bgMinH ? { minHeight: bgMinH + 'px' } : undefined"
  >
    <div
      class="app-fixed-bg fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <!-- 壁纸绘制层：固定像素尺寸（初始视口+buffer），cover 保持原始宽高比 -->
      <div class="app-bg-canvas" :style="bgCanvasStyle"></div>
      <div class="app-ambient-glow app-ambient-glow-emerald"></div>
      <div class="app-ambient-glow app-ambient-glow-cyan"></div>
      <div class="app-ambient-glow app-ambient-glow-slate"></div>
    </div>
    <div
      class="flex flex-col relative z-10"
      :style="bgMinH ? { minHeight: bgMinH + 'px' } : undefined"
    >
      <AppHeader />
      <main class="flex-1 relative z-[1]">
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
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import FloatingToolbar from './components/FloatingToolbar.vue';
import BgSwitcher from './components/BgSwitcher.vue';
import BackToTop from './components/BackToTop.vue';

// ============================================================
// 移动端背景 抽搐 / 拉伸 根治
// ------------------------------------------------------------
// 【抽搐成因】iOS Safari 地址栏收缩触发 fixed inset:0 层重布局，
//   background-size: cover 按新尺寸重算 → 壁纸放大/位移。
// 【拉伸成因】直接注入固定像素 backgroundSize（w+buffer)x(h+buffer)
//   会强制图片按视口比例绘制，破坏原始宽高比。
//
// 【修复方案】壁纸绘制迁移到内层 .app-bg-canvas：
//   1. 内层尺寸锁死为「初始视口 + buffer」像素（仅 orientationchange 重测），
//      尺寸恒定 → cover 比例不随地址栏收缩重算（防抽搐）；
//   2. 内层 background-size: cover → 始终保持图片原始宽高比（防拉伸）；
//   3. 每边 100px buffer + 外层 overflow:hidden 裁切 → 新视口仍被覆盖（无黑边）；
//   4. html/body 背景色与主题色同步，极端橡皮筋场景不露异色。
// ============================================================
const bgW = ref(0);
const bgH = ref(0);
const bgMinH = ref(0);

// 给壁纸额外的 buffer，防止地址栏收缩时仍然能覆盖四周
const EDGE_BUFFER = 100;

const bgCanvasStyle = computed(() => {
  const w = bgW.value;
  const h = bgH.value;
  if (!w || !h) return {};
  return {
    width: `${w + EDGE_BUFFER * 2}px`,
    height: `${h + EDGE_BUFFER * 2}px`,
  };
});

function measure() {
  const vv = globalThis.visualViewport;
  const w = Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth || 375);
  const h = Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight || 667);
  bgW.value = w;
  bgH.value = h;
  bgMinH.value = Math.max(h, document.documentElement.scrollHeight || h);
  try {
    document.documentElement.style.setProperty('--app-bg-w', w + 'px');
    document.documentElement.style.setProperty('--app-bg-h', h + 'px');
    document.documentElement.style.setProperty('--app-min-h', h + 'px');
    document.documentElement.style.setProperty('--app-bg-buffer', `${EDGE_BUFFER}px`);
    // 兜底：把 html / body 的 background-color 与当前主题色保持一致，
    // 避免任何极端场景（橡皮筋、浏览器 UI 突变）露出异色色块
    const cssBg = getComputedStyle(document.documentElement).getPropertyValue('--prohub-background-color');
    if (cssBg) {
      document.documentElement.style.backgroundColor = cssBg.trim();
      document.body.style.backgroundColor = cssBg.trim();
    }
  } catch {}
}

let roTimer = null;
function onOrientationChange() {
  if (roTimer) clearTimeout(roTimer);
  roTimer = setTimeout(() => measure(), 200);
}

// 当 BgSwitcher 切换背景时，需要重新兜底 html/body 背景色
function onBackgroundChanged() {
  try {
    const cssBg = getComputedStyle(document.documentElement).getPropertyValue('--prohub-background-color');
    if (cssBg) {
      document.documentElement.style.backgroundColor = cssBg.trim();
      document.body.style.backgroundColor = cssBg.trim();
    }
  } catch {}
}

onMounted(() => {
  measure();
  window.addEventListener('orientationchange', onOrientationChange, { passive: true });
  window.addEventListener('prohub:background-changed', onBackgroundChanged);
});

onBeforeUnmount(() => {
  window.removeEventListener('orientationchange', onOrientationChange);
  window.removeEventListener('prohub:background-changed', onBackgroundChanged);
  if (roTimer) clearTimeout(roTimer);
});
</script>

