<template>
  <div class="min-h-screen py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4 shadow-lg shadow-blue-500/20">
          <IconPhotoShield size="32" />
        </div>
        <h1 class="text-3xl font-bold mb-2">证件照换底</h1>
        <p class="text-slate-500 dark:text-slate-400">上传照片，AI 自动去除背景，一键更换底色</p>
      </div>

      <!-- Upload Area -->
      <div
        v-if="!originalImage"
        class="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:border-blue-500 dark:hover:bg-blue-500/5"
        :class="isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-300 dark:border-slate-600'"
        @click="triggerUpload"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <IconUpload size="48" class="mx-auto mb-4 text-slate-400" />
        <p class="text-lg font-medium text-slate-600 dark:text-slate-300 mb-1">拖拽照片到此处，或点击上传</p>
        <p class="text-sm text-slate-400 dark:text-slate-500">支持 JPG、PNG、WebP，最大 20MB</p>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="sr-only"
          @change="handleFileSelect"
        />
      </div>

      <!-- Processing State -->
      <div v-if="processing" class="text-center py-12">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
          <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p class="text-lg font-medium text-slate-600 dark:text-slate-300">AI 正在处理中...</p>
        <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">通常需要 1-3 秒</p>
      </div>

      <!-- Result View -->
      <div v-if="transparentImage && !processing" class="space-y-6">
        <!-- Preview Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Original -->
          <div class="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div class="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center gap-2">
              <IconPhoto size="16" class="text-slate-500" />
              <span class="text-sm font-medium text-slate-600 dark:text-slate-300">原图</span>
            </div>
            <div class="aspect-[3/4] flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
              <img :src="originalImage" alt="原图" class="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          </div>

          <!-- Transparent -->
          <div class="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div class="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center gap-2">
              <IconCheck size="16" class="text-green-500" />
              <span class="text-sm font-medium text-slate-600 dark:text-slate-300">去背景后</span>
            </div>
            <div class="aspect-[3/4] flex items-center justify-center p-4" :style="{ backgroundImage: checkerboardPattern }">
              <img :src="transparentImage" alt="去背景" class="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          </div>
        </div>

        <!-- Background Color Selector -->
        <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <IconPalette size="20" />
            选择底色
          </h3>
          <div class="flex flex-wrap gap-3">
            <button
              v-for="c in presetColors"
              :key="c.name"
              @click="selectColor(c)"
              class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 hover:scale-105"
              :class="selectedColor?.name === c.name
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-md shadow-blue-500/10'
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'"
            >
              <div class="w-8 h-8 rounded-lg shadow-inner" :style="{ backgroundColor: c.hex }" />
              <span class="text-sm font-medium">{{ c.name }}</span>
            </button>
          </div>

          <!-- Custom Color Picker -->
          <div class="mt-4 flex items-center gap-3">
            <input type="color" v-model="customColor" class="w-10 h-10 rounded-lg cursor-pointer border-0" />
            <span class="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer" @click="selectCustomColor">自定义颜色</span>
          </div>
        </div>

        <!-- Size Selector -->
        <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <IconRuler size="20" />
            选择尺寸
          </h3>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="s in photoSizes"
              :key="s.label"
              @click="selectedSize = s"
              class="px-2 py-3 rounded-xl border-2 text-center transition-all duration-200"
              :class="selectedSize?.label === s.label
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-md shadow-blue-500/10'
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'"
            >
              <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ s.label }}</p>
              <p class="text-xs text-slate-400 mt-0.5">{{ s.width }}×{{ s.height }}mm</p>
            </button>
          </div>
        </div>

        <!-- Preview with Selected Color -->
        <div v-if="previewWithBg" class="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <div class="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center gap-2">
            <IconEye size="16" class="text-blue-500" />
            <span class="text-sm font-medium text-slate-600 dark:text-slate-300">效果预览 — {{ selectedColor?.name || '自定义' }}</span>
          </div>
          <div class="aspect-[3/4] flex items-center justify-center p-4" :style="{ backgroundColor: selectedColor?.hex || customColor }">
            <img :src="transparentImage" alt="预览" class="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-3 justify-center">
          <button
            @click="downloadResult"
            :disabled="downloading"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="downloading
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/20'"
          >
            <IconDownload v-if="!downloading" size="20" />
            <div v-else class="w-5 h-5 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
            {{ downloading ? '下载中...' : '下载成品照片' }}
          </button>
          <button
            @click="resetAll"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
          >
            <IconRefresh size="20" />
            重新上传
          </button>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-start gap-3">
          <IconAlertCircle size="20" class="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-sm font-medium text-red-700 dark:text-red-300">{{ error }}</p>
            <button @click="resetAll" class="text-sm text-red-600 dark:text-red-400 underline mt-1">重新上传试试</button>
          </div>
        </div>
      </div>

      <!-- Info Section -->
      <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
          <IconSparkles size="24" class="mx-auto mb-2 text-amber-500" />
          <p class="text-sm font-medium">AI 智能抠图</p>
          <p class="text-xs text-slate-500 mt-1">U²-Net 深度学习模型</p>
        </div>
        <div class="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
          <IconColorFilter size="24" class="mx-auto mb-2 text-blue-500" />
          <p class="text-sm font-medium">一键换底</p>
          <p class="text-xs text-slate-500 mt-1">蓝/白/红/灰 常用底色</p>
        </div>
        <div class="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
          <IconShieldCheck size="24" class="mx-auto mb-2 text-green-500" />
          <p class="text-sm font-medium">隐私安全</p>
          <p class="text-xs text-slate-500 mt-1">本地处理，不存储图片</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { apiConfig } from '../../config/api';
import { ref, computed, watch } from 'vue';
import {
  IconUpload, IconPhoto, IconPhotoShield, IconCheck, IconPalette,
  IconEye, IconDownload, IconRefresh, IconAlertCircle, IconSparkles,
  IconColorFilter, IconShieldCheck, IconRuler
} from '@tabler/icons-vue';



const isDragging = ref(false);
const processing = ref(false);
const downloading = ref(false);
const originalImage = ref(null);
const transparentImage = ref(null);
const transparentBlob = ref(null);
const error = ref('');
const customColor = ref('#438EDB');

const presetColors = [
  { name: '证件蓝', hex: '#438EDB', rgb: '67,142,219' },
  { name: '纯白', hex: '#FFFFFF', rgb: '255,255,255' },
  { name: '证件红', hex: '#C53030', rgb: '197,48,48' },
  { name: '浅灰', hex: '#C8C8C8', rgb: '200,200,200' },
];

const selectedColor = ref(presetColors[0]);
const photoSizes = [
  { label: '一寸', width: 25, height: 35 },
  { label: '小一寸', width: 22, height: 32 },
  { label: '二寸', width: 35, height: 49 },
  { label: '小二寸', width: 35, height: 45 },
  { label: '大一寸', width: 33, height: 48 },
  { label: '自定义尺寸', width: 0, height: 0 },
];
const selectedSize = ref(photoSizes[0]);

const checkerboardPattern = computed(() =>
  'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 16px 16px'
);

const previewWithBg = computed(() => transparentImage.value && selectedColor.value);

function triggerUpload() {
  // 动态创建临时文件输入，避免 hidden input 的浏览器兼容问题
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.onchange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };
  input.click();
}

function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (file) processFile(file);
}

function handleDrop(event) {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) processFile(file);
}


async function processFile(file) {
  if (!file.type.startsWith('image/')) {
    error.value = '请上传图片文件';
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    error.value = '文件过大，请选择 20MB 以内的图片';
    return;
  }

  error.value = '';
  originalImage.value = URL.createObjectURL(file);
  processing.value = true;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${apiConfig.baseURL}/remove-bg`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || '去背景失败');
    }

    const blob = await res.blob();
    transparentBlob.value = blob;
    transparentImage.value = URL.createObjectURL(blob);
  } catch (err) {
    error.value = err.message || '处理失败，请重试';
    console.error('[ID Photo]', err);
  } finally {
    processing.value = false;
  }
}

function selectCustomColor() { selectedColor.value = { name: '自定义', hex: customColor.value, rgb: '' }; }

function selectColor(color) {
  selectedColor.value = color;
}

async function compositeBgWithSize(fgBlob, bgHex, size) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fgBlob);
    const fg = new Image();
    fg.src = url;
    fg.onload = () => {
      const canvas = document.createElement('canvas');
      if (size.width > 0 && size.height > 0) {
        const ratio = Math.min(fg.width / size.width, fg.height / size.height);
        canvas.width = Math.round(size.width * ratio * 2);
        canvas.height = Math.round(size.height * ratio * 2);
      } else {
        canvas.width = fg.width;
        canvas.height = fg.height;
      }
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const x = (canvas.width - fg.width) / 2;
      const y = (canvas.height - fg.height) / 2;
      ctx.drawImage(fg, x, y, fg.width, fg.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    fg.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败，请重新上传'));
    };
  });
}

async function downloadResult() {
  if (!transparentImage.value || !selectedColor.value) return;

  downloading.value = true;
  try {
    // 合成底色 + 按尺寸裁剪
    const resultDataUrl = await compositeBgWithSize(
      transparentBlob.value,
      selectedColor.value.hex,
      selectedSize.value
    );

    // 导出下载
    const a = document.createElement('a');
    a.href = resultDataUrl;
    a.download = `证件照_${selectedColor.value.name}_${selectedSize.value.label}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    error.value = err.message || '下载失败，请重新上传';
  } finally {
    downloading.value = false;
  }
}

// 自定义颜色变化时自动更新预览
watch(customColor, (newColor) => {
  if (selectedColor.value?.name === '自定义') {
    selectedColor.value = { name: '自定义', hex: newColor, rgb: '' };
  }
});
function resetAll() {
  originalImage.value = null;
  transparentImage.value = null;
  transparentBlob.value = null;
  error.value = '';
  processing.value = false;
  downloading.value = false;
  selectedColor.value = presetColors[0];
  if (fileInput.value) fileInput.value.value = '';
}
</script>
