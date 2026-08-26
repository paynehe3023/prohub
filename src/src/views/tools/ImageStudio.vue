<template>
  <div class="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
    <BreadcrumbNav label="全能极速图片处理工作台" />

    <section class="liquid-glass p-5 sm:p-6 mb-5">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-inset text-[0.75rem] text-zinc-300 text-glass-sm mb-3">
            <IconPhoto class="w-4 h-4 text-ios-blue" />
            纯前端 · 原始物理像素 · EXIF 清洗
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-[-0.03em] text-glass">全能极速图片处理工作台</h1>
          <p class="mt-2 text-sm text-zinc-400 text-glass-sm">压缩、裁剪、隐私保护、格式转换、拼长图和九宫格都在浏览器本地完成。</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <label class="btn-ios btn-ios-primary cursor-pointer">
            <IconPhoto class="w-4 h-4" />
            导入图片
            <input type="file" accept="image/*,.heic,.heif" multiple class="hidden" @change="onFilesSelected" />
          </label>
          <button type="button" class="btn-ios btn-ios-glass" :disabled="!files.length" @click="clearAll">清空</button>
        </div>
      </div>
      <div
        class="mt-5 rounded-[20px] border border-dashed border-white/20 bg-black/10 px-4 py-5 text-center text-sm text-zinc-400 transition-colors"
        :class="dragging ? 'border-ios-blue bg-ios-blue/10 text-white' : ''"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        拖拽图片到这里，支持多选；HEIC/HEIF 会在本地转换为可编辑图像
      </div>
    </section>

    <div class="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-5">
      <aside class="space-y-5">
        <section class="liquid-glass p-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 class="text-sm font-semibold text-white text-glass">图片队列</h2>
              <p class="text-[0.6875rem] text-zinc-500 mt-1">{{ files.length }} 张已载入</p>
            </div>
            <span v-if="currentImage" class="text-[0.6875rem] text-zinc-400 liquid-glass-inset px-2 py-1 rounded-full">{{ currentImage.naturalWidth }} × {{ currentImage.naturalHeight }}</span>
          </div>
          <div v-if="!files.length" class="py-8 text-center text-xs text-zinc-500">还没有图片</div>
          <div v-else class="space-y-2 max-h-72 overflow-y-auto pr-1">
            <button
              v-for="image in files"
              :key="image.id"
              type="button"
              class="w-full flex items-center gap-3 rounded-[16px] p-2 text-left transition-colors"
              :class="selectedId === image.id ? 'bg-ios-blue/20 ring-1 ring-ios-blue/50' : 'liquid-glass-inset hover:bg-white/10'"
              @click="selectImage(image.id)"
            >
              <img :src="image.sourceUrl" :alt="image.name" class="w-12 h-12 rounded-xl object-cover bg-black/20 shrink-0" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-xs text-white text-glass">{{ image.name }}</span>
                <span class="block text-[0.6875rem] text-zinc-500 mt-1">{{ image.naturalWidth }} × {{ image.naturalHeight }} · {{ formatBytes(image.size) }}</span>
              </span>
              <span class="text-zinc-500 hover:text-white text-lg leading-none" title="移除图片" @click.stop="removeImage(image.id)">×</span>
            </button>
          </div>
        </section>

        <section class="liquid-glass p-3">
          <div class="grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-2 gap-2">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="min-h-14 rounded-[14px] px-2 py-2 text-[0.6875rem] font-medium transition-all"
              :class="activeTab === tab.id ? 'bg-ios-blue text-white shadow-lg shadow-ios-blue/20' : 'liquid-glass-inset text-zinc-400 hover:text-white'"
              @click="switchTab(tab.id)"
            >
              <span class="block text-sm mb-1">{{ tab.symbol }}</span>
              {{ tab.label }}
            </button>
          </div>
        </section>

        <section class="liquid-glass p-4 space-y-4">
          <div v-if="activeTab === 'compress'" class="space-y-4">
            <div>
              <h2 class="text-sm font-semibold text-white text-glass">指定 KB 压缩</h2>
              <p class="text-[0.6875rem] text-zinc-500 mt-1">二分查找 JPEG 质量，最多 7 次迭代。</p>
            </div>
            <label class="block text-xs text-zinc-400">目标大小（KB）
              <input v-model.number="targetKB" type="number" min="10" max="10240" class="mt-2 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white outline-none" />
            </label>
            <input v-model.number="targetKB" type="range" min="10" max="2048" step="10" class="w-full accent-[#007AFF]" />
            <div class="flex justify-between text-[0.6875rem] text-zinc-500"><span>10 KB</span><span>{{ targetKB }} KB</span><span>2 MB</span></div>
          </div>

          <div v-else-if="activeTab === 'resize'" class="space-y-4">
            <div>
              <h2 class="text-sm font-semibold text-white text-glass">尺寸裁剪与预设</h2>
              <p class="text-[0.6875rem] text-zinc-500 mt-1">拖拽预览中的选框，坐标始终按原图物理像素记录。</p>
            </div>
            <label class="block text-xs text-zinc-400">尺寸预设
              <select v-model="selectedPreset" class="mt-2 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white bg-transparent outline-none" @change="applyPreset">
                <option value="free">自由裁剪</option>
                <option v-for="preset in presets" :key="preset.id" :value="preset.id">{{ preset.label }} · {{ preset.width }} × {{ preset.height }}</option>
              </select>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="text-xs text-zinc-400">Width
                <input v-model.number="outputWidth" type="number" min="1" class="mt-2 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white outline-none" @input="onWidthInput" />
              </label>
              <label class="text-xs text-zinc-400">Height
                <input v-model.number="outputHeight" type="number" min="1" class="mt-2 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white outline-none" @input="onHeightInput" />
              </label>
            </div>
            <label class="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input v-model="keepAspect" type="checkbox" class="accent-[#007AFF]" />
              锁定比例 Keep Aspect Ratio
            </label>
            <div v-if="cropRect" class="rounded-xl liquid-glass-inset p-3 text-[0.6875rem] text-zinc-400 space-y-1">
              <p class="text-zinc-300">当前选区（物理像素）</p>
              <p>X {{ Math.round(cropRect.x) }} · Y {{ Math.round(cropRect.y) }}</p>
              <p>W {{ Math.round(cropRect.width) }} · H {{ Math.round(cropRect.height) }}</p>
            </div>
            <button type="button" class="w-full rounded-xl liquid-glass-inset px-3 py-2 text-xs text-zinc-300 hover:text-white" @click="resetCrop">重置裁剪选区</button>
          </div>

          <div v-else-if="activeTab === 'privacy'" class="space-y-4">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-semibold text-white text-glass">隐私水印与打码</h2>
                <span class="relative inline-flex group">
                  <button type="button" class="w-4 h-4 rounded-full border border-white/30 text-[0.625rem] text-zinc-300 leading-none hover:text-white hover:border-white/70" aria-label="盲水印说明">?</button>
                  <span role="tooltip" class="pointer-events-none absolute left-0 top-full mt-2 z-[100] w-72 rounded-xl bg-zinc-950/95 px-3 py-2 text-[0.6875rem] leading-relaxed text-zinc-200 opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">盲水印会把半透明的斜向文字平铺写入导出图片；遮罩支持马赛克、黑色/白色遮盖与柔焦模糊，每个遮罩独立记录自己的方式，绘制时即可看到真实效果。</span>
                </span>
              </div>
              <p class="text-[0.6875rem] text-zinc-500 mt-1">在预览图上拖拽矩形，导出时按物理像素映射。</p>
            </div>
            <label class="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer"><input v-model="watermarkEnabled" type="checkbox" class="accent-[#007AFF]" />启用盲水印</label>
            <label class="block text-xs text-zinc-400">水印文本
              <textarea v-model="watermarkText" rows="3" class="mt-2 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white outline-none resize-none" />
            </label>
            <label class="block text-xs text-zinc-400">遮罩方式
              <select v-model="maskStyle" class="mt-2 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white bg-transparent outline-none">
                <option value="mosaic">马赛克</option>
                <option value="black">黑色遮盖</option>
                <option value="white">白色遮盖</option>
                <option value="blur">柔焦模糊</option>
              </select>
            </label>
            <div class="rounded-xl liquid-glass-inset p-3 text-[0.6875rem] text-zinc-400">动态块大小：{{ dynamicMosaicBlock }} px · 已添加 {{ masks.length }} 个遮罩</div>
            <div class="grid grid-cols-3 gap-2">
              <button type="button" class="rounded-xl liquid-glass-inset px-2 py-2 text-xs text-zinc-300 hover:text-white" :disabled="!undoStack.length" @click="undoMask">← 撤回</button>
              <button type="button" class="rounded-xl liquid-glass-inset px-2 py-2 text-xs text-zinc-300 hover:text-white" :disabled="!redoStack.length" @click="redoMask">重做 →</button>
              <button type="button" class="rounded-xl liquid-glass-inset px-2 py-2 text-xs text-zinc-300 hover:text-white" :disabled="!masks.length" @click="clearMasks">清除全部</button>
            </div>
          </div>

          <div v-else-if="activeTab === 'convert'" class="space-y-4">
            <div>
              <h2 class="text-sm font-semibold text-white text-glass">格式转换与 EXIF 清洗</h2>
              <p class="text-[0.6875rem] text-zinc-500 mt-1">重绘会剥离 GPS 等原始 EXIF 信息。</p>
            </div>
            <label class="block text-xs text-zinc-400">导出格式
              <select v-model="outputFormat" class="mt-2 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white bg-transparent outline-none">
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
                <option value="image/avif">AVIF（需浏览器支持）</option>
              </select>
            </label>
            <label v-if="outputFormat === 'image/jpeg'" class="block text-xs text-zinc-400">EXIF 处理
              <select v-model="exifPolicy" class="mt-2 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white bg-transparent outline-none">
                <option value="strip">剥离 EXIF（默认）</option>
                <option value="keep">保留原 EXIF</option>
                <option value="edit">编辑 EXIF</option>
              </select>
            </label>
            <div v-if="exifPolicy === 'edit'" class="space-y-2 rounded-xl liquid-glass-inset p-3">
              <label class="block text-xs text-zinc-400">拍摄时间（YYYY:MM:DD HH:MM:SS）
                <input v-model="exifEditDate" type="text" placeholder="2026:08:26 12:00:00" class="mt-1 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white outline-none" />
              </label>
              <label class="block text-xs text-zinc-400">相机厂商
                <input v-model="exifEditMake" type="text" placeholder="Apple" class="mt-1 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white outline-none" />
              </label>
              <label class="block text-xs text-zinc-400">相机型号
                <input v-model="exifEditModel" type="text" placeholder="iPhone 15 Pro" class="mt-1 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white outline-none" />
              </label>
            </div>
            <label v-if="outputFormat !== 'image/png'" class="block text-xs text-zinc-400">质量 {{ Math.round(outputQuality * 100) }}%
              <input v-model.number="outputQuality" type="range" min="0.4" max="1" step="0.01" class="mt-2 w-full accent-[#007AFF]" />
            </label>
          </div>

          <div v-else class="space-y-4">
            <div>
              <h2 class="text-sm font-semibold text-white text-glass">拼长图与九宫格</h2>
              <p class="text-[0.6875rem] text-zinc-500 mt-1">拼接按原图物理尺寸绘制，不经过 CSS 缩放。</p>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="rounded-xl px-3 py-2 text-xs" :class="composeDirection === 'vertical' ? 'bg-ios-blue text-white' : 'liquid-glass-inset text-zinc-400'" @click="composeDirection = 'vertical'">纵向拼接</button>
              <button type="button" class="rounded-xl px-3 py-2 text-xs" :class="composeDirection === 'horizontal' ? 'bg-ios-blue text-white' : 'liquid-glass-inset text-zinc-400'" @click="composeDirection = 'horizontal'">横向拼接</button>
            </div>
            <p class="text-[0.6875rem] text-zinc-500">当前队列 {{ files.length }} 张，至少需要 2 张图片。</p>
          </div>

          <button type="button" class="w-full btn-ios btn-ios-primary justify-center" :disabled="!currentImage || isProcessing || (activeTab === 'compose' && files.length < 2)" @click="runPrimaryAction">
            {{ isProcessing ? '处理中...' : primaryActionLabel }}
          </button>
          <button v-if="activeTab === 'compose'" type="button" class="w-full btn-ios btn-ios-glass justify-center" :disabled="!currentImage || isProcessing" @click="createNineGridAndScroll">
            生成九宫格
          </button>
        </section>
      </aside>

      <main class="min-w-0 space-y-5">
        <section class="liquid-glass p-4 sm:p-5">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 class="text-base font-semibold text-white text-glass">预览</h2>
              <p class="text-[0.6875rem] text-zinc-500 mt-1">预览按容器等比缩放，导出仍使用原始物理像素。</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" class="rounded-xl px-3 py-2 text-xs" :class="viewMode === 'original' ? 'bg-ios-blue text-white' : 'liquid-glass-inset text-zinc-400'" @click="viewMode = 'original'">原图</button>
              <button type="button" class="rounded-xl px-3 py-2 text-xs" :disabled="!processedUrl" :class="viewMode === 'processed' ? 'bg-ios-blue text-white' : 'liquid-glass-inset text-zinc-400'" @click="viewMode = 'processed'">处理后</button>
              <button v-if="processedUrl" type="button" class="btn-ios btn-ios-glass py-2 px-3 text-xs" @click="downloadProcessed"><IconDownload class="w-4 h-4" />下载</button>
            </div>
          </div>

          <div class="min-h-[360px] rounded-[20px] bg-black/20 border border-white/10 flex items-center justify-center overflow-hidden p-3">
            <div v-if="!currentImage" class="text-center text-zinc-500 text-sm">导入图片后开始处理</div>
            <img v-else-if="viewMode === 'processed' && processedUrl" :src="processedUrl" alt="处理结果" class="max-w-full max-h-[600px] object-contain" />
            <canvas
              v-else
              ref="previewCanvas"
              class="max-w-full max-h-[600px] object-contain touch-none select-none"
              :class="activeTab === 'compose' ? 'cursor-default' : 'cursor-crosshair'"
              @pointerdown="onPreviewPointerDown"
              @pointermove="onPreviewPointerMove"
              @pointerup="onPreviewPointerUp"
              @pointercancel="onPreviewPointerUp"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
            <div class="rounded-[16px] liquid-glass-inset p-3">
              <p class="text-zinc-500 mb-1">原图</p>
              <p v-if="currentImage" class="text-white">{{ currentImage.naturalWidth }} × {{ currentImage.naturalHeight }} · {{ formatBytes(currentImage.size) }}</p>
              <p v-else class="text-zinc-500">未载入</p>
            </div>
            <div class="rounded-[16px] liquid-glass-inset p-3">
              <p class="text-zinc-500 mb-1">处理后</p>
              <p v-if="processedBlob" class="text-white">{{ processedWidth }} × {{ processedHeight }} · {{ formatBytes(processedBlob.size) }} <span class="text-ios-green">{{ sizeDeltaLabel }}</span></p>
              <p v-else class="text-zinc-500">等待处理</p>
            </div>
          </div>

          <div v-if="exifEntries.length" class="mt-4 rounded-[16px] liquid-glass-inset p-3 text-xs">
            <p class="text-zinc-500 mb-2">EXIF 信息</p>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              <div v-for="[label, value] in exifEntries" :key="label" class="flex justify-between gap-3">
                <dt class="text-zinc-500 shrink-0">{{ label }}</dt>
                <dd class="text-white text-right break-all">{{ value }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section ref="nineGridSection" v-if="activeTab === 'compose'" class="liquid-glass p-4 sm:p-5">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 class="text-base font-semibold text-white text-glass">九宫格切图</h2>
              <p class="text-[0.6875rem] text-zinc-500 mt-1">原图居中取正方形，再切成 3 × 3 等大物理像素图片。</p>
            </div>
          </div>
          <div v-if="!gridTiles.length" class="rounded-[16px] border border-dashed border-white/15 p-8 text-center text-xs text-zinc-500">生成后会在这里显示 9 张切图</div>
          <div v-else class="grid grid-cols-3 gap-2 sm:gap-3">
            <div v-for="tile in gridTiles" :key="tile.id" class="relative group rounded-[14px] overflow-hidden bg-black/20 border border-white/10">
              <img :src="tile.url" :alt="tile.name" class="w-full aspect-square object-cover" />
              <button type="button" class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-black/70 text-white p-2" title="下载切图" @click="downloadTile(tile)"><IconDownload class="w-4 h-4" /></button>
            </div>
          </div>
          <button v-if="gridTiles.length" type="button" class="mt-4 btn-ios btn-ios-primary py-2 px-3 text-xs" @click="downloadGridZip">打包下载 ZIP</button>
        </section>

        <p v-if="errorMessage" class="rounded-[16px] border border-ios-red/40 bg-ios-red/10 px-4 py-3 text-sm text-ios-red">{{ errorMessage }}</p>
        <p v-if="toastMessage" class="rounded-[16px] border border-ios-green/30 bg-ios-green/10 px-4 py-3 text-sm text-ios-green">{{ toastMessage }}</p>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useHead } from '@vueuse/head';

import JSZip from 'jszip';
import { IconDownload, IconPhoto } from '@tabler/icons-vue';
import BreadcrumbNav from '../../components/BreadcrumbNav.vue';

type StudioTab = 'compress' | 'resize' | 'privacy' | 'convert' | 'compose';
type MaskStyle = 'mosaic' | 'black' | 'white' | 'blur';
type ComposeDirection = 'vertical' | 'horizontal';

interface Point { x: number; y: number }
interface Rect { x: number; y: number; width: number; height: number }
interface Mask { rect: Rect; style: MaskStyle }
interface Preset { id: string; label: string; width: number; height: number }
interface StudioImage {
  id: string;
  file: File;
  sourceUrl: string;
  name: string;
  size: number;
  naturalWidth: number;
  naturalHeight: number;
  element: HTMLImageElement;
  exif: Record<string, any> | null;
}
interface GridTile { id: string; name: string; blob: Blob; url: string }

useHead({ title: '全能极速图片处理工作台 - proHub' });

const tabs: Array<{ id: StudioTab; label: string; symbol: string }> = [
  { id: 'compress', label: '指定 KB 压缩', symbol: 'KB' },
  { id: 'resize', label: '尺寸裁剪', symbol: '↗' },
  { id: 'privacy', label: '隐私水印', symbol: '◇' },
  { id: 'convert', label: '格式转换', symbol: '⇄' },
  { id: 'compose', label: '拼接九宫格', symbol: '▦' },
];

const presets: Preset[] = [
  { id: 'one-inch', label: '一寸照', width: 295, height: 413 },
  { id: 'two-inch', label: '二寸照', width: 413, height: 579 },
  { id: 'xiaohongshu', label: '小红书', width: 1080, height: 1440 },
  { id: 'wechat-square', label: '微信朋友圈/头像', width: 1080, height: 1080 },
  { id: 'wechat-cover', label: '公众号次图封面', width: 900, height: 383 },
];

const files = ref<StudioImage[]>([]);
const selectedId = ref<string | null>(null);
const activeTab = ref<StudioTab>('compress');
const dragging = ref(false);
const isProcessing = ref(false);
const errorMessage = ref('');
const toastMessage = ref('');
const viewMode = ref<'original' | 'processed'>('original');
const previewCanvas = ref<HTMLCanvasElement | null>(null);
const targetKB = ref(200);
const selectedPreset = ref('free');
const keepAspect = ref(true);
const outputWidth = ref(0);
const outputHeight = ref(0);
const watermarkEnabled = ref(true);
const watermarkText = ref('仅限 XX 办理业务使用，他用无效');
const maskStyle = ref<MaskStyle>('mosaic');
const outputFormat = ref('image/jpeg');
const outputQuality = ref(0.92);
const exifPolicy = ref<'strip' | 'keep' | 'edit'>('strip');
const exifEditDate = ref('');
const exifEditMake = ref('');
const exifEditModel = ref('');
const nineGridSection = ref<HTMLElement | null>(null);
const composeDirection = ref<ComposeDirection>('vertical');
const cropRect = ref<Rect | null>(null);
const temporaryCropRect = ref<Rect | null>(null);
const masks = ref<Mask[]>([]);
const undoStack = ref<Mask[][]>([]);
const redoStack = ref<Mask[][]>([]);
const temporaryMaskRect = ref<Rect | null>(null);
const dragStart = ref<Point | null>(null);
const interactionMode = ref<'crop' | 'mask' | null>(null);
const processedBlob = ref<Blob | null>(null);
const processedUrl = ref('');
const processedWidth = ref(0);
const processedHeight = ref(0);
const gridTiles = ref<GridTile[]>([]);

const currentImage = computed(() => files.value.find((image) => image.id === selectedId.value) || null);
const selectedPresetData = computed(() => presets.find((preset) => preset.id === selectedPreset.value) || null);
const dynamicMosaicBlock = computed(() => currentImage.value ? Math.max(6, Math.round(Math.max(currentImage.value.naturalWidth, currentImage.value.naturalHeight) / 100)) : 15);
const primaryActionLabel = computed(() => activeTab.value === 'compress' ? '压缩并预览' : activeTab.value === 'compose' ? '生成长图' : '处理并预览');
const sizeDeltaLabel = computed(() => {
  if (!currentImage.value || !processedBlob.value) return '';
  return `${Math.round(processedBlob.value.size / currentImage.value.size * 100)}%`;
});
const exifEntries = computed(() => {
  const exifData = currentImage.value?.exif;
  if (!exifData) return [];
  const entries: Array<[string, string]> = [];
  if (exifData.DateTimeOriginal) entries.push(['拍摄时间', new Date(exifData.DateTimeOriginal).toLocaleString('zh-CN')]);
  const camera = [exifData.Make, exifData.Model].filter(Boolean).join(' ');
  if (camera) entries.push(['相机', camera]);
  if (exifData.ExposureTime) entries.push(['曝光时间', `${exifData.ExposureTime}s`]);
  if (exifData.FNumber) entries.push(['光圈', `f/${exifData.FNumber}`]);
  if (exifData.ISO) entries.push(['ISO', String(exifData.ISO)]);
  if (exifData.FocalLength) entries.push(['焦距', `${exifData.FocalLength}mm`]);
  if (typeof exifData.GPSLatitude === 'number' && typeof exifData.GPSLongitude === 'number') entries.push(['GPS', `${exifData.GPSLatitude.toFixed(4)}, ${exifData.GPSLongitude.toFixed(4)}`]);
  return entries;
});

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeRect(rect: Rect): Rect {
  const image = currentImage.value;
  if (!image) return rect;
  const width = clamp(Math.abs(rect.width), 1, image.naturalWidth);
  const height = clamp(Math.abs(rect.height), 1, image.naturalHeight);
  return {
    x: clamp(Math.min(rect.x, rect.x + rect.width), 0, image.naturalWidth - width),
    y: clamp(Math.min(rect.y, rect.y + rect.height), 0, image.naturalHeight - height),
    width,
    height,
  };
}

function fullImageRect(): Rect {
  const image = currentImage.value;
  return image ? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight } : { x: 0, y: 0, width: 1, height: 1 };
}

function centerCropForAspect(aspect: number): Rect {
  const image = currentImage.value;
  if (!image || !Number.isFinite(aspect) || aspect <= 0) return fullImageRect();
  let width = image.naturalWidth;
  let height = Math.round(width / aspect);
  if (height > image.naturalHeight) {
    height = image.naturalHeight;
    width = Math.round(height * aspect);
  }
  return { x: Math.round((image.naturalWidth - width) / 2), y: Math.round((image.naturalHeight - height) / 2), width, height };
}

function setStatus(message: string): void {
  toastMessage.value = message;
  window.setTimeout(() => { if (toastMessage.value === message) toastMessage.value = ''; }, 2800);
}

function resetProcessingState(): void {
  if (processedUrl.value) URL.revokeObjectURL(processedUrl.value);
  processedUrl.value = '';
  processedBlob.value = null;
  processedWidth.value = 0;
  processedHeight.value = 0;
  viewMode.value = 'original';
}

function clearGridTiles(): void {
  gridTiles.value.forEach((tile) => URL.revokeObjectURL(tile.url));
  gridTiles.value = [];
}

function initializeImageState(): void {
  const image = currentImage.value;
  resetProcessingState();
  clearGridTiles();
  masks.value = [];
  undoStack.value = [];
  redoStack.value = [];
  temporaryMaskRect.value = null;
  temporaryCropRect.value = null;
  cropRect.value = image ? fullImageRect() : null;
  outputWidth.value = image?.naturalWidth || 0;
  outputHeight.value = image?.naturalHeight || 0;
  selectedPreset.value = 'free';
  watermarkEnabled.value = true;
  watermarkText.value = '仅限 XX 办理业务使用，他用无效';
  maskStyle.value = 'mosaic';
  exifPolicy.value = 'strip';
  exifEditDate.value = '';
  exifEditMake.value = '';
  exifEditModel.value = '';
  nextTick(drawPreview);
}

function selectImage(imageId: string): void {
  selectedId.value = imageId;
}

function removeImage(imageId: string): void {
  const imageIndex = files.value.findIndex((image) => image.id === imageId);
  const image = files.value[imageIndex];
  if (!image) return;
  URL.revokeObjectURL(image.sourceUrl);
  files.value.splice(imageIndex, 1);
  if (selectedId.value === imageId) selectedId.value = files.value[Math.max(0, imageIndex - 1)]?.id || null;
  if (!files.value.length) initializeImageState();
}

function clearAll(): void {
  files.value.forEach((image) => URL.revokeObjectURL(image.sourceUrl));
  files.value = [];
  selectedId.value = null;
  initializeImageState();
}

function isHeic(file: File): boolean {
  return /\.hei[cf]$/i.test(file.name) || /image\/(hei[cf]|heic-sequence)/i.test(file.type);
}

async function decodeImageFile(file: File): Promise<StudioImage> {
  let renderBlob: Blob = file;
  if (isHeic(file)) {
    const heicModule = await import('heic2any');
    const converter = heicModule.default || heicModule;
    const converted = await converter({ blob: file, toType: 'image/png' });
    renderBlob = Array.isArray(converted) ? converted[0] : converted;
  }
  const sourceUrl = URL.createObjectURL(renderBlob);
  const element = new Image();
  element.decoding = 'async';
  element.src = sourceUrl;
  await new Promise<void>((resolve, reject) => {
    element.onload = () => resolve();
    element.onerror = () => reject(new Error(`${file.name} 无法读取`));
  });
  let exifData: Record<string, any> | null = null;
  try {
    const exifModule = await import('exifr');
    const parsed = await exifModule.parse(file, { tiff: true, exif: true, gps: true });
    if (parsed) exifData = parsed;
  } catch {
    exifData = null;
  }
  return {
    id: createId(),
    file,
    sourceUrl,
    name: file.name,
    size: file.size,
    naturalWidth: element.naturalWidth,
    naturalHeight: element.naturalHeight,
    element,
    exif: exifData,
  };
}

async function addFiles(fileList: File[]): Promise<void> {
  const imageFiles = fileList.filter((file) => file.type.startsWith('image/') || isHeic(file));
  if (!imageFiles.length) return;
  errorMessage.value = '';
  const addedImages: StudioImage[] = [];
  for (const file of imageFiles) {
    try {
      const image = await decodeImageFile(file);
      files.value.push(image);
      addedImages.push(image);
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '图片读取失败';
    }
  }
  if (files.value.length === addedImages.length || addedImages.length > 0) {
    selectedId.value = addedImages[0].id;
    initializeImageState();
  }
  if (currentImage.value) nextTick(drawPreview);
}

function onFilesSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  void addFiles(Array.from(input.files || []));
  input.value = '';
}

function onDrop(event: DragEvent): void {
  dragging.value = false;
  void addFiles(Array.from(event.dataTransfer?.files || []));
}

function switchTab(tab: StudioTab): void {
  activeTab.value = tab;
  if (tab === 'resize' && currentImage.value && !cropRect.value) cropRect.value = fullImageRect();
  nextTick(drawPreview);
}

function applyPreset(): void {
  const image = currentImage.value;
  const preset = selectedPresetData.value;
  if (!image || !preset) {
    cropRect.value = fullImageRect();
    outputWidth.value = image?.naturalWidth || 0;
    outputHeight.value = image?.naturalHeight || 0;
    nextTick(drawPreview);
    return;
  }
  outputWidth.value = preset.width;
  outputHeight.value = preset.height;
  cropRect.value = centerCropForAspect(preset.width / preset.height);
  nextTick(drawPreview);
}

function onWidthInput(): void {
  const width = Math.max(1, Math.round(Number(outputWidth.value) || 1));
  outputWidth.value = width;
  if (keepAspect.value) {
    const aspect = selectedPresetData.value ? selectedPresetData.value.width / selectedPresetData.value.height : (currentImage.value ? currentImage.value.naturalWidth / currentImage.value.naturalHeight : 1);
    outputHeight.value = Math.max(1, Math.round(width / aspect));
  }
}

function onHeightInput(): void {
  const height = Math.max(1, Math.round(Number(outputHeight.value) || 1));
  outputHeight.value = height;
  if (keepAspect.value) {
    const aspect = selectedPresetData.value ? selectedPresetData.value.width / selectedPresetData.value.height : (currentImage.value ? currentImage.value.naturalWidth / currentImage.value.naturalHeight : 1);
    outputWidth.value = Math.max(1, Math.round(height * aspect));
  }
}

function resetCrop(): void {
  selectedPreset.value = 'free';
  cropRect.value = fullImageRect();
  if (currentImage.value) {
    outputWidth.value = currentImage.value.naturalWidth;
    outputHeight.value = currentImage.value.naturalHeight;
  }
  nextTick(drawPreview);
}

function getCanvasPoint(event: PointerEvent): Point | null {
  const canvas = previewCanvas.value;
  const image = currentImage.value;
  if (!canvas || !image) return null;
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;
  return {
    x: clamp((event.clientX - bounds.left) * canvas.width / bounds.width, 0, image.naturalWidth),
    y: clamp((event.clientY - bounds.top) * canvas.height / bounds.height, 0, image.naturalHeight),
  };
}

function rectFromPoints(start: Point, end: Point, aspect?: number): Rect {
  let width = Math.abs(end.x - start.x);
  let height = Math.abs(end.y - start.y);
  if (aspect && aspect > 0) {
    if (width / Math.max(height, 1) > aspect) height = width / aspect;
    else width = height * aspect;
  }
  const signedWidth = end.x >= start.x ? width : -width;
  const signedHeight = end.y >= start.y ? height : -height;
  return normalizeRect({ x: start.x, y: start.y, width: signedWidth, height: signedHeight });
}

function onPreviewPointerDown(event: PointerEvent): void {
  if (!currentImage.value || activeTab.value === 'compose' || viewMode.value !== 'original') return;
  const point = getCanvasPoint(event);
  if (!point) return;
  dragStart.value = point;
  interactionMode.value = activeTab.value === 'resize' ? 'crop' : 'mask';
  if (interactionMode.value === 'crop') temporaryCropRect.value = { x: point.x, y: point.y, width: 1, height: 1 };
  else temporaryMaskRect.value = { x: point.x, y: point.y, width: 1, height: 1 };
  (event.currentTarget as HTMLCanvasElement).setPointerCapture(event.pointerId);
}

function onPreviewPointerMove(event: PointerEvent): void {
  if (!dragStart.value || !interactionMode.value) return;
  const point = getCanvasPoint(event);
  if (!point) return;
  const aspect = interactionMode.value === 'crop' && selectedPresetData.value ? selectedPresetData.value.width / selectedPresetData.value.height : undefined;
  const nextRect = rectFromPoints(dragStart.value, point, aspect);
  if (interactionMode.value === 'crop') temporaryCropRect.value = nextRect;
  else temporaryMaskRect.value = nextRect;
  drawPreview();
}

function onPreviewPointerUp(): void {
  if (interactionMode.value === 'crop' && temporaryCropRect.value && temporaryCropRect.value.width > 2 && temporaryCropRect.value.height > 2) cropRect.value = temporaryCropRect.value;
  if (interactionMode.value === 'mask' && temporaryMaskRect.value && temporaryMaskRect.value.width > 2 && temporaryMaskRect.value.height > 2) {
    undoStack.value.push(cloneMasks(masks.value));
    masks.value.push({ rect: temporaryMaskRect.value, style: maskStyle.value });
    redoStack.value = [];
  }
  temporaryCropRect.value = null;
  temporaryMaskRect.value = null;
  dragStart.value = null;
  interactionMode.value = null;
  drawPreview();
}

function drawMaskOverlay(context: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement, mask: Mask, temporary = false): void {
  context.save();
  if (mask.style === 'black') {
    context.fillStyle = '#000';
    context.fillRect(mask.rect.x, mask.rect.y, mask.rect.width, mask.rect.height);
  } else if (mask.style === 'white') {
    context.fillStyle = '#fff';
    context.fillRect(mask.rect.x, mask.rect.y, mask.rect.width, mask.rect.height);
  } else if (mask.style === 'blur') {
    drawBlur(context, sourceCanvas, mask.rect);
  } else {
    drawMosaic(context, sourceCanvas, mask.rect);
  }
  context.strokeStyle = temporary ? '#007AFF' : 'rgba(255,255,255,0.8)';
  context.lineWidth = Math.max(2, Math.round(Math.max(mask.rect.width, mask.rect.height) / 300));
  context.setLineDash(temporary ? [8, 8] : []);
  context.strokeRect(mask.rect.x, mask.rect.y, mask.rect.width, mask.rect.height);
  context.restore();
}

function drawWatermark(context: CanvasRenderingContext2D, width: number, height: number): void {
  if (!watermarkEnabled.value || !watermarkText.value.trim()) return;
  const fontSize = Math.max(18, Math.round(Math.max(width, height) / 50));
  const tileWidth = Math.max(360, Math.round(fontSize * 13));
  const tileHeight = Math.max(220, Math.round(fontSize * 8));
  context.save();
  context.fillStyle = 'rgba(128,128,128,0.3)';
  context.font = `600 ${fontSize}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (let rowIndex = -2; rowIndex < Math.ceil(height / tileHeight) + 2; rowIndex += 1) {
    for (let columnIndex = -2; columnIndex < Math.ceil(width / tileWidth) + 2; columnIndex += 1) {
      context.save();
      context.translate(columnIndex * tileWidth + tileWidth / 2, rowIndex * tileHeight + tileHeight / 2);
      context.rotate(-Math.PI / 4);
      context.fillText(watermarkText.value, 0, 0);
      context.restore();
    }
  }
  context.restore();
}

function drawPreview(): void {
  const canvas = previewCanvas.value;
  const image = currentImage.value;
  if (!canvas || !image) return;
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.drawImage(image.element, 0, 0, image.naturalWidth, image.naturalHeight);
  if (activeTab.value === 'privacy') {
    masks.value.forEach((mask) => drawMaskOverlay(context, canvas, mask));
    if (temporaryMaskRect.value) drawMaskOverlay(context, canvas, { rect: temporaryMaskRect.value, style: maskStyle.value }, true);
    drawWatermark(context, canvas.width, canvas.height);
  }
  if (activeTab.value === 'resize') {
    const selection = temporaryCropRect.value || cropRect.value;
    if (selection) {
      context.save();
      context.fillStyle = 'rgba(0,0,0,0.48)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'destination-out';
      context.fillRect(selection.x, selection.y, selection.width, selection.height);
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = '#007AFF';
      context.lineWidth = Math.max(3, Math.round(Math.max(canvas.width, canvas.height) / 500));
      context.setLineDash([12, 8]);
      context.strokeRect(selection.x, selection.y, selection.width, selection.height);
      context.restore();
    }
  }
}

function renderSourceCanvas(image: StudioImage, crop: Rect, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持 Canvas');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image.element, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function drawMosaic(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, rect: Rect): void {
  const pixelWidth = Math.max(1, Math.round(rect.width / dynamicMosaicBlock.value));
  const pixelHeight = Math.max(1, Math.round(rect.height / dynamicMosaicBlock.value));
  const mosaicCanvas = document.createElement('canvas');
  mosaicCanvas.width = pixelWidth;
  mosaicCanvas.height = pixelHeight;
  const mosaicContext = mosaicCanvas.getContext('2d');
  if (!mosaicContext) return;
  mosaicContext.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, pixelWidth, pixelHeight);
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(mosaicCanvas, 0, 0, pixelWidth, pixelHeight, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function drawBlur(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, rect: Rect): void {
  const radius = Math.max(2, Math.round(Math.min(rect.width, rect.height) / 30));
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = Math.max(1, Math.round(rect.width));
  tempCanvas.height = Math.max(1, Math.round(rect.height));
  const tempContext = tempCanvas.getContext('2d');
  if (!tempContext) return;
  tempContext.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, tempCanvas.width, tempCanvas.height);
  context.save();
  context.filter = `blur(${radius}px)`;
  context.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function applyMasksAndWatermark(canvas: HTMLCanvasElement, sourceCrop: Rect): void {
  const context = canvas.getContext('2d');
  const image = currentImage.value;
  if (!context || !image || activeTab.value !== 'privacy') return;
  masks.value.forEach((mask) => {
    const intersectionLeft = Math.max(mask.rect.x, sourceCrop.x);
    const intersectionTop = Math.max(mask.rect.y, sourceCrop.y);
    const intersectionRight = Math.min(mask.rect.x + mask.rect.width, sourceCrop.x + sourceCrop.width);
    const intersectionBottom = Math.min(mask.rect.y + mask.rect.height, sourceCrop.y + sourceCrop.height);
    if (intersectionRight <= intersectionLeft || intersectionBottom <= intersectionTop) return;
    const outputRect: Rect = {
      x: (intersectionLeft - sourceCrop.x) * canvas.width / sourceCrop.width,
      y: (intersectionTop - sourceCrop.y) * canvas.height / sourceCrop.height,
      width: (intersectionRight - intersectionLeft) * canvas.width / sourceCrop.width,
      height: (intersectionBottom - intersectionTop) * canvas.height / sourceCrop.height,
    };
    if (mask.style === 'black') {
      context.fillStyle = '#000';
      context.fillRect(outputRect.x, outputRect.y, outputRect.width, outputRect.height);
    } else if (mask.style === 'white') {
      context.fillStyle = '#fff';
      context.fillRect(outputRect.x, outputRect.y, outputRect.width, outputRect.height);
    } else if (mask.style === 'blur') {
      drawBlur(context, canvas, outputRect);
    } else drawMosaic(context, canvas, outputRect);
  });
  drawWatermark(context, canvas.width, canvas.height);
}

function renderCurrentCanvas(): HTMLCanvasElement {
  const image = currentImage.value;
  if (!image) throw new Error('请先导入图片');
  const sourceCrop = activeTab.value === 'resize' && cropRect.value ? normalizeRect(cropRect.value) : fullImageRect();
  const width = activeTab.value === 'resize' ? Math.max(1, Math.round(outputWidth.value)) : image.naturalWidth;
  const height = activeTab.value === 'resize' ? Math.max(1, Math.round(outputHeight.value)) : image.naturalHeight;
  const canvas = renderSourceCanvas(image, sourceCrop, width, height);
  applyMasksAndWatermark(canvas, sourceCrop);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('图片导出失败')), mime, quality);
  });
}

function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.floor(base64.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',');
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let byteIndex = 0; byteIndex < binary.length; byteIndex += 1) bytes[byteIndex] = binary.charCodeAt(byteIndex);
  return new Blob([bytes], { type: header.match(/data:(.*?);/)?.[1] || 'image/jpeg' });
}

async function compressToTarget(canvas: HTMLCanvasElement, targetBytes: number): Promise<Blob> {
  const initialDataUrl = canvas.toDataURL('image/jpeg', 0.95);
  if (dataUrlBytes(initialDataUrl) <= targetBytes) return dataUrlToBlob(initialDataUrl);
  let lowerQuality = 0.1;
  let upperQuality = 0.95;
  let bestDataUrl = canvas.toDataURL('image/jpeg', lowerQuality);
  for (let iteration = 0; iteration < 7; iteration += 1) {
    const quality = (lowerQuality + upperQuality) / 2;
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrlBytes(dataUrl) <= targetBytes) {
      bestDataUrl = dataUrl;
      lowerQuality = quality;
    } else upperQuality = quality;
  }
  return dataUrlToBlob(bestDataUrl);
}

function setProcessed(blob: Blob, width: number, height: number): void {
  if (processedUrl.value) URL.revokeObjectURL(processedUrl.value);
  processedBlob.value = blob;
  processedUrl.value = URL.createObjectURL(blob);
  processedWidth.value = width;
  processedHeight.value = height;
  viewMode.value = 'processed';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function applyExifPolicy(dataUrl: string, sourceFile: File | null): Promise<string> {
  if (exifPolicy.value === 'strip') return dataUrl;
  let newDataUrl = dataUrl;
  try {
    const piexifModule = await import('piexifjs');
    const piexif = piexifModule.default || piexifModule;
    let exifObj: Record<string, any> = { '0th': {}, 'Exif': {}, 'GPS': {}, 'Interop': {}, '1st': {}, 'thumbnail': null };
    if (exifPolicy.value === 'keep' && sourceFile) {
      const sourceDataUrl = await fileToDataUrl(sourceFile);
      exifObj = piexif.load(sourceDataUrl);
    } else if (exifPolicy.value === 'edit') {
      if (exifEditDate.value) exifObj['0th'][piexif.ImageIFD.DateTime] = exifEditDate.value;
      if (exifEditMake.value) exifObj['0th'][piexif.ImageIFD.Make] = exifEditMake.value;
      if (exifEditModel.value) exifObj['0th'][piexif.ImageIFD.Model] = exifEditModel.value;
    }
    newDataUrl = piexif.insert(piexif.dump(exifObj), dataUrl);
  } catch {
    newDataUrl = dataUrl;
  }
  return newDataUrl;
}

async function processCurrent(): Promise<void> {
  const canvas = renderCurrentCanvas();
  const image = currentImage.value;
  if (!image) return;
  let blob: Blob;
  const mime = activeTab.value === 'convert' ? outputFormat.value : 'image/jpeg';
  if (activeTab.value === 'compress') {
    blob = await compressToTarget(canvas, Math.max(10, targetKB.value) * 1024);
  } else if (mime === 'image/jpeg' && exifPolicy.value !== 'strip') {
    const dataUrl = await applyExifPolicy(canvas.toDataURL('image/jpeg', outputQuality.value), image.file);
    blob = dataUrlToBlob(dataUrl);
  } else {
    blob = await canvasToBlob(canvas, mime, outputQuality.value);
  }
  setProcessed(blob, canvas.width, canvas.height);
  setStatus(`已生成 ${formatBytes(blob.size)} 处理结果`);
}

async function composeImages(): Promise<void> {
  if (files.value.length < 2) throw new Error('拼接至少需要 2 张图片');
  const firstImage = files.value[0];
  const canvas = document.createElement('canvas');
  if (composeDirection.value === 'vertical') {
    canvas.width = firstImage.naturalWidth;
    canvas.height = files.value.reduce((totalHeight, image) => totalHeight + Math.round(image.naturalHeight * firstImage.naturalWidth / image.naturalWidth), 0);
  } else {
    canvas.height = firstImage.naturalHeight;
    canvas.width = files.value.reduce((totalWidth, image) => totalWidth + Math.round(image.naturalWidth * firstImage.naturalHeight / image.naturalHeight), 0);
  }
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持 Canvas');
  let offset = 0;
  files.value.forEach((image) => {
    const width = composeDirection.value === 'vertical' ? firstImage.naturalWidth : Math.round(image.naturalWidth * firstImage.naturalHeight / image.naturalHeight);
    const height = composeDirection.value === 'vertical' ? Math.round(image.naturalHeight * firstImage.naturalWidth / image.naturalWidth) : firstImage.naturalHeight;
    context.drawImage(image.element, 0, 0, image.naturalWidth, image.naturalHeight, composeDirection.value === 'vertical' ? 0 : offset, composeDirection.value === 'vertical' ? offset : 0, width, height);
    offset += composeDirection.value === 'vertical' ? height : width;
  });
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
  setProcessed(blob, canvas.width, canvas.height);
  setStatus(`已拼接 ${files.value.length} 张图片`);
}

async function createNineGridAndScroll(): Promise<void> {
  await createNineGrid();
  await nextTick();
  if (nineGridSection.value) nineGridSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function createNineGrid(): Promise<void> {
  const image = currentImage.value;
  if (!image) throw new Error('请先导入图片');
  clearGridTiles();
  const tileSize = Math.floor(Math.min(image.naturalWidth, image.naturalHeight) / 3);
  if (tileSize < 1) throw new Error('图片尺寸太小，无法切割九宫格');
  const squareSize = tileSize * 3;
  const sourceX = Math.floor((image.naturalWidth - squareSize) / 2);
  const sourceY = Math.floor((image.naturalHeight - squareSize) / 2);
  const nextTiles: GridTile[] = [];
  for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = tileSize;
      canvas.height = tileSize;
      const context = canvas.getContext('2d');
      if (!context) continue;
      context.drawImage(image.element, sourceX + columnIndex * tileSize, sourceY + rowIndex * tileSize, tileSize, tileSize, 0, 0, tileSize, tileSize);
      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.94);
      nextTiles.push({ id: createId(), name: `nine-grid-${rowIndex * 3 + columnIndex + 1}.jpg`, blob, url: URL.createObjectURL(blob) });
    }
  }
  gridTiles.value = nextTiles;
  setStatus('九宫格已生成 9 张等大图片');
}

async function runPrimaryAction(): Promise<void> {
  if (!currentImage.value) return;
  isProcessing.value = true;
  errorMessage.value = '';
  try {
    if (activeTab.value === 'compose') await composeImages();
    else await processCurrent();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '图片处理失败';
  } finally {
    isProcessing.value = false;
  }
}

function extensionForMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/avif') return 'avif';
  return 'jpg';
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadProcessed(): void {
  if (!processedBlob.value) return;
  downloadBlob(processedBlob.value, `prohub-image-${Date.now()}.${extensionForMime(processedBlob.value.type)}`);
}

function downloadTile(tile: GridTile): void {
  downloadBlob(tile.blob, tile.name);
}

async function downloadGridZip(): Promise<void> {
  if (!gridTiles.value.length) return;
  const zip = new JSZip();
  gridTiles.value.forEach((tile) => zip.file(tile.name, tile.blob));
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `prohub-nine-grid-${Date.now()}.zip`);
}

function cloneMasks(source: Mask[]): Mask[] {
  return source.map((m) => ({ rect: { ...m.rect }, style: m.style }));
}
function undoMask(): void {
  const prev = undoStack.value.pop();
  if (prev) { redoStack.value.push(cloneMasks(masks.value)); masks.value = prev; nextTick(drawPreview); }
}
function redoMask(): void {
  const next = redoStack.value.pop();
  if (next) { undoStack.value.push(cloneMasks(masks.value)); masks.value = next; nextTick(drawPreview); }
}
function clearMasks(): void {
  undoStack.value.push(cloneMasks(masks.value));
  masks.value = [];
  redoStack.value = [];
  nextTick(drawPreview);
}

watch(() => currentImage.value?.id, initializeImageState);
watch([activeTab, masks, watermarkEnabled, watermarkText, maskStyle, viewMode], () => nextTick(drawPreview), { deep: true });

onMounted(() => nextTick(drawPreview));
onUnmounted(() => {
  files.value.forEach((image) => URL.revokeObjectURL(image.sourceUrl));
  if (processedUrl.value) URL.revokeObjectURL(processedUrl.value);
  clearGridTiles();
});
</script>
