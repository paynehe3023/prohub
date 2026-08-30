<template>
  <div class="theme-page min-h-dvh py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <BackButton class="mb-5" />
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

      <!-- Processing State：上传真实进度 0-40%，AI 处理缓动 40-95% -->
      <div v-if="processing" class="text-center py-12">
        <div class="w-full max-w-sm mx-auto px-2">
          <div class="flex items-center justify-between text-sm mb-2">
            <span class="font-medium text-slate-600 dark:text-slate-300">{{ uploadProgress < 40 ? '正在上传图片' : uploadProgress < 95 ? 'AI 智能抠图中' : '正在接收结果' }}</span>
            <span class="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{{ Math.floor(uploadProgress) }}%</span>
          </div>
          <div class="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              class="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-200 ease-out"
              :style="{ width: uploadProgress + '%' }"
            />
          </div>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-2">大图已自动压缩加速上传，通常 3-10 秒完成，请勿关闭页面</p>
        </div>
      </div>

      <!-- Error Message（独立于结果视图，失败时始终可见） -->
      <div v-if="error && !processing" class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-start gap-3">
        <IconAlertCircle size="20" class="text-red-500 mt-0.5 flex-shrink-0" />
        <div class="flex-1">
          <p class="text-sm font-medium text-red-700 dark:text-red-300">{{ error }}</p>
          <button @click="resetAll" class="text-sm text-red-600 dark:text-red-400 underline mt-1">重新上传试试</button>
        </div>
      </div>

      <!-- Result View -->
      <div v-if="transparentImage && !processing" class="space-y-6">
        <!-- 原图 / 抠图对比 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div class="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 flex items-center gap-2">
              <IconPhoto size="14" class="text-slate-500" />
              <span class="text-xs font-medium text-slate-600 dark:text-slate-300">原图</span>
            </div>
            <div class="aspect-[4/3] flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-2">
              <img :src="originalImage" alt="原图" class="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          </div>
          <div class="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div class="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 flex items-center gap-2">
              <IconCheck size="14" class="text-green-500" />
              <span class="text-xs font-medium text-slate-600 dark:text-slate-300">抠图结果</span>
            </div>
            <div class="aspect-[4/3] flex items-center justify-center p-2" :style="{ backgroundImage: checkerboardPattern }">
              <img :src="transparentImage" alt="去背景" class="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          </div>
        </div>

        <!-- 实时合成预览（底色 + 尺寸裁剪） -->
        <div class="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <div class="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <IconEye size="16" class="text-blue-500" />
              <span class="text-sm font-medium text-slate-600 dark:text-slate-300">成品预览 — {{ selectedColor?.name || '自定义' }} · {{ selectedSize?.label }}</span>
            </div>
            <span v-if="previewDims" class="text-xs text-slate-400 dark:text-slate-500">{{ previewDims }}</span>
          </div>
          <div class="flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 min-h-[280px]">
            <div
              v-if="compositedPreview"
              class="relative max-w-full shadow-lg rounded-md overflow-hidden"
              :style="{ aspectRatio: previewAspect, width: previewWidth }"
            >
              <img :src="compositedPreview" alt="成品预览" class="absolute inset-0 w-full h-full object-fill" />
            </div>
            <div v-else class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>

        <!-- Background Color Selector：圆形色板一排 -->
        <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 class="text-base font-semibold mb-4 flex items-center gap-2">
            <IconPalette size="18" />
            选择底色
          </h3>
          <div class="flex items-start justify-start gap-4 sm:gap-5 overflow-x-auto no-scrollbar px-1 -mx-1 pb-1.5">
            <button
              v-for="c in presetColors"
              :key="c.name"
              @click="selectColor(c)"
              class="flex flex-col items-center gap-1.5 shrink-0 group"
              :title="c.hex"
            >
              <span
                class="w-10 h-10 rounded-full shadow-inner border border-black/10 transition-colors duration-200"
                :class="selectedColor?.name === c.name
                  ? 'ring-2 ring-blue-500 ring-offset-[3px] ring-offset-white dark:ring-offset-slate-900'
                  : 'group-hover:ring-2 group-hover:ring-slate-300 group-hover:ring-offset-[3px] group-hover:ring-offset-white dark:group-hover:ring-slate-600 dark:group-hover:ring-offset-slate-900'"
                :style="{ backgroundColor: c.hex }"
              />
              <span
                class="text-xs font-medium transition-colors"
                :class="selectedColor?.name === c.name ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'"
              >{{ c.name }}</span>
            </button>

            <!-- 自定义色板 -->
            <label class="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
              <span
                class="relative w-10 h-10 rounded-full shadow-inner border border-black/10 transition-colors duration-200 overflow-hidden"
                :class="selectedColor?.name === '自定义'
                  ? 'ring-2 ring-blue-500 ring-offset-[3px] ring-offset-white dark:ring-offset-slate-900'
                  : 'group-hover:ring-2 group-hover:ring-slate-300 group-hover:ring-offset-[3px] group-hover:ring-offset-white dark:group-hover:ring-slate-600 dark:group-hover:ring-offset-slate-900'"
                :style="{ backgroundColor: customColor }"
              >
                <IconColorPicker size="14" class="absolute inset-0 m-auto text-white drop-shadow mix-blend-difference" />
                <input type="color" v-model="customColor" class="absolute inset-0 opacity-0 cursor-pointer" />
              </span>
              <span
                class="text-xs font-medium transition-colors"
                :class="selectedColor?.name === '自定义' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'"
              >自定义</span>
            </label>
          </div>
        </div>

        <!-- Size Selector：比例示意 + 实际像素 -->
        <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div class="flex items-center justify-between gap-2 mb-4">
            <h3 class="text-base font-semibold flex items-center gap-2">
              <IconRuler size="18" />
              选择尺寸
            </h3>
            <span class="text-xs text-slate-400 dark:text-slate-500">标准 300dpi</span>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            <button
              v-for="s in photoSizes"
              :key="s.label"
              @click="selectedSize = s"
              class="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 text-center transition-all duration-200"
              :class="selectedSize?.label === s.label
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-md shadow-blue-500/10'
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'"
            >
              <!-- 比例示意小矩形：视觉上呈现该尺寸的长宽比 -->
              <span class="flex items-center justify-center h-9">
                <span
                  class="rounded-[3px] border-2"
                  :class="selectedSize?.label === s.label ? 'border-blue-500 bg-blue-500/10' : 'border-slate-300 dark:border-slate-500'"
                  :style="sizeGhostStyle(s)"
                />
              </span>
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ s.label }}</span>
              <span class="text-[0.625rem] text-slate-400 leading-tight">{{ s.width }}×{{ s.height }}mm</span>
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-3 justify-center">
          <button
            @click="downloadResult"
            :disabled="downloading || !compositedPreview"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="downloading
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/20'"
          >
            <IconDownload v-if="!downloading" size="20" />
            <div v-else class="w-5 h-5 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
            {{ downloading ? '生成中...' : '下载成品照片' }}
          </button>
          <button
            @click="resetAll"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
          >
            <IconRefresh size="20" />
            重新上传
          </button>
        </div>
      </div>

      <!-- Info Section -->
      <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
          <IconSparkles size="24" class="mx-auto mb-2 text-amber-500" />
          <p class="text-sm font-medium">AI 智能抠图</p>
          <p class="text-xs text-slate-500 mt-1">{{ MODEL_LABEL }} 人像模型</p>
        </div>
        <div class="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
          <IconColorFilter size="24" class="mx-auto mb-2 text-blue-500" />
          <p class="text-sm font-medium">一键换底</p>
          <p class="text-xs text-slate-500 mt-1">蓝/白/红/灰 常用底色</p>
        </div>
        <div class="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
          <IconShieldCheck size="24" class="mx-auto mb-2 text-green-500" />
          <p class="text-sm font-medium">标准规格</p>
          <p class="text-xs text-slate-500 mt-1">300dpi 冲印级输出</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { apiConfig } from '../../config/api';
import { saveBlob } from '../../lib/download';
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import BackButton from '../../components/BackButton.vue';
import {
  IconUpload, IconPhoto, IconPhotoShield, IconCheck, IconPalette,
  IconEye, IconDownload, IconRefresh, IconAlertCircle, IconSparkles,
  IconColorFilter, IconShieldCheck, IconRuler, IconColorPicker
} from '@tabler/icons-vue';

// 与服务端 REMBG_MODEL 保持一致（实测人像精度最高的模型）
const MODEL_LABEL = 'ISNet';

const fileInput = ref(null);
const isDragging = ref(false);
const processing = ref(false);
const downloading = ref(false);
const uploadProgress = ref(0); // 0-40 上传真实进度，40-95 AI 处理缓动，100 完成
let progressTimer = null;
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
  { label: '自定义', width: 0, height: 0 },
];
const selectedSize = ref(photoSizes[0]);

const checkerboardPattern = computed(() =>
  'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 16px 16px'
);

// 300dpi 冲印级：px = mm / 25.4 * 300
const DPI = 300;
function sizeToPx(size) {
  return {
    w: Math.round((size.width / 25.4) * DPI),
    h: Math.round((size.height / 25.4) * DPI),
  };
}

// 尺寸按钮里的比例示意小矩形
function sizeGhostStyle(s) {
  const ratio = s.width > 0 && s.height > 0 ? s.width / s.height : 295 / 413;
  const h = 30;
  return { width: `${(h * Math.min(ratio, 1)).toFixed(1)}px`, height: `${(h * Math.min(1 / ratio, 1)).toFixed(1)}px` };
}

// 实时合成预览
const compositedPreview = ref('');
const previewTimer = ref(null);
const previewAspect = computed(() => {
  if (selectedSize.value.width > 0) return `${selectedSize.value.width} / ${selectedSize.value.height}`;
  return previewNatural.value ? `${previewNatural.value.w} / ${previewNatural.value.h}` : '3 / 4';
});
const previewWidth = computed(() => {
  const ratio = selectedSize.value.width > 0 ? selectedSize.value.width / selectedSize.value.height : 0.75;
  // 窄比例用小宽度，宽比例占满
  return ratio < 0.8 ? `${Math.max(180, 340 * ratio)}px` : '100%';
});
const previewDims = computed(() => {
  if (selectedSize.value.width > 0) {
    const { w, h } = sizeToPx(selectedSize.value);
    return `${selectedSize.value.width}×${selectedSize.value.height}mm · ${w}×${h}px`;
  }
  return previewNatural.value ? `原图尺寸 ${previewNatural.value.w}×${previewNatural.value.h}px` : '';
});
const previewNatural = ref(null);

let fgImageEl = null; // 缓存已解码的抠图 Image
let fgObjectUrl = null;

function loadFgImage() {
  return new Promise((resolve, reject) => {
    if (fgImageEl) return resolve(fgImageEl);
    if (!transparentBlob.value) return reject(new Error('请先上传图片'));
    const url = URL.createObjectURL(transparentBlob.value);
    const img = new Image();
    img.onload = () => {
      fgObjectUrl = url;
      fgImageEl = img;
      previewNatural.value = { w: img.naturalWidth, h: img.naturalHeight };
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败，请重新上传'));
    };
    img.src = url;
  });
}

/**
 * 合成成品画布：底色填充 + 抠图按 cover 居中裁剪填充
 * targetW/H 为 0 时使用原图尺寸（自定义）
 */
function compositeToCanvas(fg, bgHex, size) {
  let targetW, targetH;
  if (size.width > 0 && size.height > 0) {
    const px = sizeToPx(size);
    targetW = px.w;
    targetH = px.h;
  } else {
    targetW = fg.naturalWidth;
    targetH = fg.naturalHeight;
  }
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, targetW, targetH);
  // cover：等比放大至铺满，居中裁剪（标准证件照构图）
  const scale = Math.max(targetW / fg.naturalWidth, targetH / fg.naturalHeight);
  const dw = fg.naturalWidth * scale;
  const dh = fg.naturalHeight * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fg, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
  return canvas;
}

function canvasToBlob(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('图片导出失败'))), type);
  });
}

// 底色/尺寸变化 → 300ms 防抖重新合成预览
watch(customColor, (val) => {
  // 替换为新对象以触发 [selectedColor] watch → 预览实时重合成
  selectedColor.value = { name: '自定义', hex: val };
});

watch([selectedColor, selectedSize, transparentBlob], async () => {
  if (!transparentBlob.value) return;
  if (previewTimer.value) clearTimeout(previewTimer.value);
  previewTimer.value = setTimeout(async () => {
    try {
      const fg = await loadFgImage();
      const canvas = compositeToCanvas(fg, selectedColor.value?.hex || customColor.value, selectedSize.value);
      // 预览导出限制在 720px 内，避免大图卡顿
      const maxSide = 720;
      let out = canvas;
      if (Math.max(canvas.width, canvas.height) > maxSide) {
        const scale = maxSide / Math.max(canvas.width, canvas.height);
        out = document.createElement('canvas');
        out.width = Math.round(canvas.width * scale);
        out.height = Math.round(canvas.height * scale);
        out.getContext('2d').imageSmoothingQuality = 'high';
        out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height);
      }
      if (compositedPreview.value.startsWith('blob:')) URL.revokeObjectURL(compositedPreview.value);
      compositedPreview.value = URL.createObjectURL(await canvasToBlob(out));
    } catch (e) {
      console.error('[ID Photo] preview:', e);
    }
  }, 300);
}, { immediate: true });

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

function releaseFgImage() {
  if (fgObjectUrl) URL.revokeObjectURL(fgObjectUrl);
  fgObjectUrl = null;
  fgImageEl = null;
  previewNatural.value = null;
}

function stopProgressSim() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

// 大图上传前本地压缩：手机原片（12MP / 2-4MB）→ 最长边 1600 的 JPEG，
// 上传体积降 60-80%，显著缩短移动网络上传等待；失败时回退原图
async function compressBeforeUpload(file) {
  if (file.size <= 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) {
      bitmap.close?.();
      return file;
    }
    const c = document.createElement('canvas');
    c.width = Math.round(bitmap.width * scale);
    c.height = Math.round(bitmap.height * scale);
    c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height);
    bitmap.close?.();
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], 'compressed.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
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
  releaseFgImage();
  compositedPreview.value = '';
  originalImage.value = URL.createObjectURL(file);
  processing.value = true;
  uploadProgress.value = 0;
  stopProgressSim();

  // 上传前本地压缩（原图预览仍用原始文件）
  const uploadFile = await compressBeforeUpload(file);

  const formData = new FormData();
  formData.append('file', uploadFile);

  // XHR 提供 upload.onprogress 真实上传进度（fetch 不支持上传进度）
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${apiConfig.baseURL}/remove-bg`);
  xhr.responseType = 'blob';
  xhr.timeout = 120000;

  // 上传阶段：真实进度映射到 0-40%
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      uploadProgress.value = Math.min(40, (e.loaded / e.total) * 40);
    }
  };
  // 上传完成 → AI 处理阶段，缓动逼近 95%（越接近越慢）
  xhr.upload.onload = () => {
    progressTimer = setInterval(() => {
      uploadProgress.value = Math.min(94, uploadProgress.value + Math.max(0.4, (94 - uploadProgress.value) * 0.04));
    }, 200);
  };
  // 响应下载阶段：真实进度映射 95-99%（大图弱网时用户可见仍在推进）
  xhr.onprogress = (e) => {
    if (e.lengthComputable && e.loaded > 0) {
      uploadProgress.value = Math.max(uploadProgress.value, Math.min(99, 95 + (e.loaded / e.total) * 4));
    }
  };

  xhr.onload = () => {
    stopProgressSim();
    processing.value = false;
    if (xhr.status >= 200 && xhr.status < 300) {
      uploadProgress.value = 100;
      transparentBlob.value = xhr.response;
      transparentImage.value = URL.createObjectURL(xhr.response);
    } else {
      xhr.response?.text?.()
        .then((t) => {
          let msg = '处理失败，请重试';
          try { const d = JSON.parse(t); msg = d.message || d.error || msg; } catch { /* 非 JSON 响应 */ }
          error.value = msg;
        })
        .catch(() => { error.value = '处理失败，请重试'; });
    }
  };
  xhr.onerror = () => {
    stopProgressSim();
    processing.value = false;
    error.value = '网络异常或页面被系统中断，请保持屏幕亮起并重试';
  };
  xhr.onabort = () => {
    stopProgressSim();
    processing.value = false;
    error.value = '上传已取消，请重新选择图片';
  };
  xhr.ontimeout = () => {
    stopProgressSim();
    processing.value = false;
    error.value = '处理超时，请检查网络后重试';
  };

  xhr.send(formData);
}

function selectColor(color) {
  selectedColor.value = color;
}

async function downloadResult() {
  if (!transparentBlob.value || !selectedColor.value) return;

  downloading.value = true;
  try {
    const fg = await loadFgImage();
    const canvas = compositeToCanvas(fg, selectedColor.value.hex, selectedSize.value);
    const blob = await canvasToBlob(canvas, 'image/png');
    // 统一保存逻辑：移动端调起系统分享面板（可"存储到相册"），桌面直接下载
    await saveBlob(blob, `证件照_${selectedColor.value.name}_${selectedSize.value.label}.png`);
  } catch (err) {
    if (err?.name === 'AbortError') return; // 用户取消分享面板
    error.value = err.message || '下载失败，请重新上传';
  } finally {
    downloading.value = false;
  }
}

function resetAll() {
  originalImage.value = null;
  transparentImage.value = null;
  transparentBlob.value = null;
  releaseFgImage();
  if (compositedPreview.value.startsWith('blob:')) URL.revokeObjectURL(compositedPreview.value);
  compositedPreview.value = '';
  error.value = '';
  processing.value = false;
  downloading.value = false;
  selectedColor.value = presetColors[0];
  if (fileInput.value) fileInput.value.value = '';
}

onBeforeUnmount(() => {
  stopProgressSim();
  if (previewTimer.value) clearTimeout(previewTimer.value);
  releaseFgImage();
  if (compositedPreview.value.startsWith('blob:')) URL.revokeObjectURL(compositedPreview.value);
});
</script>
