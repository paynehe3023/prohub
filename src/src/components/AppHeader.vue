<template>
  <header
    class="relative sticky top-3 z-50 mx-auto max-w-[95%] liquid-glass-strong bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800"
    :class="{ 'app-header-hidden': headerHidden }"
  >
    <div class="px-5 sm:px-6">
      <div class="flex items-center justify-between h-14">
        <router-link to="/" class="flex items-center gap-2.5 group shrink-0">
          <div class="w-8 h-8 rounded-[10px] bg-blue-600 flex items-center justify-center shadow-md">
            <svg class="h-6 w-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M8.5 6.5h8.3c5.2 0 8.7 3.2 8.7 8.1 0 5-3.6 8.3-8.9 8.3H14v4.6H8.5V6.5Zm5.5 4.7v7.1h2.45c2.3 0 3.65-1.3 3.65-3.65 0-2.25-1.35-3.45-3.65-3.45H14Z" fill="white"/>
            </svg>
          </div>
          <span class="text-[1.0625rem] font-bold tracking-[-0.022em] text-slate-900 dark:text-white whitespace-nowrap">proHub</span>
        </router-link>

        <div class="flex items-center gap-6 shrink-0 pl-5 md:pl-0">
          <div class="relative hidden md:block md:ml-6">

            <IconSearch class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input v-model="searchQuery" type="search" placeholder="找不到？点击搜一搜" aria-label="搜索功能" class="w-52 rounded-full border border-slate-200 bg-white/70 py-2 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-ios-blue dark:border-slate-700 dark:bg-slate-800/70 dark:text-white" />
            <div v-if="searchQuery" class="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <router-link v-for="tool in searchResults" :key="tool.id" :to="tool.route" class="block rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800" @click="searchQuery = ''">
                <span class="block text-sm font-semibold text-slate-900 dark:text-white">{{ tool.title }}</span>
                <span class="block truncate text-xs text-slate-500 dark:text-zinc-400">{{ tool.desc }}</span>
              </router-link>
              <p v-if="searchResults.length === 0" class="px-3 py-2 text-xs text-slate-500 dark:text-zinc-400">未找到相关功能</p>
            </div>
          </div>
          <Transition name="mobile-search">
            <div v-if="searchOpen" class="absolute left-5 right-5 top-2 z-50 md:hidden">
              <div class="relative">
                <IconSearch class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input ref="mobileSearchInput" v-model="searchQuery" type="search" autofocus placeholder="找不到？点击搜一搜" aria-label="搜索功能" class="w-full rounded-full border border-slate-200 bg-white/95 py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-xl outline-none dark:border-slate-700 dark:bg-slate-900/95 dark:text-white" />
                <div v-if="searchQuery" class="absolute left-0 right-0 top-[calc(100%+0.5rem)] max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <router-link v-for="tool in searchResults" :key="tool.id" :to="tool.route" class="block rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800" @click="searchOpen = false; searchQuery = ''">
                    <span class="block text-sm font-semibold text-slate-900 dark:text-white">{{ tool.title }}</span>
                    <span class="block truncate text-xs text-slate-500 dark:text-zinc-400">{{ tool.desc }}</span>
                  </router-link>
                  <p v-if="searchResults.length === 0" class="px-3 py-2 text-xs text-slate-500 dark:text-zinc-400">未找到相关功能</p>
                </div>
              </div>
            </div>
          </Transition>
          <button class="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-inset hover:shadow-md active:scale-[0.95] motion-interactive md:hidden" aria-label="搜索功能" title="搜索功能" @click="toggleMobileSearch">
            <IconSearch class="h-4 w-4 text-slate-500 dark:text-zinc-300" />
          </button>
          <button @click="cycleTheme" class="w-8 h-8 rounded-full liquid-glass-inset flex items-center justify-center hover:shadow-md active:scale-[0.95] motion-interactive"
            :title="`当前主题：${themeMode}`">
            <IconSun v-if="isDark" class="w-3.5 h-3.5 text-yellow-500" />
            <IconMoon v-else class="w-3.5 h-3.5 text-slate-500 dark:text-white/70" />
          </button>
        </div>
      </div>
    </div>
  </header>

  <Teleport to="body">
    <Transition name="about-modal">
      <div
        v-if="aboutOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/25 p-4 dark:bg-black/55"
        role="presentation"
        @click.self="aboutOpen = false"
      >
        <section
          class="liquid-glass w-full max-w-lg max-h-[80dvh] overflow-y-auto text-slate-900 dark:text-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-title"
        >
          <div class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/90 px-6 py-5 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/90">
            <div>
              <p class="text-[0.6875rem] uppercase tracking-[0.2em] text-ios-blue">About proHub</p>
              <h2 id="about-title" class="mt-1 text-xl font-semibold text-glass">让创作与效率回归纯粹</h2>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full liquid-glass-inset text-slate-500 motion-interactive hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white"
              aria-label="关闭关于弹窗"
              @click="aboutOpen = false"
            >
              <IconX class="h-4 w-4" />
            </button>
          </div>

          <div class="space-y-5 px-6 py-5">
            <p class="text-sm leading-7 text-slate-600 dark:text-zinc-300">
              专注于为自媒体创作者与极客玩家打造的高效、安全、离线全能工作台，让创作与效率回归纯粹。
            </p>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl liquid-glass-inset p-4">
                <IconShieldCheck class="h-5 w-5 text-ios-green" />
                <h3 class="mt-3 text-sm font-semibold text-slate-900 dark:text-white">100% 纯前端 / 本地运行</h3>
                <p class="mt-1.5 text-xs leading-5 text-slate-500 dark:text-zinc-400">数据隐私绝不出本地，安全无忧。</p>
              </div>
              <div class="rounded-2xl liquid-glass-inset p-4">
                <IconBolt class="h-5 w-5 text-ios-yellow" />
                <h3 class="mt-3 text-sm font-semibold text-slate-900 dark:text-white">极速无广告</h3>
                <p class="mt-1.5 text-xs leading-5 text-slate-500 dark:text-zinc-400">即开即用，无强制登录与复杂打扰。</p>
              </div>
            </div>

            <div class="rounded-2xl border border-ios-blue/20 bg-ios-blue/10 p-4">
              <p class="text-sm leading-6 text-slate-700 dark:text-zinc-200">
                支持定制化工具开发、品牌合作及商务对接，也欢迎请作者喝杯咖啡。
              </p>
            </div>
          </div>

          <div class="border-t border-slate-200 bg-slate-50/60 px-6 py-5 dark:border-white/10 dark:bg-black/10">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="flex min-w-0 items-start gap-3">
                <IconMail class="mt-0.5 h-5 w-5 shrink-0 text-ios-blue" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm leading-6 text-slate-700 dark:text-zinc-200">在使用过程中有任何问题、建议或商务需求，欢迎随时联系！</p>
                  <div class="mt-3 space-y-2.5">
                    <div class="flex flex-wrap items-center gap-2.5">
                      <a href="mailto:paynehe3023@gmail.com" class="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-slate-900 hover:text-ios-blue dark:text-white dark:hover:text-ios-blue">
                        <img src="/Gmail.svg" alt="" class="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span class="break-all">paynehe3023@gmail.com</span>
                      </a>
                      <button type="button" class="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-ios-blue px-3 py-2 text-xs font-semibold text-white shadow-md shadow-ios-blue/25 motion-interactive hover:bg-[#3385FF] active:scale-[0.98]" @click="copyContact('paynehe3023@gmail.com', 'email')">
                        <IconCheck v-if="emailCopied" class="h-3.5 w-3.5" /><IconCopy v-else class="h-3.5 w-3.5" />
                        {{ emailCopied ? '已复制' : '复制' }}
                      </button>
                    </div>
                    <div class="flex flex-wrap items-center gap-2.5">
                      <span class="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                         <img src="/QQ.svg" alt="" class="h-5 w-5 shrink-0" aria-hidden="true" />
                         <span>947919822</span>
                       </span>
                       <button type="button" class="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-ios-blue px-3 py-2 text-xs font-semibold text-white shadow-md shadow-ios-blue/25 motion-interactive hover:bg-[#3385FF] active:scale-[0.98]" @click="copyContact('947919822', 'qq')">
                        <IconCheck v-if="qqCopied" class="h-3.5 w-3.5" /><IconCopy v-else class="h-3.5 w-3.5" />
                        {{ qqCopied ? '已复制' : '复制' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useTheme } from '../composables/useTheme';
import { useHideOnScroll } from '../composables/useHideOnScroll';
import { tools } from '../config/tools';
import { IconSun, IconMoon, IconX, IconShieldCheck, IconBolt, IconMail, IconCopy, IconCheck, IconSearch } from '@tabler/icons-vue';

const { isDark, themeMode, cycleTheme } = useTheme();
const searchQuery = ref('');
const searchOpen = ref(false);
const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase();
  if (!query) return [];
  return tools.filter((tool) => [tool.title, tool.desc, tool.category, ...(tool.keywords || [])].join(' ').toLocaleLowerCase().includes(query));
});

const aboutOpen = ref(false);
const emailCopied = ref(false);
const qqCopied = ref(false);
let emailCopiedTimer = null;
let qqCopiedTimer = null;

async function copyContact(value, type) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  const copiedState = type === 'qq' ? qqCopied : emailCopied;
  const timerKey = type === 'qq' ? 'qq' : 'email';
  copiedState.value = true;
  if (timerKey === 'qq') {
    if (qqCopiedTimer) window.clearTimeout(qqCopiedTimer);
    qqCopiedTimer = window.setTimeout(() => { qqCopied.value = false; qqCopiedTimer = null; }, 1800);
  } else {
    if (emailCopiedTimer) window.clearTimeout(emailCopiedTimer);
    emailCopiedTimer = window.setTimeout(() => { emailCopied.value = false; emailCopiedTimer = null; }, 1800);
  }
}

async function toggleMobileSearch() {
  searchOpen.value = !searchOpen.value;
  if (searchOpen.value) {
    await nextTick();
    mobileSearchInput.value?.focus();
  }
}

function handleKeydown(event) {
  if (event.key !== 'Escape') return;
  aboutOpen.value = false;
}

function handleAboutRequest() {
  aboutOpen.value = true;
}

// 滚动隐藏逻辑与底部浮动按钮共用（累积距离制，见 useHideOnScroll.js）
const { hidden: headerHidden } = useHideOnScroll();

// Esc 关闭关于弹窗
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('prohub:open-about', handleAboutRequest);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('prohub:open-about', handleAboutRequest);
  if (emailCopiedTimer) window.clearTimeout(emailCopiedTimer);
  if (qqCopiedTimer) window.clearTimeout(qqCopiedTimer);
});
</script>

<style scoped>
header {
  transition: transform 340ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease;
  will-change: transform, opacity;
}

.app-header-hidden {
  /* 位移 + 渐隐双过渡：仅靠 translateY 会被藏到移动端浏览器地址栏后面，
     视觉上像"没消失"；叠加 opacity 渐隐才是真正的消失动画。 */
  transform: translateY(calc(-100% - 0.75rem - env(safe-area-inset-top)));
  opacity: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  header {
    transition: none;
  }
}

.about-modal-enter-active,
.about-modal-leave-active {
  transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.about-modal-enter-active section,
.about-modal-leave-active section {
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.about-modal-enter-from,
.about-modal-leave-to {
  opacity: 0;
}

.about-modal-enter-from section,
.about-modal-leave-to section {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

</style>
