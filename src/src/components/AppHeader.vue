<template>
  <header class="sticky top-3 z-50 mx-auto max-w-[95%] liquid-glass-strong">
    <div class="px-5 sm:px-6">
      <div class="flex items-center justify-between h-14">
        <router-link to="/" class="flex items-center gap-2.5 group shrink-0">
          <div class="w-8 h-8 rounded-[10px] bg-ios-blue flex items-center justify-center shadow-md shadow-ios-blue/25">
            <IconBox class="w-4.5 h-4.5 text-white" />
          </div>
          <span class="text-[1.0625rem] font-bold tracking-[-0.022em] text-white text-glass whitespace-nowrap">proHub</span>
        </router-link>

        <nav class="hidden md:flex items-center gap-6 mx-4">
          <router-link to="/" class="text-[0.8125rem] font-medium tracking-[-0.01em] text-zinc-300 text-glass-sm hover:text-white transition-colors whitespace-nowrap">首页</router-link>
          <a href="#tools" class="text-[0.8125rem] font-medium tracking-[-0.01em] text-zinc-300 text-glass-sm hover:text-white transition-colors whitespace-nowrap">工具</a>
          <a href="https://github.com/paynehe3023/prohub" target="_blank" rel="noopener" class="text-[0.8125rem] font-medium tracking-[-0.01em] text-zinc-300 text-glass-sm hover:text-white transition-colors whitespace-nowrap">GitHub</a>
        </nav>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="px-2 py-1.5 text-[0.8125rem] font-medium text-zinc-300 text-glass-sm hover:text-white motion-interactive"
            @click="aboutOpen = true"
          >
            关于
          </button>
          <button @click="toggleDark" class="w-8 h-8 rounded-full liquid-glass-inset flex items-center justify-center hover:shadow-md active:scale-[0.95] motion-interactive"
            :title="isDark ? '暗黑' : '亮色'">
            <IconSun v-if="isDark" class="w-3.5 h-3.5 text-ios-yellow" />
            <IconMoon v-else class="w-3.5 h-3.5 text-white/70" />
          </button>
        </div>
      </div>
    </div>
  </header>

  <Teleport to="body">
    <Transition name="about-modal">
      <div
        v-if="aboutOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
        role="presentation"
        @click.self="aboutOpen = false"
      >
        <section
          class="liquid-glass w-full max-w-lg overflow-hidden text-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-title"
        >
          <div class="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
            <div>
              <p class="text-[0.6875rem] uppercase tracking-[0.2em] text-ios-blue">About proHub</p>
              <h2 id="about-title" class="mt-1 text-xl font-semibold text-glass">让创作与效率回归纯粹</h2>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full liquid-glass-inset text-zinc-400 motion-interactive hover:text-white"
              aria-label="关闭关于弹窗"
              @click="aboutOpen = false"
            >
              <IconX class="h-4 w-4" />
            </button>
          </div>

          <div class="space-y-5 px-6 py-5">
            <p class="text-sm leading-7 text-zinc-300">
              专注于为自媒体创作者与极客玩家打造的高效、安全、离线全能工作台，让创作与效率回归纯粹。
            </p>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl liquid-glass-inset p-4">
                <IconShieldCheck class="h-5 w-5 text-ios-green" />
                <h3 class="mt-3 text-sm font-semibold text-white">100% 纯前端 / 本地运行</h3>
                <p class="mt-1.5 text-xs leading-5 text-zinc-400">数据隐私绝不出本地，安全无忧。</p>
              </div>
              <div class="rounded-2xl liquid-glass-inset p-4">
                <IconBolt class="h-5 w-5 text-ios-yellow" />
                <h3 class="mt-3 text-sm font-semibold text-white">极速无广告</h3>
                <p class="mt-1.5 text-xs leading-5 text-zinc-400">即开即用，无强制登录与复杂打扰。</p>
              </div>
            </div>

            <div class="rounded-2xl border border-ios-blue/20 bg-ios-blue/10 p-4">
              <p class="text-sm leading-6 text-zinc-200">
                支持定制化工具开发、品牌合作及商务对接，也欢迎请作者喝杯咖啡。
              </p>
            </div>
          </div>

          <div class="border-t border-white/10 bg-black/10 px-6 py-5">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="flex min-w-0 items-start gap-3">
              <IconMail class="mt-0.5 h-5 w-5 shrink-0 text-ios-blue" />
              <div class="min-w-0 flex-1">
                <p class="text-sm leading-6 text-zinc-200">在使用过程中有任何问题、建议或商务需求，欢迎随时联系！</p>
                  <div class="mt-2 flex flex-wrap items-center gap-2.5">
                    <p class="break-all text-sm font-medium text-white">paynehe3023@gmail.com</p>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-xl bg-ios-blue px-3 py-2 text-xs font-semibold text-white shadow-md shadow-ios-blue/25 motion-interactive hover:bg-[#3385FF] active:scale-[0.98]"
                      @click="copyEmail"
                    >
                      <IconCheck v-if="emailCopied" class="h-3.5 w-3.5" />
                      <IconCopy v-else class="h-3.5 w-3.5" />
                      {{ emailCopied ? '已复制' : '复制邮箱' }}
                    </button>
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
import { onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { IconBox, IconSun, IconMoon, IconX, IconShieldCheck, IconBolt, IconMail, IconCopy, IconCheck } from '@tabler/icons-vue';
const isDark = ref(false);
const aboutOpen = ref(false);
const emailCopied = ref(false);
let emailCopiedTimer = null;
watchEffect(() => {
  const s = localStorage.getItem('prohub-dark');
  isDark.value = s !== null ? s === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', isDark.value);
});
function toggleDark() {
  isDark.value = !isDark.value;
  localStorage.setItem('prohub-dark', String(isDark.value));
  document.documentElement.classList.toggle('dark', isDark.value);
}
async function copyEmail() {
  const email = 'paynehe3023@gmail.com';
  try {
    await navigator.clipboard.writeText(email);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = email;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  emailCopied.value = true;
  if (emailCopiedTimer) window.clearTimeout(emailCopiedTimer);
  emailCopiedTimer = window.setTimeout(() => {
    emailCopied.value = false;
    emailCopiedTimer = null;
  }, 1800);
}
function handleKeydown(event) {
  if (event.key === 'Escape') aboutOpen.value = false;
}
onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  if (emailCopiedTimer) window.clearTimeout(emailCopiedTimer);
});
</script>

<style scoped>
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
