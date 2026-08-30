import { onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * 滚动方向隐藏 / 静置隐藏（AppHeader 顶栏 + 底部浮动按钮 共用）
 *
 * 行为（仅移动端生效；电脑端常显，永不隐藏）：
 * - 距顶部 < topOffset(72px)：常显（iOS 橡皮筋负值也视为顶部附近）
 * - 开始向下滚动（同方向累积 ≥ dirThreshold）：立即隐藏
 * - 开始向上滚动（同方向累积 ≥ dirThreshold）：立即显示
 * - 滚动方向反转时重置累积，避免轻微抖动造成反复切换
 * - 静置 5 秒无任何滚动：隐藏（再次滚动/触摸时先恢复显示计时）
 *
 * 设备判定：pointer: coarse（以触屏为主指针的设备 = 手机/平板）。
 * 方向响应使用 rAF 节流 + passive 监听，静置计时器独立于滚动事件。
 */

function isTouchPrimaryDevice() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export function useHideOnScroll(options = {}) {
  const {
    topOffset = 72,
    dirThreshold = 3, // 同方向累积像素，大于 1 防止 iOS 1px 级滚动抖动
    idleTimeout = 5000, // 静置 5 秒
  } = options;

  const hidden = ref(false);
  let enabled = false; // 仅移动端启用隐藏逻辑
  let lastScrollY = 0;
  let acc = 0; // 同方向滚动累积
  let rafId = 0;
  let idleTimer = 0;

  function clearIdleTimer() {
    if (idleTimer) {
      window.clearTimeout(idleTimer);
      idleTimer = 0;
    }
  }

  function resetIdleTimer() {
    clearIdleTimer();
    idleTimer = window.setTimeout(() => {
      // 静置到达：只要不在顶部附近，就隐藏
      if (window.scrollY >= topOffset) {
        hidden.value = true;
      }
    }, idleTimeout);
  }

  function handleScroll() {
    if (!enabled) return;
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;
      lastScrollY = currentY;

      // 顶部附近：强制显示并重置累积 / 静置计时
      if (currentY < topOffset) {
        hidden.value = false;
        acc = 0;
        resetIdleTimer();
        return;
      }

      if (delta === 0) {
        resetIdleTimer();
        return;
      }

      // 方向反转：清零累积重新计算
      if (acc !== 0 && (delta > 0 ? acc < 0 : acc > 0)) {
        acc = 0;
      }
      acc += delta;

      if (hidden.value) {
        // 隐藏中：向上滚动累积达到阈值 → 显示
        if (-acc >= dirThreshold) {
          hidden.value = false;
          acc = 0;
        }
      } else {
        // 显示中：向下滚动累积达到阈值 → 隐藏
        if (acc >= dirThreshold) {
          hidden.value = true;
          acc = 0;
        }
      }

      resetIdleTimer();
    });
  }

  // 触摸开始时若因为静置已隐藏，则立即显示，便于用户操作
  function handleTouchStart() {
    if (!enabled) return;
    if (window.scrollY >= topOffset && hidden.value) {
      hidden.value = false;
    }
    resetIdleTimer();
  }

  onMounted(() => {
    // 设备判定：仅移动端启用隐藏逻辑，电脑端常显
    enabled = isTouchPrimaryDevice();
    if (!enabled) return;
    lastScrollY = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    resetIdleTimer();
    // 初始状态：默认显示（hidden 初始 false）
  });

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('touchstart', handleTouchStart);
    if (rafId) window.cancelAnimationFrame(rafId);
    clearIdleTimer();
  });

  return { hidden };
}
