<template>
  <div class="theme-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
    <BreadcrumbNav label="文本格式化工具" />

    <div class="space-y-4">
      <section class="liquid-glass p-5">
        <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-inset text-[0.75rem] text-zinc-300 text-glass-sm mb-3">
              <IconFileText class="w-4 h-4 text-ios-blue" />
              纯前端 · 安全处理
            </div>
            <h1 class="text-2xl font-bold text-white tracking-[-0.03em] text-glass">文本格式化工具</h1>
            <p class="mt-2 text-[0.875rem] text-zinc-400 leading-relaxed text-glass-sm">JSON、Base64、URL 与文本统计，一站式完成常见文本处理。</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button v-for="mode in modes" :key="mode.key" type="button" @click="activeMode = mode.key" class="px-3 py-2 rounded-full text-[0.8125rem] font-medium transition-all" :class="activeMode === mode.key ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/20' : 'liquid-glass-inset text-zinc-300 hover:text-white'">{{ mode.label }}</button>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section class="liquid-glass p-5 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div><h2 class="text-base font-semibold text-white text-glass">输入文本</h2><p class="text-[0.75rem] text-zinc-500 text-glass-sm">{{ modeDescription }}</p></div>
            <button type="button" @click="clearText" class="text-[0.75rem] text-zinc-400 hover:text-white transition-colors">清空</button>
          </div>
          <textarea v-model="inputText" spellcheck="false" class="w-full min-h-[360px] resize-y rounded-[20px] liquid-glass-inset p-4 text-[0.875rem] leading-relaxed text-white placeholder:text-zinc-500 outline-none font-mono" :placeholder="placeholder"></textarea>
          <div class="flex flex-wrap gap-2">
            <button v-for="action in actions" :key="action.key" type="button" @click="runAction(action.key)" class="btn-ios btn-ios-primary inline-flex items-center gap-2">{{ action.label }}</button>
          </div>
        </section>

        <section class="liquid-glass p-5 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div><h2 class="text-base font-semibold text-white text-glass">处理结果</h2><p class="text-[0.75rem] text-zinc-500 text-glass-sm">{{ statusMessage }}</p></div>
            <div class="flex gap-2">
              <button type="button" @click="copyResult" class="btn-ios btn-ios-glass inline-flex items-center gap-2"><IconCheck v-if="copyHint" class="w-4 h-4 text-ios-green" /><IconCopy v-else class="w-4 h-4" />{{ copyHint || '复制' }}</button>
              <button type="button" @click="downloadResult" class="btn-ios btn-ios-glass inline-flex items-center gap-2"><IconDownload class="w-4 h-4" />下载</button>
            </div>
          </div>
          <textarea v-model="resultText" readonly spellcheck="false" class="w-full min-h-[360px] resize-y rounded-[20px] liquid-glass-inset p-4 text-[0.875rem] leading-relaxed text-white outline-none font-mono"></textarea>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div class="liquid-glass-inset p-3"><p class="text-[0.6875rem] text-zinc-500 text-glass-sm">字符数</p><p class="mt-1 text-lg font-semibold text-white text-glass">{{ stats.characters }}</p></div>
            <div class="liquid-glass-inset p-3"><p class="text-[0.6875rem] text-zinc-500 text-glass-sm">UTF-8 字节</p><p class="mt-1 text-lg font-semibold text-white text-glass">{{ stats.bytes }}</p></div>
            <div class="liquid-glass-inset p-3"><p class="text-[0.6875rem] text-zinc-500 text-glass-sm">行数</p><p class="mt-1 text-lg font-semibold text-white text-glass">{{ stats.lines }}</p></div>
            <div class="liquid-glass-inset p-3"><p class="text-[0.6875rem] text-zinc-500 text-glass-sm">词数</p><p class="mt-1 text-lg font-semibold text-white text-glass">{{ stats.words }}</p></div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useHead } from '@vueuse/head';
import { IconFileText, IconCopy, IconCheck, IconDownload } from '@tabler/icons-vue';
import BreadcrumbNav from '../../components/BreadcrumbNav.vue';

const description = '在线文本格式化工具，支持 JSON 格式化、压缩、校验、UTF-8 Base64、URL 编解码、文本统计和复制下载。';
useHead({ title: '文本格式化工具 - proHub', meta: [{ name: 'description', content: description }, { name: 'keywords', content: 'JSON格式化,Base64,URL编解码,文本统计,文本工具' }] });

const modes = [{ key: 'json', label: 'JSON' }, { key: 'base64', label: 'Base64' }, { key: 'url', label: 'URL' }, { key: 'text', label: '文本处理' }, { key: 'stats', label: '文本统计' }];
const activeMode = ref('json');
const inputText = ref('{\n  "name": "proHub",\n  "type": "toolbox"\n}');
const resultText = ref(inputText.value);
const statusMessage = ref('输入内容后选择操作');
const copyHint = ref('');
const modeDescription = computed(() => ({ json: '格式化、压缩或校验 JSON 数据', base64: '使用 UTF-8 安全处理中文文本', url: '编码或还原 URL 与查询参数', text: '转换大小写或清理多余空白', stats: '实时查看文本规模与字符构成' }[activeMode.value]));
const placeholder = computed(() => ({ json: '{"key":"value"}', base64: '请输入要编码或解码的文本', url: 'https://example.com/search?q=你好', text: '请输入需要处理的文本', stats: '请输入或粘贴需要统计的文本' }[activeMode.value]));
const actions = computed(() => ({ json: [{ key: 'format', label: '格式化' }, { key: 'minify', label: '压缩' }, { key: 'validate', label: '校验' }], base64: [{ key: 'encode', label: '编码' }, { key: 'decode', label: '解码' }], url: [{ key: 'encode', label: '编码' }, { key: 'decode', label: '解码' }], text: [{ key: 'upper', label: '转大写' }, { key: 'lower', label: '转小写' }, { key: 'trim', label: '清理首尾空白' }, { key: 'collapse', label: '合并多余空白' }], stats: [{ key: 'analyze', label: '更新统计' }] }[activeMode.value]));
const stats = computed(() => { const value = resultText.value || inputText.value; return { characters: [...value].length, bytes: new TextEncoder().encode(value).length, lines: value ? value.split(/\r\n|\r|\n/).length : 0, words: value.trim() ? value.trim().split(/\s+/).length : 0 }; });

function parseJson() { return JSON.parse(inputText.value); }
function runAction(action) {
  try {
    if (activeMode.value === 'json') {
      const data = parseJson();
      if (action === 'format') resultText.value = JSON.stringify(data, null, 2);
      if (action === 'minify') resultText.value = JSON.stringify(data);
      if (action === 'validate') resultText.value = 'JSON 校验通过\n\n类型：' + (Array.isArray(data) ? 'Array' : typeof data);
      statusMessage.value = action === 'validate' ? 'JSON 有效' : '处理完成';
    } else if (activeMode.value === 'base64') {
      resultText.value = action === 'encode' ? encodeBase64(inputText.value) : decodeBase64(inputText.value.trim());
      statusMessage.value = action === 'encode' ? 'Base64 编码完成' : 'Base64 解码完成';
    } else if (activeMode.value === 'url') {
      resultText.value = action === 'encode' ? encodeURIComponent(inputText.value) : decodeURIComponent(inputText.value);
      statusMessage.value = action === 'encode' ? 'URL 编码完成' : 'URL 解码完成';
    } else if (activeMode.value === 'text') {
      const transforms = { upper: (value) => value.toUpperCase(), lower: (value) => value.toLowerCase(), trim: (value) => value.trim(), collapse: (value) => value.replace(/\s+/g, ' ') };
      resultText.value = transforms[action](inputText.value);
      statusMessage.value = '文本处理完成';
    } else { resultText.value = inputText.value; statusMessage.value = '统计已更新'; }
  } catch (error) { resultText.value = inputText.value; statusMessage.value = `处理失败：${error.message}`; }
}
function encodeBase64(value) { const bytes = new TextEncoder().encode(value); let binary = ''; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary); }
function decodeBase64(value) { const binary = atob(value); const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0)); return new TextDecoder().decode(bytes); }
function clearText() { inputText.value = ''; resultText.value = ''; statusMessage.value = '已清空'; }
async function copyResult() { try { await navigator.clipboard.writeText(resultText.value); copyHint.value = '已复制'; window.setTimeout(() => { copyHint.value = ''; }, 1600); } catch { copyHint.value = '复制失败'; } }
function downloadResult() { const blob = new Blob([resultText.value], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `prohub-${activeMode.value}.txt`; link.click(); URL.revokeObjectURL(url); }
</script>
