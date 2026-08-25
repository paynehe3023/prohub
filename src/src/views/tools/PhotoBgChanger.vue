<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
    <BreadcrumbNav label="证件照一键换底" />

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <!-- 左：上传+预览 (3/5) -->
      <div class="lg:col-span-3 space-y-4">
        <!-- 上传 / 重新上传 -->
        <div v-if="!sourceImg" class="liquid-glass p-8 text-center cursor-pointer"
          @click="$refs.fileInput.click()" @dragover.prevent @drop.prevent="onDrop">
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileSelect" />
          <IconUpload class="w-10 h-10 mx-auto text-white/30 mb-3" />
          <p class="text-sm text-zinc-300 text-glass">拖拽图片到此处，或点击选择</p>
          <p class="text-[0.75rem] text-zinc-500 mt-1 text-glass-sm">支持 JPG / PNG / WebP</p>
        </div>

        <!-- 预览 -->
        <div v-if="sourceImg" class="liquid-glass overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-[0.8125rem] text-zinc-300 text-glass-sm">{{ processedImg ? '证件照结果' : '原图预览' }}</span>
            <button @click="resetAll" class="text-[0.75rem] text-zinc-500 hover:text-white text-glass-sm transition-colors">重新上传</button>
          </div>
          <div class="relative flex items-center justify-center min-h-[300px] transition-colors duration-300"
            :style="{ backgroundColor: processedImg ? 'transparent' : selectedColor }">
            <img v-if="processedImg" :src="processedImg" class="max-w-full max-h-[400px] object-contain" />
            <img v-else :src="sourceImg" class="max-w-full max-h-[400px] object-contain" />
            <!-- 加载遮罩 -->
            <div v-if="processing" class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
              <IconLoader2 class="w-8 h-8 text-white animate-spin mb-2" />
              <p class="text-sm text-white text-glass">AI 正在精准识别边缘，请稍候...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右：操作区 (2/5) -->
      <div class="lg:col-span-2 space-y-4">
        <!-- 步骤1: 选底色 -->
        <div class="liquid-glass p-4 space-y-3">
          <h3 class="text-[0.8125rem] font-medium text-white text-glass flex items-center gap-1.5">
            <span class="w-4.5 h-4.5 rounded-full bg-ios-blue/20 flex items-center justify-center text-[0.625rem] text-ios-blue font-bold">1</span> 选择底色
          </h3>
          <div class="grid grid-cols-5 gap-2">
            <button v-for="c in presetColors" :key="c.hex"
              @click="selectedColor = c.hex"
              class="w-full aspect-square rounded-xl border-2 transition-all active:scale-95"
              :style="{ backgroundColor: c.hex }"
              :class="selectedColor === c.hex ? 'border-white shadow-lg ring-2 ring-white/30 scale-105' : 'border-white/20 hover:border-white/50'"
              :title="c.name" />
          </div>
          <div class="flex items-center gap-2">
            <input type="color" v-model="customColor" class="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0" />
            <button @click="selectedColor = customColor"
              class="flex-1 px-3 py-2 rounded-xl liquid-glass-inset text-[0.75rem] text-zinc-300 text-glass-sm hover:text-white transition-colors">自定义颜色</button>
          </div>
        </div>

        <!-- 步骤2: 选尺寸 -->
        <div class="liquid-glass p-4 space-y-3">
          <h3 class="text-[0.8125rem] font-medium text-white text-glass flex items-center gap-1.5">
            <span class="w-4.5 h-4.5 rounded-full bg-ios-green/20 flex items-center justify-center text-[0.625rem] text-ios-green font-bold">2</span> 选择尺寸
          </h3>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="s in photoSizes" :key="s.label"
              @click="selectedSize = s"
              class="px-2 py-2.5 rounded-xl liquid-glass-inset text-center transition-all active:scale-95 border"
              :class="selectedSize.label === s.label ? 'border-ios-blue/50 shadow-md shadow-ios-blue/10' : 'border-transparent hover:border-white/20'">
              <p class="text-[0.8125rem] text-white text-glass font-semibold">{{ s.label }}</p>
              <p class="text-[0.625rem] text-zinc-400 text-glass-sm">{{ s.width }}×{{ s.height }}mm</p>
            </button>
          </div>
        </div>

        <!-- 步骤3: 开始抠图 -->
        <button v-if="sourceImg && !processing && !processedImg"
          @click="removeBg" class="w-full btn-ios btn-ios-primary justify-center">
          <IconScissors class="w-4 h-4" /> AI 智能抠图
        </button>

        <!-- 结果导出 -->
        <div v-if="processedImg" class="liquid-glass p-4 space-y-3">
          <button @click="downloadResult" class="w-full btn-ios btn-ios-primary justify-center">
            <IconDownload class="w-4 h-4" /> 保存到手机
          </button>
        </div>

        <!-- 错误 -->
        <div v-if="error" class="p-3 rounded-xl bg-ios-red/20 border border-ios-red/30 text-[0.8125rem] text-ios-red text-glass-sm">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useHead } from '@vueuse/head';
import { IconChevronRight, IconUpload, IconLoader2, IconScissors, IconDownload } from '@tabler/icons-vue';
import BreadcrumbNav from '../../components/BreadcrumbNav.vue';
import { apiConfig } from '../../config/api';

useHead({ title: '证件照一键换底 - proHub' });

const fileInput = ref(null);
const sourceImg = ref(null);
const processedImg = ref(null);
const processing = ref(false);
const error = ref('');

const presetColors = [
  { name: '纯白', hex: '#FFFFFF' },
  { name: '证件蓝', hex: '#438EDB' },
  { name: '冲印蓝', hex: '#00BFFF' },
  { name: '证件红', hex: '#C7000B' },
  { name: '高级灰', hex: '#E0E0E0' },
];
const selectedColor = ref('#FFFFFF');
const customColor = ref('#438EDB');

const photoSizes = [
  { label: '一寸', width: 25, height: 35 },
  { label: '小一寸', width: 22, height: 32 },
  { label: '二寸', width: 35, height: 49 },
  { label: '小二寸', width: 35, height: 45 },
  { label: '大一寸', width: 33, height: 48 },
  { label: '自定义', width: 0, height: 0 },
];
const selectedSize = ref(photoSizes[0]);

function onFileSelect(e) {
  const file = e.target.files?.[0];
  if (file) loadFile(file);
}
function onDrop(e) {
  const file = e.dataTransfer?.files?.[0];
  if (file) loadFile(file);
}
function loadFile(file) {
  if (!file.type.startsWith('image/')) { error.value = '请选择图片文件'; return; }
  error.value = '';
  processedImg.value = null;
  const reader = new FileReader();
  reader.onload = () => { sourceImg.value = reader.result; };
  reader.readAsDataURL(file);
}
function resetAll() {
  sourceImg.value = null;
  processedImg.value = null;
  error.value = '';
  if (fileInput.value) fileInput.value.value = '';
}

async function removeBg() {
  if (!sourceImg.value) return;
  processing.value = true;
  error.value = '';
  try {
    // 将 data URL 转为 Blob
    const blob = await (await fetch(sourceImg.value)).blob();
    const formData = new FormData();
    formData.append('file', blob, 'photo.png');

    // 调用后端 /api/remove-bg（Python rembg）
    const resp = await fetch(`${apiConfig.baseURL}/remove-bg`, {
      method: 'POST',
      body: formData,  // 不手动设 Content-Type，让浏览器自动加 boundary
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: '抠图失败' }));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }

    // 将二进制 PNG 响应转为 data URL
    const blobResult = await resp.blob();
    const resultUrl = URL.createObjectURL(blobResult);

    const img = new Image();
    img.src = resultUrl;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('结果图片加载失败')); });

    // 合成底色
    const composited = await compositeBg(resultUrl, selectedColor.value, img, selectedSize.value);
    processedImg.value = composited;
    URL.revokeObjectURL(resultUrl);
  } catch (e) {
    console.error('BG removal failed:', e);
    error.value = '抠图处理失败，请检查网络或更换一张人像清晰的照片重试';
  } finally {
    processing.value = false;
  }
}

async function compositeBg(fgUrl, bgColor, origImg, size) {
  return new Promise((resolve) => {
    const fg = new Image();
    fg.src = fgUrl;
    fg.onload = () => {
      const canvas = document.createElement('canvas');

      // 按证件照尺寸比例计算
      if (size.width > 0 && size.height > 0) {
        // 用原图短边对齐尺寸
        const ratio = Math.min(origImg.width / size.width, origImg.height / size.height);
        canvas.width = Math.round(size.width * ratio * 2);  // 2x 高清
        canvas.height = Math.round(size.height * ratio * 2);
      } else {
        canvas.width = fg.width;
        canvas.height = fg.height;
      }

      const ctx = canvas.getContext('2d');
      // 填充底色
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // 居中绘制抠图结果
      const fgW = fg.width;
      const fgH = fg.height;
      const x = (canvas.width - fgW) / 2;
      const y = (canvas.height - fgH) / 2;
      ctx.drawImage(fg, x, y, fgW, fgH);
      resolve(canvas.toDataURL('image/png'));
    };
  });
}

function downloadResult() {
  if (!processedImg.value) return;
  const a = document.createElement('a');
  a.href = processedImg.value;
  a.download = '证件照_' + Date.now() + '.png';
  a.click();
}
</script>
