<template>
  <div
    ref="switcherRef"
    class="floating-bar-root fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-[calc(1.5rem+env(safe-area-inset-left))] z-[80] flex flex-col gap-2"
    :class="{ 'floating-bar-hidden': barHidden }"
  >
    <button
      type="button"
      @click="open = !open"
      class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur-md transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200 motion-interactive"
      title="换背景"
      aria-label="换背景"
      :aria-expanded="open"
    >
      <IconPhoto class="h-4 w-4" />
      换背景
    </button>

    <Transition name="switcher">
      <div v-if="open" class="liquid-glass p-3 flex flex-col gap-3 w-64 max-h-[min(72vh,560px)] overflow-y-auto" @click.stop>
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs font-semibold text-slate-900 dark:text-white text-glass">背景设置</p>
          <span class="text-[0.625rem] text-slate-500 dark:text-zinc-400 text-glass-sm">自动保存</span>
        </div>

        <section>
          <p class="mb-2 text-[0.625rem] text-slate-500 dark:text-zinc-400 text-glass-sm">纯色背景</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="background in solidPresets"
              :key="background.id"
              type="button"
              @click="applyBackground(background)"
              class="relative h-9 rounded-xl border border-white/20 hover:border-white/70 motion-interactive active:scale-95 text-[0.6875rem] font-medium flex items-center justify-center overflow-hidden"
              :class="activeBackgroundId === background.id ? 'ring-2 ring-ios-blue ring-offset-1 ring-offset-black/20' : ''"
              :style="previewStyle(background)"
              :title="background.label"
            >
              {{ background.label }}
            </button>
          </div>
        </section>

        <section>
          <p class="mb-2 text-[0.625rem] text-slate-500 dark:text-zinc-400 text-glass-sm">内置壁纸</p>
          <button
            type="button"
            @click="applyBackground(defaultWallpaper)"
             class="relative w-full h-12 rounded-xl border border-white/20 hover:border-white/70 motion-interactive active:scale-95 text-[0.6875rem] font-medium flex items-center justify-center overflow-hidden"
            :class="activeBackgroundId === defaultWallpaper.id ? 'ring-2 ring-ios-blue ring-offset-1 ring-offset-black/20' : ''"
            :style="previewStyle(defaultWallpaper)"
          >
            {{ defaultWallpaper.label }}
          </button>
        </section>

        <section>
          <div class="flex items-center justify-between gap-2 mb-2">
            <p class="text-[0.625rem] text-slate-500 dark:text-zinc-400 text-glass-sm">Bing 最近 7 天</p>
            <button type="button" @click="loadBingWallpapers" class="text-[0.625rem] text-ios-blue hover:text-slate-950 dark:hover:text-white transition-colors" :disabled="bingLoading">
              {{ bingLoading ? '加载中' : '刷新' }}
            </button>
          </div>
          <div v-if="bingLoading && !bingWallpapers.length" class="rounded-xl liquid-glass-inset px-3 py-4 text-center text-[0.6875rem] text-slate-500 dark:text-zinc-400">
            正在获取壁纸...
          </div>
          <div v-else-if="bingError && !bingWallpapers.length" class="rounded-xl liquid-glass-inset px-3 py-3 text-[0.6875rem] text-slate-500 dark:text-zinc-400">
            Bing 壁纸暂时不可用，仍可使用内置背景。
          </div>
          <div v-else class="grid grid-cols-2 gap-2">
            <button
              v-for="background in bingWallpapers"
              :key="background.id"
              type="button"
              @click="applyBackground(background)"
             class="relative h-16 rounded-xl border border-white/20 hover:border-white/70 motion-interactive active:scale-95 text-[0.625rem] font-medium flex items-end justify-center overflow-hidden px-1 pb-1"
              :class="activeBackgroundId === background.id ? 'ring-2 ring-ios-blue ring-offset-1 ring-offset-black/20' : ''"
              :style="previewStyle(background)"
              :title="background.copyright || background.label"
            >
              <span class="max-w-full truncate rounded-md bg-black/50 px-1.5 py-0.5 text-white">{{ background.label }}</span>
            </button>
          </div>
        </section>

         <label class="w-full h-8 rounded-xl liquid-glass-inset flex items-center justify-center text-[0.625rem] text-slate-500 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white cursor-pointer motion-interactive text-glass-sm">
          自定义图片...
          <input type="file" accept="image/*" class="hidden" @change="onCustom" />
        </label>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { IconPhoto } from '@tabler/icons-vue';
import { useHideOnScroll } from '../composables/useHideOnScroll';

const BACKGROUND_STORAGE_KEY = 'prohub-background';
const emit = defineEmits(['change']);

// 滚动隐藏（同顶栏），但展开面板时保持显示
const { hidden: scrollHidden } = useHideOnScroll();
const open = ref(false);
const barHidden = computed(() => scrollHidden.value && !open.value);

const switcherRef = ref(null);
const activeBackgroundId = ref('');
const bingWallpapers = ref([]);
const bingLoading = ref(false);
const bingError = ref('');

const solidPresets = [
  { id: 'solid-white', label: '纯白', color: '#FFFFFF', textColor: '#252525' },
  { id: 'solid-deep-gray', label: '纯深灰', color: '#1C1C1E', textColor: '#FFFFFF' },
  { id: 'solid-light-gray', label: '纯浅灰', color: '#F2F2F7', textColor: '#252525' },
  { id: 'solid-black', label: '纯黑', color: '#000000', textColor: '#FFFFFF' },
];

const defaultWallpaper = {
  id: 'local-space',
  label: '太空壁纸',
  imageUrl: '/wallpaper.jpg',
  textColor: '#FFFFFF',
};

const allKnownBackgrounds = computed(() => [
  ...solidPresets,
  defaultWallpaper,
  ...bingWallpapers.value,
]);

function previewStyle(background) {
  const style = {
    color: background.textColor || '#FFFFFF',
    backgroundColor: background.color || '#111827',
  };
  if (background.imageUrl) {
    style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.45)), url("${background.imageUrl}")`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  }
  return style;
}

function applyBodyBackground(background) {
  const rootStyle = document.documentElement.style;
  const bodyStyle = document.body.style;
  const imageUrl = background.imageUrl || '';
  rootStyle.setProperty('--prohub-background-image', imageUrl ? `url("${imageUrl}")` : 'none');
  rootStyle.setProperty('--prohub-background-color', background.color || (imageUrl ? '#111827' : '#F2F2F7'));
  bodyStyle.backgroundImage = 'none';
  bodyStyle.backgroundColor = 'transparent';
  document.body.dataset.backgroundId = background.id;
}

function applyBackground(background, options = {}) {
  if (!background) return;
  applyBodyBackground(background);
  activeBackgroundId.value = background.id;
  if (options.persist !== false) {
    // 存完整 JSON（imageUrl + color + textColor），刷新时 index.html 内联 JS 和
    // onMounted 均可直接恢复，无需等 Bing 数据异步加载，消除"先闪太空壁纸再变用户壁纸"
    window.localStorage.setItem(BACKGROUND_STORAGE_KEY, JSON.stringify({
      id: background.id,
      imageUrl: background.imageUrl || '',
      color: background.color || '',
      textColor: background.textColor || '#FFFFFF',
      label: background.label || '',
    }));
  }
  emit('change', background);
  try {
    window.dispatchEvent(new CustomEvent('prohub:background-changed', { detail: { id: background.id } }));
  } catch {}
}

function findBackground(id) {
  return allKnownBackgrounds.value.find((background) => background.id === id);
}

// 解析 localStorage 中的壁纸 JSON（兼容旧格式：纯 id 字符串自动忽略）
function parseStoredBackground() {
  try {
    const raw = window.localStorage.getItem(BACKGROUND_STORAGE_KEY);
    if (!raw) return null;
    const bg = JSON.parse(raw);
    if (!bg || typeof bg !== 'object') return null;
    return bg;
  } catch {
    return null;
  }
}

function onCustom(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  const imageUrl = URL.createObjectURL(file);
  applyBodyBackground({ id: 'custom', imageUrl, textColor: '#FFFFFF' });
  activeBackgroundId.value = 'custom';
  window.localStorage.removeItem(BACKGROUND_STORAGE_KEY);
  emit('change', { id: 'custom', imageUrl });
}

async function loadBingWallpapers() {
  bingLoading.value = true;
  bingError.value = '';
  try {
    const response = await fetch('/api/wallpapers?count=7&mkt=zh-CN', {
      headers: { Accept: 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '壁纸接口请求失败');
    bingWallpapers.value = (data.items || []).map((item) => ({
      ...item,
      id: `bing:${item.startDate}`,
      label: item.title || item.startDate,
      textColor: '#FFFFFF',
    }));
    // 壁纸已在 onMounted 从 localStorage JSON 直接恢复，Bing 数据加载后
    // 只需同步高亮选中项，不再重新 applyBackground（避免二次闪烁）
    const stored = parseStoredBackground();
    if (stored) activeBackgroundId.value = stored.id;
  } catch (error) {
    bingError.value = error.message || '壁纸加载失败';
  } finally {
    bingLoading.value = false;
  }
}

function onClickOutside(event) {
  if (open.value && switcherRef.value && !switcherRef.value.contains(event.target)) {
    open.value = false;
  }
}

onMounted(() => {
  // 直接从 localStorage JSON 恢复壁纸（index.html 内联 JS 已先行设好 CSS 变量，
  // 此处同步应用状态 + 高亮，无需等 Bing 数据加载，消除闪烁）
  const stored = parseStoredBackground();
  if (stored && (stored.imageUrl || stored.color)) {
    applyBackground(stored, { persist: false });
  } else {
    applyBackground(defaultWallpaper, { persist: false });
  }
  loadBingWallpapers();
  document.addEventListener('click', onClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside);
});
</script>

<style scoped>
/* 与顶栏一致的下滑隐藏动画（340ms cubic-bezier），向下滑出视口底部 + 渐隐更柔和 */
.floating-bar-root {
  transition: transform 340ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease;
}

.floating-bar-hidden {
  transform: translateY(calc(100% + 1.5rem + env(safe-area-inset-bottom)));
  opacity: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .floating-bar-root {
    transition: none;
  }
}

.switcher-enter-active { transition: all 0.2s ease-out; }
.switcher-leave-active { transition: all 0.15s ease-in; }
.switcher-enter-from, .switcher-leave-to { opacity: 0; transform: translateY(8px); }
</style>
