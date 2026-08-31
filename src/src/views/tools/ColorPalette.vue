<template>
  <div class="theme-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
    <BreadcrumbNav label="调色板生成器" />

    <div class="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
      <section class="space-y-4">
        <div class="liquid-glass p-5 space-y-5">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-inset text-[0.75rem] text-zinc-300 text-glass-sm mb-3">
              <IconPalette class="w-4 h-4 text-ios-blue" />
              纯前端 · 即时生成
            </div>
            <h1 class="text-2xl font-bold text-white tracking-[-0.03em] text-glass">调色板生成器</h1>
            <p class="mt-2 text-[0.875rem] text-zinc-400 leading-relaxed text-glass-sm">输入一个基础色，快速生成和谐的配色方案，并导出到你的项目中。</p>
          </div>

          <div>
            <label class="block text-[0.8125rem] font-medium text-zinc-300 text-glass-sm mb-2">基础色</label>
            <div class="flex gap-2">
              <input v-model="baseColor" type="color" class="w-12 h-12 shrink-0 rounded-[16px] cursor-pointer bg-transparent" aria-label="选择基础色" />
              <input v-model="baseColor" type="text" maxlength="7" spellcheck="false" class="min-w-0 flex-1 px-4 py-3 rounded-[16px] liquid-glass-inset text-white uppercase outline-none" :class="isValidColor ? '' : 'border border-ios-red/60'" aria-label="基础色十六进制值" />
            </div>
            <p v-if="!isValidColor" class="mt-1.5 text-[0.75rem] text-ios-red text-glass-sm">请输入有效的十六进制颜色值</p>
          </div>

          <div>
            <p class="text-[0.8125rem] font-medium text-zinc-300 text-glass-sm mb-2">配色方案</p>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="scheme in schemes" :key="scheme.key" type="button" @click="schemeKey = scheme.key" class="px-3 py-2.5 rounded-[16px] text-left transition-all" :class="schemeKey === scheme.key ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/20' : 'liquid-glass-inset text-zinc-300 hover:text-white'">
                <span class="block text-[0.8125rem] font-medium">{{ scheme.label }}</span>
                <span class="block text-[0.6875rem] opacity-70 mt-0.5">{{ scheme.desc }}</span>
              </button>
            </div>
          </div>

          <button type="button" @click="randomize" class="btn-ios btn-ios-primary w-full">随机基础色</button>
        </div>

        <div class="liquid-glass p-5 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-white text-glass">导出调色板</h2>
              <p class="text-[0.75rem] text-zinc-500 text-glass-sm">复制后直接用于项目代码</p>
            </div>
            <span v-if="copyHint" class="text-[0.75rem] text-ios-green text-glass-sm">{{ copyHint }}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button v-for="format in formats" :key="format.key" type="button" @click="copyExport(format.key)" class="btn-ios btn-ios-glass inline-flex items-center gap-2">
              <IconCheck v-if="copyHint === format.label" class="w-4 h-4 text-ios-green" />
              <IconCopy v-else class="w-4 h-4" />
              {{ format.label }}
            </button>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="liquid-glass p-4"><p class="text-[0.75rem] text-zinc-500 text-glass-sm">方案</p><p class="mt-1 text-lg font-bold text-white text-glass">{{ activeScheme.label }}</p></div>
          <div class="liquid-glass p-4"><p class="text-[0.75rem] text-zinc-500 text-glass-sm">颜色数量</p><p class="mt-1 text-2xl font-bold text-white text-glass">{{ palette.length }}</p></div>
          <div class="liquid-glass p-4"><p class="text-[0.75rem] text-zinc-500 text-glass-sm">基础色</p><p class="mt-1 text-lg font-bold text-white uppercase text-glass">{{ normalizedColor }}</p></div>
          <div class="liquid-glass p-4"><p class="text-[0.75rem] text-zinc-500 text-glass-sm">对比色</p><p class="mt-1 text-lg font-bold text-white uppercase text-glass">{{ palette[palette.length - 1] }}</p></div>
        </div>

        <div class="liquid-glass p-5 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div><h2 class="text-base font-semibold text-white text-glass">颜色预览</h2><p class="text-[0.75rem] text-zinc-500 text-glass-sm">点击色块可复制颜色值</p></div>
            <span class="text-[0.75rem] px-2.5 py-1 rounded-full liquid-glass-inset text-zinc-400 text-glass-sm">{{ activeScheme.label }}</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <button v-for="(color, index) in palette" :key="color" type="button" @click="copyColor(color)" class="group text-left overflow-hidden rounded-[20px] liquid-glass-inset transition-transform hover:-translate-y-1">
              <span class="block h-28 sm:h-36" :style="{ backgroundColor: color }"></span>
              <span class="block p-3"><span class="block text-[0.6875rem] text-zinc-500 text-glass-sm">COLOR {{ index + 1 }}</span><span class="block mt-1 text-[0.8125rem] font-semibold text-white uppercase text-glass">{{ color }}</span></span>
            </button>
          </div>
        </div>

        <div class="liquid-glass p-5 space-y-4">
          <div><h2 class="text-base font-semibold text-white text-glass">渐变预览</h2><p class="text-[0.75rem] text-zinc-500 text-glass-sm">使用生成的首尾颜色创建 CSS 渐变</p></div>
          <div class="h-36 rounded-[22px] border border-white/10 shadow-inner" :style="{ background: gradient }"></div>
          <div class="flex items-center justify-between gap-3 rounded-[16px] liquid-glass-inset px-4 py-3"><code class="min-w-0 truncate text-[0.75rem] text-zinc-300 text-glass-sm">{{ gradient }}</code><button type="button" @click="copyGradient" class="shrink-0 text-[0.75rem] text-ios-blue hover:text-white transition-colors">复制</button></div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useHead } from '@vueuse/head';
import { IconPalette, IconCopy, IconCheck } from '@tabler/icons-vue';
import BreadcrumbNav from '../../components/BreadcrumbNav.vue';

useHead({ title: '调色板生成器 - proHub', meta: [{ name: 'description', content: '在线调色板生成器，支持多种配色方案、渐变预览和 CSS、JSON、Tailwind 导出。' }, { name: 'keywords', content: '调色板,配色,渐变色,CSS,Tailwind,颜色工具' }] });

const baseColor = ref('#3B82F6');
const schemeKey = ref('complementary');
const copyHint = ref('');
const schemes = [{ key: 'complementary', label: '互补色', desc: '高对比 · 视觉醒目' }, { key: 'analogous', label: '类似色', desc: '协调 · 自然柔和' }, { key: 'triadic', label: '三角色', desc: '平衡 · 活泼丰富' }, { key: 'monochromatic', label: '单色阶', desc: '统一 · 简洁优雅' }];
const formats = [{ key: 'css', label: 'CSS' }, { key: 'json', label: 'JSON' }, { key: 'tailwind', label: 'Tailwind' }];
const isValidColor = computed(() => /^#[\da-f]{6}$/i.test(baseColor.value));
const normalizedColor = computed(() => isValidColor.value ? baseColor.value.toUpperCase() : '#3B82F6');
const activeScheme = computed(() => schemes.find((item) => item.key === schemeKey.value) || schemes[0]);

function hexToHsl(hex) {
  const values = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(...values); const min = Math.min(...values); const d = max - min; let h = 0; const l = (max + min) / 2;
  if (d) { h = max === values[0] ? ((values[1] - values[2]) / d) % 6 : max === values[1] ? (values[2] - values[0]) / d + 2 : (values[0] - values[1]) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l];
}
function hslToHex(h, s, l) { const c = (1 - Math.abs(2 * l - 1)) * s; const x = c * (1 - Math.abs((h / 60) % 2 - 1)); const m = l - c / 2; const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return `#${rgb.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase(); }
const palette = computed(() => { const [h, s] = hexToHsl(normalizedColor.value); const hues = { complementary: [h, h + 180, h + 180, h], analogous: [h - 30, h, h + 30, h + 60], triadic: [h, h + 120, h + 240, h + 60], monochromatic: [h, h, h, h] }[schemeKey.value]; const lightness = schemeKey.value === 'monochromatic' ? [0.28, 0.45, 0.62, 0.78] : [0.26, 0.42, 0.58, 0.74]; return hues.map((hue, index) => index === 1 && schemeKey.value !== 'monochromatic' ? normalizedColor.value : hslToHex((hue + 360) % 360, Math.max(s, 0.38), lightness[index])); });
const gradient = computed(() => `linear-gradient(135deg, ${palette.value[0]} 0%, ${palette.value[1]} 50%, ${palette.value[palette.value.length - 1]} 100%)`);

function randomize() { baseColor.value = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`.toUpperCase(); }
async function copyText(text, hint) { try { await navigator.clipboard.writeText(text); copyHint.value = hint; window.setTimeout(() => { copyHint.value = ''; }, 1800); } catch { copyHint.value = '复制失败'; } }
function copyColor(color) { copyText(color, color); }
function copyGradient() { copyText(`background: ${gradient.value};`, '渐变已复制'); }
function copyExport(format) { const colors = palette.value; const content = format === 'css' ? `:root {\n${colors.map((color, index) => `  --color-${index + 1}: ${color};`).join('\n')}\n}` : format === 'json' ? JSON.stringify({ scheme: activeScheme.value.key, colors }, null, 2) : `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n${colors.map((color, index) => `        palette-${index + 1}: '${color}',`).join('\n')}\n      }\n    }\n  }\n}`; copyText(content, formats.find((item) => item.key === format).label); }
</script>
