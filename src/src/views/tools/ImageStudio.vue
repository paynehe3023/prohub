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
      <aside class="relative z-[200] space-y-5">
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

        <section class="relative z-[300] liquid-glass p-4 space-y-4 overflow-visible">
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
              <select v-model="selectedPreset" class="liquid-glass-select mt-2 w-full rounded-xl px-3 py-2 text-white outline-none" @change="applyPreset">
                <option value="free">自由裁剪</option>
                <option v-for="preset in presets" :key="preset.id" :value="preset.id">{{ preset.label }} · {{ preset.width }} × {{ preset.height }}</option>
              </select>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="text-xs text-zinc-400">Width
                <input v-model.number="outputWidth" :disabled="selectedPreset !== 'free'" type="number" min="1" class="mt-2 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white outline-none disabled:cursor-not-allowed disabled:opacity-50" @input="onWidthInput" />
              </label>
              <label class="text-xs text-zinc-400">Height
                <input v-model.number="outputHeight" :disabled="selectedPreset !== 'free'" type="number" min="1" class="mt-2 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white outline-none disabled:cursor-not-allowed disabled:opacity-50" @input="onHeightInput" />
              </label>
            </div>
            <label class="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input v-model="keepAspect" type="checkbox" class="accent-[#007AFF]" @change="syncResizeDimensionsToCrop" />
              锁定比例 Keep Aspect Ratio
            </label>
            <div v-if="cropRect" class="rounded-xl liquid-glass-inset p-3 text-[0.6875rem] text-zinc-400 space-y-1">
              <p class="text-zinc-300">当前选区（物理像素）</p>
              <p>X {{ Math.round(cropRect.x) }} · Y {{ Math.round(cropRect.y) }}</p>
              <p>W {{ Math.round(cropRect.width) }} · H {{ Math.round(cropRect.height) }}</p>
            </div>
            <button type="button" class="w-full rounded-xl liquid-glass-inset px-3 py-2 text-xs text-zinc-300 hover:text-white" @click="resetCrop">重置裁剪选区</button>
          </div>

          <div v-else-if="activeTab === 'privacy'" class="relative z-[200] space-y-4">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-semibold text-white text-glass">隐私水印与打码</h2>
                <span class="relative z-[300] inline-flex group">
                  <button type="button" class="w-4 h-4 rounded-full border border-white/30 text-[0.625rem] text-zinc-300 leading-none hover:text-white hover:border-white/70" aria-label="盲水印说明">?</button>
                  <span role="tooltip" class="pointer-events-none absolute left-0 top-full mt-2 z-[9999] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-white/15 bg-zinc-950/95 px-3 py-2 text-[0.6875rem] leading-relaxed text-zinc-200 opacity-0 shadow-2xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">盲水印会把半透明的斜向文字平铺写入导出图片；遮罩支持马赛克、黑色/白色遮盖与柔焦模糊，每个遮罩独立记录自己的方式，绘制时即可看到真实效果。</span>
                </span>
              </div>
              <p class="text-[0.6875rem] text-zinc-500 mt-1">在预览图上拖拽矩形，导出时按物理像素映射。</p>
            </div>
            <label class="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer"><input v-model="watermarkEnabled" type="checkbox" class="accent-[#007AFF]" />启用盲水印</label>
            <label class="block text-xs text-zinc-400">水印文本
              <textarea v-model="watermarkText" rows="3" class="mt-2 w-full rounded-xl liquid-glass-inset px-3 py-2 text-white outline-none resize-none" />
            </label>
            <label class="block text-xs text-zinc-400">遮罩方式
              <select v-model="maskStyle" class="liquid-glass-select mt-2 w-full rounded-xl px-3 py-2 text-white outline-none">
                <option value="mosaic">马赛克</option>
                <option value="black">黑色遮盖</option>
                <option value="white">白色遮盖</option>
                <option value="blur">柔焦模糊</option>
              </select>
            </label>
             <div class="rounded-xl liquid-glass-inset p-3 text-[0.6875rem] text-zinc-400">动态块大小：{{ dynamicMosaicBlock }} px · 已添加 {{ masks.length }} 个遮罩</div>
             <div class="grid grid-cols-3 gap-2">
               <button type="button" class="rounded-xl liquid-glass-inset px-2 py-2 text-base leading-none text-zinc-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40" :disabled="!undoStack.length" aria-label="撤回" title="撤回" @click="undoMask">←</button>
               <button type="button" class="rounded-xl liquid-glass-inset px-2 py-2 text-base leading-none text-zinc-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40" :disabled="!redoStack.length" aria-label="重做" title="重做" @click="redoMask">→</button>
               <button type="button" class="rounded-xl liquid-glass-inset px-2 py-2 text-xs text-zinc-300 hover:text-white" :disabled="!masks.length" @click="clearMasks">清除全部</button>
             </div>
             <div v-if="selectedMask" class="rounded-xl liquid-glass-inset p-3 space-y-2">
               <div class="flex items-center justify-between gap-2 text-[0.6875rem]">
                 <span class="text-zinc-300">选中遮罩 #{{ (selectedMaskIndex ?? 0) + 1 }}</span>
                 <span class="text-zinc-500">{{ Math.round(selectedMask.rotation) }}°</span>
               </div>
               <label class="block text-[0.6875rem] text-zinc-400">旋转方向
                 <input :value="selectedMask.rotation" type="range" min="-180" max="180" step="1" class="mt-2 w-full accent-[#007AFF]" @input="onMaskRotationInput" />
               </label>
               <div class="grid grid-cols-2 gap-2">
                 <button type="button" class="rounded-lg bg-white/5 px-2 py-1.5 text-[0.6875rem] text-zinc-300 hover:text-white" @click="rotateSelectedMask(-15)">↺ 左转 15°</button>
                 <button type="button" class="rounded-lg bg-white/5 px-2 py-1.5 text-[0.6875rem] text-zinc-300 hover:text-white" @click="rotateSelectedMask(15)">↻ 右转 15°</button>
               </div>
               <p class="text-[0.625rem] leading-relaxed text-zinc-500">拖动遮罩内部可移动，拖动四角可调整大小，拖动圆形手柄可旋转。</p>
             </div>
          </div>

          <div v-else-if="activeTab === 'convert'" class="space-y-4">
            <div>
              <h2 class="text-sm font-semibold text-white text-glass">格式转换与 EXIF 清洗</h2>
              <p class="text-[0.6875rem] text-zinc-500 mt-1">重绘会剥离 GPS 等原始 EXIF 信息。</p>
            </div>
            <label class="block text-xs text-zinc-400">导出格式
              <select v-model="outputFormat" class="liquid-glass-select mt-2 w-full rounded-xl px-3 py-2 text-white outline-none">
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
                <option value="image/avif">AVIF（需浏览器支持）</option>
              </select>
            </label>
            <label v-if="outputFormat === 'image/jpeg'" class="block text-xs text-zinc-400">EXIF 处理
                <select v-model="exifPolicy" class="liquid-glass-select mt-2 w-full rounded-xl px-3 py-2 text-white outline-none">
                <option value="strip">剥离 EXIF（默认）</option>
                <option value="keep">保留原 EXIF</option>
                <option value="edit">编辑 EXIF</option>
              </select>
            </label>
            <div v-if="exifPolicy === 'edit'" class="space-y-2 rounded-xl liquid-glass-inset p-3">
              <div class="block text-xs text-zinc-400">
                <div ref="exifDatePickerRoot" class="relative mt-1">
                  <button
                    type="button"
                    class="w-full rounded-xl liquid-glass-inset px-3 py-2 text-left text-white outline-none transition-colors hover:bg-white/10 focus:ring-2 focus:ring-ios-blue/60"
                    aria-haspopup="dialog"
                    :aria-expanded="exifDatePickerOpen"
                    @click.prevent.stop="openExifDatePicker"
                  >
                    <span :class="exifEditDateDisplay ? 'text-white' : 'text-zinc-500'">
                      {{ exifEditDateDisplay || '点击选择拍摄时间' }}
                    </span>
                  </button>
                  <IconClockHour4 class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" size="16" />
                  <div
                    v-if="exifDatePickerOpen"
                    role="dialog"
                    aria-label="选择拍摄时间"
                    class="exif-date-picker absolute left-0 top-full z-[10000] mt-2 w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl p-2.5"
                    @click.stop
                  >
                    <div class="flex items-center justify-between gap-2">
                      <button type="button" class="rounded-lg px-2 py-1 text-lg text-zinc-300 hover:bg-white/10 hover:text-white" aria-label="上个月" @click="changeExifPickerMonth(-1)">‹</button>
                      <div class="flex min-w-0 flex-1 items-center justify-center gap-1.5">
                        <select
                          :value="exifPickerYear"
                          aria-label="选择年份"
                          class="liquid-glass-select h-8 min-w-0 flex-1 rounded-lg px-2 py-1 text-xs font-semibold text-white outline-none"
                          @change="changeExifPickerYear"
                        >
                          <option v-for="year in exifPickerYearOptions" :key="year" :value="year">{{ year }}年</option>
                        </select>
                        <span class="shrink-0 text-sm font-semibold text-white">{{ exifPickerMonthLabel }}</span>
                      </div>
                      <button type="button" class="rounded-lg px-2 py-1 text-lg text-zinc-300 hover:bg-white/10 hover:text-white" aria-label="下个月" @click="changeExifPickerMonth(1)">›</button>
                    </div>
                    <div class="mt-3 grid grid-cols-7 gap-1 text-center text-[0.625rem] text-zinc-500">
                      <span v-for="weekday in ['日', '一', '二', '三', '四', '五', '六']" :key="weekday">{{ weekday }}</span>
                    </div>
                    <div class="mt-1 grid grid-cols-7 gap-1">
                      <button
                        v-for="day in exifPickerCalendarDays"
                        :key="day.dateKey"
                        type="button"
                        class="h-7 rounded-lg text-[0.6875rem] transition-colors"
                        :class="[
                          day.currentMonth ? 'text-zinc-200' : 'text-zinc-600',
                          day.dateKey === exifPickerSelectedDateKey ? 'bg-ios-blue text-white shadow-lg shadow-ios-blue/20' : 'hover:bg-white/10 hover:text-white',
                        ]"
                        @click="selectExifPickerDate(day.dateKey)"
                      >
                        {{ day.day }}
                      </button>
                    </div>
                    <div class="mt-2 border-t border-white/10 pt-2">
                      <p class="mb-2 text-[0.6875rem] text-zinc-500">选择时间</p>
                      <div class="grid grid-cols-3 gap-2">
                        <label class="text-[0.625rem] text-zinc-500">时
                          <select :value="exifPickerTime.hours" class="liquid-glass-select mt-1 w-full rounded-lg px-2 py-1 text-xs text-white outline-none" @change="updateExifPickerTime('hours', $event)">
                            <option v-for="hour in 24" :key="hour - 1" :value="hour - 1">{{ String(hour - 1).padStart(2, '0') }}</option>
                          </select>
                        </label>
                        <label class="text-[0.625rem] text-zinc-500">分
                          <select :value="exifPickerTime.minutes" class="liquid-glass-select mt-1 w-full rounded-lg px-2 py-1 text-xs text-white outline-none" @change="updateExifPickerTime('minutes', $event)">
                            <option v-for="minute in 60" :key="minute - 1" :value="minute - 1">{{ String(minute - 1).padStart(2, '0') }}</option>
                          </select>
                        </label>
                        <label class="text-[0.625rem] text-zinc-500">秒
                          <select :value="exifPickerTime.seconds" class="liquid-glass-select mt-1 w-full rounded-lg px-2 py-1 text-xs text-white outline-none" @change="updateExifPickerTime('seconds', $event)">
                            <option v-for="second in 60" :key="second - 1" :value="second - 1">{{ String(second - 1).padStart(2, '0') }}</option>
                          </select>
                        </label>
                      </div>
                    </div>
                    <div class="mt-2 flex items-center justify-between gap-2">
                      <button type="button" class="rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-white" @click="clearExifPicker">清除</button>
                      <button type="button" class="rounded-lg bg-ios-blue px-3 py-1.5 text-xs text-white hover:bg-ios-blue/90" @click="confirmExifPicker">完成</button>
                    </div>
                  </div>
                </div>
              </div>
              <p class="text-[0.625rem] leading-relaxed text-zinc-500">点击后在日历和时间面板中选择，导出时会转换为 EXIF 标准时间格式。</p>
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
              <button type="button" class="rounded-xl px-3 py-2 text-xs" :class="viewMode === 'editing' ? 'bg-ios-blue text-white' : 'liquid-glass-inset text-zinc-400'" @click="viewMode = 'editing'">编辑预览</button>
              <button type="button" class="rounded-xl px-3 py-2 text-xs" :disabled="!hasCurrentProcessed" :class="viewMode === 'processed' ? 'bg-ios-blue text-white' : 'liquid-glass-inset text-zinc-400'" @click="viewMode = 'processed'">处理后</button>
              <button v-if="hasCurrentProcessed" type="button" class="btn-ios btn-ios-glass py-2 px-3 text-xs" @click="downloadProcessed"><IconDownload class="w-4 h-4" />下载</button>
            </div>
          </div>

          <div class="min-h-[360px] rounded-[20px] bg-black/20 border border-white/10 flex items-center justify-center overflow-hidden p-3">
            <div v-if="!currentImage" class="text-center text-zinc-500 text-sm">导入图片后开始处理</div>
            <img v-else-if="viewMode === 'processed' && hasCurrentProcessed" :src="processedUrl" alt="处理结果" class="max-w-full max-h-[600px] object-contain" />
            <div v-else class="relative inline-block max-w-full max-h-[600px] align-middle">
              <canvas ref="baseCanvas" class="block max-w-full max-h-[600px] object-contain pointer-events-none select-none" />
              <canvas
                ref="previewCanvas"
                class="absolute inset-0 block w-full h-full touch-none select-none"
                :class="activeTab === 'privacy' || activeTab === 'resize' ? 'cursor-crosshair' : 'cursor-default'"
                @pointerdown="onPreviewPointerDown"
                @pointermove="onPreviewPointerMove"
                @pointerup="onPreviewPointerUp"
                @pointercancel="onPreviewPointerUp"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
            <div class="rounded-[16px] liquid-glass-inset p-3">
              <p class="text-zinc-500 mb-1">原图</p>
              <p v-if="currentImage" class="text-white">{{ currentImage.naturalWidth }} × {{ currentImage.naturalHeight }} · {{ formatBytes(currentImage.size) }}</p>
              <p v-else class="text-zinc-500">未载入</p>
            </div>
            <div class="rounded-[16px] liquid-glass-inset p-3">
              <p class="text-zinc-500 mb-1">处理后</p>
              <p v-if="hasCurrentProcessed && processedBlob" class="text-white">{{ processedWidth }} × {{ processedHeight }} · {{ formatBytes(processedBlob.size) }} <span class="text-ios-green">{{ sizeDeltaLabel }}</span></p>
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
import { IconClockHour4, IconDownload, IconPhoto } from '@tabler/icons-vue';
import BreadcrumbNav from '../../components/BreadcrumbNav.vue';

type StudioTab = 'compress' | 'resize' | 'privacy' | 'convert' | 'compose';
type MaskStyle = 'mosaic' | 'black' | 'white' | 'blur';
type ComposeDirection = 'vertical' | 'horizontal';

interface Point { x: number; y: number }
interface Rect { x: number; y: number; width: number; height: number }
interface Mask { rect: Rect; style: MaskStyle; rotation: number }
interface ExifPickerCalendarDay { dateKey: string; day: number; currentMonth: boolean }
interface Preset { id: string; label: string; width: number; height: number }
interface GridTile { id: string; name: string; blob: Blob; url: string }
interface MaskInteractionState {
  index: number;
  startPoint: Point;
  initialMask: Mask;
  initialMasks: Mask[];
  startPointerAngle: number;
}
interface PreviewLayerCache {
  imageId: string;
  width: number;
  height: number;
  sourceCanvas: HTMLCanvasElement;
  sourceContext: CanvasRenderingContext2D;
  effectCanvas: HTMLCanvasElement;
  effectContext: CanvasRenderingContext2D;
  watermarkTile: HTMLCanvasElement | null;
  watermarkSignature: string;
}
interface ImageEditState {
  targetKB: number;
  selectedPreset: string;
  keepAspect: boolean;
  outputWidth: number;
  outputHeight: number;
  watermarkEnabled: boolean;
  watermarkText: string;
  maskStyle: MaskStyle;
  exifPolicy: 'strip' | 'keep' | 'edit';
  exifEditDate: string;
  exifEditMake: string;
  exifEditModel: string;
  outputFormat: string;
  outputQuality: number;
  cropRect: Rect;
  masks: Mask[];
  undoStack: Mask[][];
  redoStack: Mask[][];
  viewMode: 'original' | 'editing' | 'processed';
  processedBlob: Blob | null;
  processedUrl: string;
  processedTab: StudioTab | null;
  processedWidth: number;
  processedHeight: number;
  gridTiles: GridTile[];
}
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
  edit: ImageEditState;
}

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
const viewMode = ref<'original' | 'editing' | 'processed'>('original');
const previewCanvas = ref<HTMLCanvasElement | null>(null);
const baseCanvas = ref<HTMLCanvasElement | null>(null);
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
const exifDatePickerOpen = ref(false);
const exifDatePickerRoot = ref<HTMLElement | null>(null);
const exifPickerDraft = ref('');
const exifPickerMonth = ref('');
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
const interactionMode = ref<'crop' | 'draw-mask' | 'move-mask' | 'resize-mask' | 'rotate-mask' | null>(null);
const maskInteraction = ref<MaskInteractionState | null>(null);
const selectedMaskIndex = ref<number | null>(null);
const processedBlob = ref<Blob | null>(null);
const processedUrl = ref('');
const processedTab = ref<StudioTab | null>(null);
const processedWidth = ref(0);
const processedHeight = ref(0);
const gridTiles = ref<GridTile[]>([]);
let restoringState = false;
let previewLayerCache: PreviewLayerCache | null = null;
let previewFrameHandle: number | null = null;
let pendingPointerPosition: { clientX: number; clientY: number } | null = null;
let previewPointerBounds: { left: number; top: number; width: number; height: number } | null = null;
let baseCanvasImageId: string | null = null;

const currentImage = computed(() => files.value.find((image) => image.id === selectedId.value) || null);
const selectedPresetData = computed(() => presets.find((preset) => preset.id === selectedPreset.value) || null);
const dynamicMosaicBlock = computed(() => currentImage.value ? Math.max(6, Math.round(Math.max(currentImage.value.naturalWidth, currentImage.value.naturalHeight) / 100)) : 15);
const primaryActionLabel = computed(() => activeTab.value === 'compress' ? '压缩并预览' : activeTab.value === 'compose' ? '生成长图' : '处理并预览');
const hasCurrentProcessed = computed(() => Boolean(
  currentImage.value
  && processedBlob.value
  && processedUrl.value
  && processedTab.value === activeTab.value
  && currentImage.value.edit.processedUrl === processedUrl.value,
));
const selectedMask = computed(() => selectedMaskIndex.value === null ? null : masks.value[selectedMaskIndex.value] || null);
const exifEditDateDisplay = computed(() => formatDateTimeForDisplay(exifEditDate.value));
const exifPickerYear = computed(() => {
  const match = exifPickerMonth.value.match(/^(\d{4})-(\d{2})$/);
  return match ? Number(match[1]) : new Date().getFullYear();
});
const exifPickerYearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear + 11 - 1900 }, (_, index) => 1900 + index);
});
const exifPickerMonthLabel = computed(() => {
  const match = exifPickerMonth.value.match(/^(\d{4})-(\d{2})$/);
  return match ? `${Number(match[2])}月` : '选择日期';
});
const exifPickerCalendarDays = computed<ExifPickerCalendarDay[]>(() => {
  const match = exifPickerMonth.value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return [];
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const firstDay = new Date(year, month, 1);
  const firstCell = new Date(year, month, 1 - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    return {
      dateKey: formatDateKey(date),
      day: date.getDate(),
      currentMonth: date.getMonth() === month && date.getFullYear() === year,
    };
  });
});
const exifPickerSelectedDateKey = computed(() => {
  const date = parseDateTimeLocal(exifPickerDraft.value);
  return date ? formatDateKey(date) : '';
});
const exifPickerTime = computed(() => {
  const date = parseDateTimeLocal(exifPickerDraft.value) || new Date();
  return { hours: date.getHours(), minutes: date.getMinutes(), seconds: date.getSeconds() };
});
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

function createImageEditState(width: number, height: number): ImageEditState {
  return {
    targetKB: 200,
    selectedPreset: 'free',
    keepAspect: true,
    outputWidth: width,
    outputHeight: height,
    watermarkEnabled: true,
    watermarkText: '仅限 XX 办理业务使用，他用无效',
    maskStyle: 'mosaic',
    exifPolicy: 'strip',
    exifEditDate: '',
    exifEditMake: '',
    exifEditModel: '',
    outputFormat: 'image/jpeg',
    outputQuality: 0.92,
    cropRect: { x: 0, y: 0, width, height },
    masks: [],
    undoStack: [],
    redoStack: [],
    viewMode: 'original',
    processedBlob: null,
    processedUrl: '',
    processedTab: null,
    processedWidth: 0,
    processedHeight: 0,
    gridTiles: [],
  };
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
  let height = width / aspect;
  if (height > image.naturalHeight) {
    height = image.naturalHeight;
    width = height * aspect;
  }
  width = clamp(Math.round(width), 1, image.naturalWidth);
  height = clamp(Math.round(height), 1, image.naturalHeight);
  return {
    x: Math.round((image.naturalWidth - width) / 2),
    y: Math.round((image.naturalHeight - height) / 2),
    width,
    height,
  };
}

function setStatus(message: string): void {
  toastMessage.value = message;
  window.setTimeout(() => { if (toastMessage.value === message) toastMessage.value = ''; }, 2800);
}

function clearGridTiles(): void {
  gridTiles.value.forEach((tile) => URL.revokeObjectURL(tile.url));
  gridTiles.value = [];
  if (currentImage.value) currentImage.value.edit.gridTiles = [];
}

function resetEditorRefs(): void {
  restoringState = true;
  targetKB.value = 200;
  selectedPreset.value = 'free';
  keepAspect.value = true;
  outputWidth.value = 0;
  outputHeight.value = 0;
  watermarkEnabled.value = true;
  watermarkText.value = '仅限 XX 办理业务使用，他用无效';
  maskStyle.value = 'mosaic';
  exifPolicy.value = 'strip';
  exifEditDate.value = '';
  exifDatePickerOpen.value = false;
  exifPickerDraft.value = '';
  exifPickerMonth.value = '';
  exifEditMake.value = '';
  exifEditModel.value = '';
  outputFormat.value = 'image/jpeg';
  outputQuality.value = 0.92;
  viewMode.value = 'original';
  cropRect.value = null;
  masks.value = [];
  undoStack.value = [];
  redoStack.value = [];
  selectedMaskIndex.value = null;
  maskInteraction.value = null;
  processedBlob.value = null;
  processedUrl.value = '';
  processedTab.value = null;
  processedWidth.value = 0;
  processedHeight.value = 0;
  gridTiles.value = [];
  void nextTick(() => { restoringState = false; });
}

function saveImageState(imageId: string | null): void {
  const image = files.value.find((item) => item.id === imageId);
  if (!image) return;
  image.edit = {
    ...image.edit,
    targetKB: Number(targetKB.value) || 200,
    selectedPreset: selectedPreset.value,
    keepAspect: keepAspect.value,
    outputWidth: Math.max(1, Math.round(Number(outputWidth.value) || image.naturalWidth)),
    outputHeight: Math.max(1, Math.round(Number(outputHeight.value) || image.naturalHeight)),
    watermarkEnabled: watermarkEnabled.value,
    watermarkText: watermarkText.value,
    maskStyle: maskStyle.value,
    exifPolicy: exifPolicy.value,
    exifEditDate: exifEditDate.value,
    exifEditMake: exifEditMake.value,
    exifEditModel: exifEditModel.value,
    outputFormat: outputFormat.value,
    outputQuality: outputQuality.value,
    cropRect: cropRect.value ? { ...cropRect.value } : fullImageRect(),
    masks: cloneMasks(masks.value),
    undoStack: cloneMaskHistory(undoStack.value),
    redoStack: cloneMaskHistory(redoStack.value),
    viewMode: viewMode.value,
    processedBlob: processedBlob.value,
    processedUrl: processedUrl.value,
    processedTab: processedTab.value,
    processedWidth: processedWidth.value,
    processedHeight: processedHeight.value,
    gridTiles: gridTiles.value,
  };
}

function loadImageState(image: StudioImage): void {
  if (!image.edit) image.edit = createImageEditState(image.naturalWidth, image.naturalHeight);
  restoringState = true;
  exifDatePickerOpen.value = false;
  exifPickerDraft.value = '';
  exifPickerMonth.value = '';
  const state = image.edit;
  targetKB.value = state.targetKB;
  selectedPreset.value = state.selectedPreset;
  keepAspect.value = state.keepAspect;
  outputWidth.value = state.outputWidth;
  outputHeight.value = state.outputHeight;
  watermarkEnabled.value = state.watermarkEnabled;
  watermarkText.value = state.watermarkText;
  maskStyle.value = state.maskStyle;
  exifPolicy.value = state.exifPolicy;
  exifEditDate.value = toDateTimeLocalInput(state.exifEditDate);
  exifEditMake.value = state.exifEditMake;
  exifEditModel.value = state.exifEditModel;
  outputFormat.value = state.outputFormat;
  outputQuality.value = state.outputQuality;
  processedBlob.value = state.processedBlob;
  processedUrl.value = state.processedUrl;
  processedTab.value = state.processedTab || null;
  viewMode.value = state.processedUrl && state.processedTab ? state.viewMode : 'original';
  cropRect.value = state.cropRect ? { ...state.cropRect } : fullImageRect();
  masks.value = cloneMasks(state.masks);
  undoStack.value = cloneMaskHistory(state.undoStack);
  redoStack.value = cloneMaskHistory(state.redoStack);
  processedWidth.value = state.processedWidth;
  processedHeight.value = state.processedHeight;
  gridTiles.value = state.gridTiles;
  void nextTick(() => { restoringState = false; });
}

function disposeImageState(image: StudioImage): void {
  if (image.edit?.processedUrl) URL.revokeObjectURL(image.edit.processedUrl);
  image.edit?.gridTiles.forEach((tile) => URL.revokeObjectURL(tile.url));
}

function initializeImageState(): void {
  invalidatePreviewLayerCache();
  previewPointerBounds = null;
  pendingPointerPosition = null;
  const image = currentImage.value;
  temporaryMaskRect.value = null;
  temporaryCropRect.value = null;
  dragStart.value = null;
  interactionMode.value = null;
  selectedMaskIndex.value = null;
  maskInteraction.value = null;
  if (image) loadImageState(image);
  else resetEditorRefs();
  nextTick(schedulePreviewDraw);
}

function selectImage(imageId: string): void {
  if (selectedId.value !== imageId) saveImageState(selectedId.value);
  selectedId.value = imageId;
}

function removeImage(imageId: string): void {
  const imageIndex = files.value.findIndex((image) => image.id === imageId);
  const image = files.value[imageIndex];
  if (!image) return;
  saveImageState(selectedId.value);
  disposeImageState(image);
  URL.revokeObjectURL(image.sourceUrl);
  files.value.splice(imageIndex, 1);
  if (selectedId.value === imageId) selectedId.value = files.value[Math.max(0, imageIndex - 1)]?.id || null;
  if (!files.value.length) initializeImageState();
}

function clearAll(): void {
  saveImageState(selectedId.value);
  files.value.forEach((image) => URL.revokeObjectURL(image.sourceUrl));
  files.value.forEach(disposeImageState);
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
    edit: createImageEditState(element.naturalWidth, element.naturalHeight),
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
  if (addedImages.length > 0) {
    saveImageState(selectedId.value);
    selectedId.value = addedImages[0].id;
  }
  if (currentImage.value) nextTick(schedulePreviewDraw);
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
  if (tab !== 'convert') exifDatePickerOpen.value = false;
  viewMode.value = 'editing';
  if (tab === 'resize' && currentImage.value && !cropRect.value) cropRect.value = fullImageRect();
  nextTick(schedulePreviewDraw);
}

function applyPreset(): void {
  const image = currentImage.value;
  const preset = selectedPresetData.value;
  if (!image || !preset) {
    cropRect.value = fullImageRect();
    outputWidth.value = image?.naturalWidth || 0;
    outputHeight.value = image?.naturalHeight || 0;
    nextTick(schedulePreviewDraw);
    return;
  }
  outputWidth.value = preset.width;
  outputHeight.value = preset.height;
  cropRect.value = centerCropForAspect(preset.width / preset.height);
  nextTick(schedulePreviewDraw);
}

function resizeAspect(): number {
  const preset = selectedPresetData.value;
  if (preset) return preset.width / preset.height;
  const crop = cropRect.value;
  if (crop && crop.width > 0 && crop.height > 0) return crop.width / crop.height;
  const image = currentImage.value;
  return image ? image.naturalWidth / image.naturalHeight : 1;
}

function getResizeOutputSize(image: StudioImage, crop: Rect): { width: number; height: number } {
  const preset = selectedPresetData.value;
  if (preset) return { width: preset.width, height: preset.height };
  const width = Math.max(1, Math.round(Number(outputWidth.value) || crop.width || image.naturalWidth));
  if (!keepAspect.value) {
    return {
      width,
      height: Math.max(1, Math.round(Number(outputHeight.value) || crop.height || image.naturalHeight)),
    };
  }
  return {
    width,
    height: Math.max(1, Math.round(width / Math.max(crop.width / Math.max(crop.height, 1), 0.0001))),
  };
}

function syncResizeDimensionsToCrop(): void {
  const image = currentImage.value;
  const crop = cropRect.value;
  if (!image || !crop) return;
  const size = getResizeOutputSize(image, normalizeRect(crop));
  outputWidth.value = size.width;
  outputHeight.value = size.height;
}

function onWidthInput(): void {
  const width = Math.max(1, Math.round(Number(outputWidth.value) || 1));
  outputWidth.value = width;
  if (keepAspect.value) {
    outputHeight.value = Math.max(1, Math.round(width / resizeAspect()));
  }
}

function onHeightInput(): void {
  const height = Math.max(1, Math.round(Number(outputHeight.value) || 1));
  outputHeight.value = height;
  if (keepAspect.value) {
    outputWidth.value = Math.max(1, Math.round(height * resizeAspect()));
  }
}

function resetCrop(): void {
  selectedPreset.value = 'free';
  cropRect.value = fullImageRect();
  if (currentImage.value) {
    outputWidth.value = currentImage.value.naturalWidth;
    outputHeight.value = currentImage.value.naturalHeight;
  }
  nextTick(schedulePreviewDraw);
}

function getCanvasPointFromClient(clientX: number, clientY: number): Point | null {
  const canvas = previewCanvas.value;
  const image = currentImage.value;
  if (!canvas || !image) return null;
  const bounds = previewPointerBounds || canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;
  return {
    x: clamp((clientX - bounds.left) * canvas.width / bounds.width, 0, image.naturalWidth),
    y: clamp((clientY - bounds.top) * canvas.height / bounds.height, 0, image.naturalHeight),
  };
}

function getCanvasPoint(event: PointerEvent): Point | null {
  return getCanvasPointFromClient(event.clientX, event.clientY);
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

function normalizeRotation(value: number): number {
  let rotation = value % 360;
  if (rotation > 180) rotation -= 360;
  if (rotation <= -180) rotation += 360;
  return rotation;
}

function rotatePoint(point: Point, center: Point, degrees: number): Point {
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const offsetX = point.x - center.x;
  const offsetY = point.y - center.y;
  return {
    x: center.x + offsetX * cosine - offsetY * sine,
    y: center.y + offsetX * sine + offsetY * cosine,
  };
}

function cloneMask(mask: Mask): Mask {
  return {
    rect: { ...mask.rect },
    style: mask.style,
    rotation: normalizeRotation(mask.rotation || 0),
  };
}

function maskCenter(mask: Mask): Point {
  return {
    x: mask.rect.x + mask.rect.width / 2,
    y: mask.rect.y + mask.rect.height / 2,
  };
}

function maskCorners(mask: Mask): Point[] {
  const center = maskCenter(mask);
  return [
    rotatePoint({ x: mask.rect.x, y: mask.rect.y }, center, mask.rotation),
    rotatePoint({ x: mask.rect.x + mask.rect.width, y: mask.rect.y }, center, mask.rotation),
    rotatePoint({ x: mask.rect.x + mask.rect.width, y: mask.rect.y + mask.rect.height }, center, mask.rotation),
    rotatePoint({ x: mask.rect.x, y: mask.rect.y + mask.rect.height }, center, mask.rotation),
  ];
}

function maskRotationHandle(mask: Mask): Point {
  const center = maskCenter(mask);
  const distance = Math.max(28, Math.min(mask.rect.width, mask.rect.height) * 0.2);
  return rotatePoint({ x: center.x, y: mask.rect.y - distance }, center, mask.rotation);
}

function maskHandleRadius(mask: Mask): number {
  const image = currentImage.value;
  const imageScale = image ? Math.max(image.naturalWidth, image.naturalHeight) / 80 : 16;
  return Math.max(16, Math.min(42, imageScale));
}

function distanceBetween(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function isPointInMask(point: Point, mask: Mask, padding = 0): boolean {
  const center = maskCenter(mask);
  const alignedPoint = rotatePoint(point, center, -mask.rotation);
  return Math.abs(alignedPoint.x - center.x) <= mask.rect.width / 2 + padding
    && Math.abs(alignedPoint.y - center.y) <= mask.rect.height / 2 + padding;
}

function getMaskHandle(point: Point, mask: Mask): 'delete' | 'rotate' | 'resize' | null {
  const radius = maskHandleRadius(mask);
  if (distanceBetween(point, maskDeleteHandle(mask)) <= maskDeleteRadius(mask)) return 'delete';
  if (distanceBetween(point, maskRotationHandle(mask)) <= radius) return 'rotate';
  if (maskCorners(mask).some((corner) => distanceBetween(point, corner) <= radius)) return 'resize';
  return null;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function formatDateTimeLocal(date: Date): string {
  return `${formatDateKey(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;
}

function parseDateTimeLocal(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] || 0),
    0,
  );
  if (
    date.getFullYear() !== Number(match[1])
    || date.getMonth() !== Number(match[2]) - 1
    || date.getDate() !== Number(match[3])
    || date.getHours() !== Number(match[4])
    || date.getMinutes() !== Number(match[5])
    || date.getSeconds() !== Number(match[6] || 0)
  ) return null;
  return date;
}

function masksAreEqual(first: Mask[], second: Mask[]): boolean {
  if (first.length !== second.length) return false;
  return first.every((mask, index) => {
    const other = second[index];
    return mask.style === other.style
      && normalizeRotation(mask.rotation) === normalizeRotation(other.rotation)
      && mask.rect.x === other.rect.x
      && mask.rect.y === other.rect.y
      && mask.rect.width === other.rect.width
      && mask.rect.height === other.rect.height;
  });
}

function deleteMaskAt(index: number): void {
  if (!masks.value[index]) return;
  undoStack.value.push(cloneMasks(masks.value));
  masks.value.splice(index, 1);
  redoStack.value = [];
  if (selectedMaskIndex.value === index) {
    selectedMaskIndex.value = masks.value.length ? Math.min(index, masks.value.length - 1) : null;
  } else if (selectedMaskIndex.value !== null && selectedMaskIndex.value > index) {
    selectedMaskIndex.value -= 1;
  }
  schedulePreviewDraw();
}

function onPreviewPointerDown(event: PointerEvent): void {
  if (!currentImage.value || (activeTab.value !== 'resize' && activeTab.value !== 'privacy') || viewMode.value === 'processed') return;
  const point = getCanvasPoint(event);
  if (!point) return;
  if (viewMode.value === 'original') {
    viewMode.value = 'editing';
    schedulePreviewDraw();
  }
  if (activeTab.value === 'resize') {
    dragStart.value = point;
    interactionMode.value = 'crop';
    temporaryCropRect.value = { x: point.x, y: point.y, width: 1, height: 1 };
  } else {
    const selected = selectedMaskIndex.value === null ? null : masks.value[selectedMaskIndex.value];
    const selectedHandle = selected ? getMaskHandle(point, selected) : null;
    if (selected && selectedHandle) {
      if (selectedHandle === 'delete') {
        deleteMaskAt(selectedMaskIndex.value as number);
        return;
      }
      dragStart.value = point;
      interactionMode.value = selectedHandle === 'rotate' ? 'rotate-mask' : 'resize-mask';
      maskInteraction.value = {
        index: selectedMaskIndex.value as number,
        startPoint: point,
        initialMask: cloneMask(selected),
        initialMasks: cloneMasks(masks.value),
        startPointerAngle: Math.atan2(point.y - maskCenter(selected).y, point.x - maskCenter(selected).x) * 180 / Math.PI,
      };
    } else {
      const hitIndex = [...masks.value.keys()].reverse().find((index) => isPointInMask(point, masks.value[index], maskHandleRadius(masks.value[index]) / 2));
      if (hitIndex !== undefined) {
        selectedMaskIndex.value = hitIndex;
        dragStart.value = point;
        interactionMode.value = 'move-mask';
        maskInteraction.value = {
          index: hitIndex,
          startPoint: point,
          initialMask: cloneMask(masks.value[hitIndex]),
          initialMasks: cloneMasks(masks.value),
          startPointerAngle: 0,
        };
         schedulePreviewDraw();
      } else {
        selectedMaskIndex.value = null;
        dragStart.value = point;
        interactionMode.value = 'draw-mask';
        temporaryMaskRect.value = { x: point.x, y: point.y, width: 1, height: 1 };
      }
    }
  }
  const canvas = event.currentTarget as HTMLCanvasElement;
  const bounds = canvas.getBoundingClientRect();
  previewPointerBounds = { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height };
  canvas.setPointerCapture(event.pointerId);
}

function applyPreviewPointerMove(clientX: number, clientY: number): void {
  if (!dragStart.value || !interactionMode.value) return;
  const point = getCanvasPointFromClient(clientX, clientY);
  if (!point) return;
  if (interactionMode.value === 'crop' || interactionMode.value === 'draw-mask') {
    const aspect = interactionMode.value === 'crop' && selectedPresetData.value ? selectedPresetData.value.width / selectedPresetData.value.height : undefined;
    const nextRect = rectFromPoints(dragStart.value, point, aspect);
    if (interactionMode.value === 'crop') temporaryCropRect.value = nextRect;
    else temporaryMaskRect.value = nextRect;
  } else {
    const interaction = maskInteraction.value;
    const image = currentImage.value;
    if (!interaction || !image) return;
    const nextMask = cloneMask(interaction.initialMask);
    const center = maskCenter(interaction.initialMask);
    if (interactionMode.value === 'move-mask') {
      const deltaX = point.x - interaction.startPoint.x;
      const deltaY = point.y - interaction.startPoint.y;
      nextMask.rect.x = clamp(interaction.initialMask.rect.x + deltaX, 0, image.naturalWidth - nextMask.rect.width);
      nextMask.rect.y = clamp(interaction.initialMask.rect.y + deltaY, 0, image.naturalHeight - nextMask.rect.height);
    } else if (interactionMode.value === 'resize-mask') {
      const alignedPoint = rotatePoint(point, center, -interaction.initialMask.rotation);
      const width = clamp(Math.abs(alignedPoint.x - center.x) * 2, 8, image.naturalWidth);
      const height = clamp(Math.abs(alignedPoint.y - center.y) * 2, 8, image.naturalHeight);
      nextMask.rect.width = width;
      nextMask.rect.height = height;
      nextMask.rect.x = clamp(center.x - width / 2, 0, image.naturalWidth - width);
      nextMask.rect.y = clamp(center.y - height / 2, 0, image.naturalHeight - height);
    } else if (interactionMode.value === 'rotate-mask') {
      const pointerAngle = Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;
      nextMask.rotation = normalizeRotation(interaction.initialMask.rotation + pointerAngle - interaction.startPointerAngle);
    }
    masks.value[interaction.index] = nextMask;
  }
}

function onPreviewPointerMove(event: PointerEvent): void {
  if (!dragStart.value || !interactionMode.value) return;
  pendingPointerPosition = { clientX: event.clientX, clientY: event.clientY };
  schedulePreviewDraw();
}

function onPreviewPointerUp(event?: PointerEvent): void {
  if (pendingPointerPosition) {
    applyPreviewPointerMove(pendingPointerPosition.clientX, pendingPointerPosition.clientY);
    pendingPointerPosition = null;
  }
  if (interactionMode.value === 'crop' && temporaryCropRect.value && temporaryCropRect.value.width > 2 && temporaryCropRect.value.height > 2) cropRect.value = temporaryCropRect.value;
  if (interactionMode.value === 'crop' && cropRect.value) syncResizeDimensionsToCrop();
  if (interactionMode.value === 'draw-mask' && temporaryMaskRect.value && temporaryMaskRect.value.width > 2 && temporaryMaskRect.value.height > 2) {
    undoStack.value.push(cloneMasks(masks.value));
    masks.value.push({ rect: temporaryMaskRect.value, style: maskStyle.value, rotation: 0 });
    redoStack.value = [];
    selectedMaskIndex.value = masks.value.length - 1;
  }
  if (
    (interactionMode.value === 'move-mask' || interactionMode.value === 'resize-mask' || interactionMode.value === 'rotate-mask')
    && maskInteraction.value
    && !masksAreEqual(maskInteraction.value.initialMasks, masks.value)
  ) {
    undoStack.value.push(maskInteraction.value.initialMasks);
    redoStack.value = [];
  }
  temporaryCropRect.value = null;
  temporaryMaskRect.value = null;
  dragStart.value = null;
  interactionMode.value = null;
  maskInteraction.value = null;
  if (event?.currentTarget instanceof HTMLCanvasElement && event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  previewPointerBounds = null;
  schedulePreviewDraw();
}

function drawMaskPath(context: CanvasRenderingContext2D, mask: Mask): void {
  const corners = maskCorners(mask);
  context.beginPath();
  context.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((corner) => context.lineTo(corner.x, corner.y));
  context.closePath();
}

function drawMaskEffect(context: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement, mask: Mask): void {
  context.save();
  drawMaskPath(context, mask);
  context.clip();
  if (mask.style === 'black') {
    drawSolidMask(context, mask, '#000');
  } else if (mask.style === 'white') {
    drawSolidMask(context, mask, '#fff');
  } else if (mask.style === 'blur') {
    drawBlur(context, sourceCanvas, mask);
  } else {
    drawMosaic(context, sourceCanvas, mask);
  }
  context.restore();
}

function drawSolidMask(context: CanvasRenderingContext2D, mask: Mask, color: string): void {
  context.fillStyle = color;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
}

function maskDeleteHandle(mask: Mask): Point {
  const center = maskCenter(mask);
  const topRight = rotatePoint({ x: mask.rect.x + mask.rect.width, y: mask.rect.y }, center, mask.rotation);
  const directionX = topRight.x - center.x;
  const directionY = topRight.y - center.y;
  const distance = Math.max(1, Math.hypot(directionX, directionY));
  const offset = Math.max(24, maskHandleRadius(mask) * 0.9);
  return {
    x: topRight.x + directionX / distance * offset,
    y: topRight.y + directionY / distance * offset,
  };
}

function maskDeleteRadius(mask: Mask): number {
  return Math.max(18, Math.min(30, maskHandleRadius(mask) * 0.9));
}

function drawMaskControls(context: CanvasRenderingContext2D, mask: Mask, temporary = false, selected = false): void {
  context.save();
  drawMaskPath(context, mask);
  context.strokeStyle = temporary ? '#007AFF' : 'rgba(255,255,255,0.8)';
  context.lineWidth = Math.max(2, Math.round(Math.max(mask.rect.width, mask.rect.height) / 300));
  context.setLineDash(temporary ? [8, 8] : []);
  context.stroke();
  if (selected && !temporary) {
    const corners = maskCorners(mask);
    const rotationHandle = maskRotationHandle(mask);
    context.setLineDash([]);
    context.strokeStyle = '#007AFF';
    context.fillStyle = 'rgba(0,122,255,0.9)';
    context.lineWidth = Math.max(2, Math.round(Math.max(mask.rect.width, mask.rect.height) / 400));
    context.beginPath();
    context.moveTo((corners[0].x + corners[1].x) / 2, (corners[0].y + corners[1].y) / 2);
    context.lineTo(rotationHandle.x, rotationHandle.y);
    context.stroke();
    corners.forEach((corner) => {
      context.fillRect(corner.x - 7, corner.y - 7, 14, 14);
    });
    context.beginPath();
    context.arc(rotationHandle.x, rotationHandle.y, 10, 0, Math.PI * 2);
    context.fill();
    const deleteHandle = maskDeleteHandle(mask);
    const deleteRadius = maskDeleteRadius(mask);
    context.fillStyle = '#ff3b30';
    context.beginPath();
    context.arc(deleteHandle.x, deleteHandle.y, deleteRadius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.9)';
    context.lineWidth = Math.max(2, deleteRadius / 8);
    context.stroke();
    context.strokeStyle = '#fff';
    context.lineWidth = Math.max(3, deleteRadius / 5);
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(deleteHandle.x - deleteRadius * 0.32, deleteHandle.y - deleteRadius * 0.32);
    context.lineTo(deleteHandle.x + deleteRadius * 0.32, deleteHandle.y + deleteRadius * 0.32);
    context.moveTo(deleteHandle.x + deleteRadius * 0.32, deleteHandle.y - deleteRadius * 0.32);
    context.lineTo(deleteHandle.x - deleteRadius * 0.32, deleteHandle.y + deleteRadius * 0.32);
    context.stroke();
  }
  context.restore();
}

function drawWatermark(context: CanvasRenderingContext2D, width: number, height: number): void {
  if (!watermarkEnabled.value || !watermarkText.value.trim()) return;
  const image = currentImage.value;
  const cacheMatchesCanvas = previewLayerCache
    && image
    && previewLayerCache.imageId === image.id
    && previewLayerCache.width === width
    && previewLayerCache.height === height;
  const fontSize = Math.max(18, Math.round(Math.max(width, height) / 50));
  const tileWidth = Math.max(360, Math.round(fontSize * 13));
  const tileHeight = Math.max(220, Math.round(fontSize * 8));
  const signature = `${width}x${height}:${fontSize}:${tileWidth}:${tileHeight}:${watermarkText.value}`;
  let tile = cacheMatchesCanvas && previewLayerCache?.watermarkSignature === signature
    ? previewLayerCache.watermarkTile
    : null;
  if (!tile) {
    tile = document.createElement('canvas');
    tile.width = tileWidth;
    tile.height = tileHeight;
    const tileContext = tile.getContext('2d');
    if (!tileContext) return;
    tileContext.fillStyle = 'rgba(128,128,128,0.3)';
    tileContext.font = `600 ${fontSize}px sans-serif`;
    tileContext.textAlign = 'center';
    tileContext.textBaseline = 'middle';
    tileContext.translate(tileWidth / 2, tileHeight / 2);
    tileContext.rotate(-Math.PI / 4);
    tileContext.fillText(watermarkText.value, 0, 0);
    if (cacheMatchesCanvas && previewLayerCache) {
      previewLayerCache.watermarkTile = tile;
      previewLayerCache.watermarkSignature = signature;
    }
  }
  const pattern = context.createPattern(tile, 'repeat');
  if (!pattern) return;
  context.save();
  context.fillStyle = pattern;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function invalidatePreviewLayerCache(): void {
  previewLayerCache = null;
  baseCanvasImageId = null;
}

function getPreviewLayerCache(image: StudioImage): PreviewLayerCache | null {
  if (
    previewLayerCache
    && previewLayerCache.imageId === image.id
    && previewLayerCache.width === image.naturalWidth
    && previewLayerCache.height === image.naturalHeight
  ) return previewLayerCache;

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;
  const sourceContext = sourceCanvas.getContext('2d');
  const effectCanvas = document.createElement('canvas');
  effectCanvas.width = image.naturalWidth;
  effectCanvas.height = image.naturalHeight;
  const effectContext = effectCanvas.getContext('2d');
  if (!sourceContext || !effectContext) return null;
  sourceContext.imageSmoothingEnabled = true;
  sourceContext.imageSmoothingQuality = 'high';
  sourceContext.drawImage(image.element, 0, 0, image.naturalWidth, image.naturalHeight);
  previewLayerCache = {
    imageId: image.id,
    width: image.naturalWidth,
    height: image.naturalHeight,
    sourceCanvas,
    sourceContext,
    effectCanvas,
    effectContext,
    watermarkTile: null,
    watermarkSignature: '',
  };
  return previewLayerCache;
}

function schedulePreviewDraw(): void {
  if (previewFrameHandle !== null) return;
  previewFrameHandle = window.requestAnimationFrame(() => {
    previewFrameHandle = null;
    if (pendingPointerPosition) {
      const position = pendingPointerPosition;
      pendingPointerPosition = null;
      applyPreviewPointerMove(position.clientX, position.clientY);
    }
    drawPreview();
  });
}

function drawPreview(): void {
  const canvas = previewCanvas.value;
  const base = baseCanvas.value;
  const image = currentImage.value;
  if (!canvas || !base || !image) return;
  const layerCache = getPreviewLayerCache(image);
  if (!layerCache) return;
  if (
    baseCanvasImageId !== image.id
    || base.width !== image.naturalWidth
    || base.height !== image.naturalHeight
  ) {
    base.width = image.naturalWidth;
    base.height = image.naturalHeight;
    const baseContext = base.getContext('2d');
    if (!baseContext) return;
    baseContext.imageSmoothingEnabled = true;
    baseContext.imageSmoothingQuality = 'high';
    baseContext.clearRect(0, 0, base.width, base.height);
    baseContext.drawImage(layerCache.sourceCanvas, 0, 0);
    baseCanvasImageId = image.id;
  }
  if (canvas.width !== image.naturalWidth) canvas.width = image.naturalWidth;
  if (canvas.height !== image.naturalHeight) canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (viewMode.value !== 'editing') return;
  if (activeTab.value === 'privacy') {
    const effectContext = layerCache.effectContext;
    effectContext.clearRect(0, 0, layerCache.effectCanvas.width, layerCache.effectCanvas.height);
    masks.value.forEach((mask) => drawMaskEffect(effectContext, layerCache.sourceCanvas, mask));
    if (temporaryMaskRect.value) {
      drawMaskEffect(effectContext, layerCache.sourceCanvas, { rect: temporaryMaskRect.value, style: maskStyle.value, rotation: 0 });
    }
    context.drawImage(layerCache.effectCanvas, 0, 0);
    masks.value.forEach((mask, index) => drawMaskControls(context, mask, false, index === selectedMaskIndex.value));
    if (temporaryMaskRect.value) drawMaskControls(context, { rect: temporaryMaskRect.value, style: maskStyle.value, rotation: 0 }, true);
    drawWatermark(context, canvas.width, canvas.height);
  }
  if (activeTab.value === 'resize') {
    const selection = temporaryCropRect.value || cropRect.value;
    if (selection) {
       context.save();
       context.fillStyle = 'rgba(0,0,0,0.48)';
       context.fillRect(0, 0, canvas.width, canvas.height);
       context.beginPath();
       context.rect(selection.x, selection.y, selection.width, selection.height);
       context.clip();
       context.drawImage(layerCache.sourceCanvas, 0, 0);
       context.restore();
      context.save();
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

function getRotatedMaskBounds(mask: Mask, canvasWidth: number, canvasHeight: number, padding = 0): { left: number; top: number; right: number; bottom: number } | null {
  const corners = maskCorners(mask);
  const left = Math.max(0, Math.floor(Math.min(...corners.map((corner) => corner.x)) - padding));
  const top = Math.max(0, Math.floor(Math.min(...corners.map((corner) => corner.y)) - padding));
  const right = Math.min(canvasWidth, Math.ceil(Math.max(...corners.map((corner) => corner.x)) + padding));
  const bottom = Math.min(canvasHeight, Math.ceil(Math.max(...corners.map((corner) => corner.y)) + padding));
  if (right <= left || bottom <= top) return null;
  return { left, top, right, bottom };
}

function drawMosaic(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  mask: Mask,
): void {
  const bounds = getRotatedMaskBounds(mask, canvas.width, canvas.height);
  if (!bounds) return;
  const patchWidth = Math.max(1, bounds.right - bounds.left);
  const patchHeight = Math.max(1, bounds.bottom - bounds.top);
  const mosaicCanvas = document.createElement('canvas');
  mosaicCanvas.width = patchWidth;
  mosaicCanvas.height = patchHeight;
  const mosaicContext = mosaicCanvas.getContext('2d');
  if (!mosaicContext) return;
  const blockSize = Math.max(4, dynamicMosaicBlock.value);
  const reducedCanvas = document.createElement('canvas');
  reducedCanvas.width = Math.max(1, Math.ceil(patchWidth / blockSize));
  reducedCanvas.height = Math.max(1, Math.ceil(patchHeight / blockSize));
  const reducedContext = reducedCanvas.getContext('2d');
  if (!reducedContext) return;
  reducedContext.imageSmoothingEnabled = true;
  reducedContext.imageSmoothingQuality = 'low';
  reducedContext.drawImage(
    canvas,
    bounds.left,
    bounds.top,
    patchWidth,
    patchHeight,
    0,
    0,
    reducedCanvas.width,
    reducedCanvas.height,
  );
  mosaicContext.imageSmoothingEnabled = false;
  mosaicContext.drawImage(
    reducedCanvas,
    0,
    0,
    reducedCanvas.width,
    reducedCanvas.height,
    0,
    0,
    patchWidth,
    patchHeight,
  );
  context.save();
  context.drawImage(mosaicCanvas, bounds.left, bounds.top);
  context.restore();
}

function drawBlur(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  mask: Mask,
): void {
  const radius = Math.max(2, Math.round(Math.min(mask.rect.width, mask.rect.height) / 30));
  const padding = Math.max(4, radius * 3);
  const bounds = getRotatedMaskBounds(mask, canvas.width, canvas.height, padding);
  if (!bounds) return;
  const patchWidth = Math.max(1, bounds.right - bounds.left);
  const patchHeight = Math.max(1, bounds.bottom - bounds.top);
  const blurredCanvas = document.createElement('canvas');
  blurredCanvas.width = patchWidth;
  blurredCanvas.height = patchHeight;
  const blurredContext = blurredCanvas.getContext('2d');
  if (!blurredContext) return;
  blurredContext.imageSmoothingEnabled = true;
  blurredContext.imageSmoothingQuality = 'high';
  blurredContext.filter = `blur(${radius}px)`;
  blurredContext.drawImage(canvas, bounds.left, bounds.top, patchWidth, patchHeight, 0, 0, patchWidth, patchHeight);
  context.drawImage(blurredCanvas, bounds.left, bounds.top);
}

function applyMasksAndWatermark(canvas: HTMLCanvasElement, sourceCrop: Rect): void {
  const context = canvas.getContext('2d');
  const image = currentImage.value;
  if (!context || !image || activeTab.value !== 'privacy') return;
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = canvas.width;
  sourceCanvas.height = canvas.height;
  const sourceContext = sourceCanvas.getContext('2d');
  if (!sourceContext) return;
  sourceContext.drawImage(canvas, 0, 0);
  masks.value.forEach((mask) => {
    const outputMask: Mask = {
      rect: {
        x: (mask.rect.x - sourceCrop.x) * canvas.width / sourceCrop.width,
        y: (mask.rect.y - sourceCrop.y) * canvas.height / sourceCrop.height,
        width: mask.rect.width * canvas.width / sourceCrop.width,
        height: mask.rect.height * canvas.height / sourceCrop.height,
      },
      style: mask.style,
      rotation: mask.rotation,
    };
    const outputRight = outputMask.rect.x + outputMask.rect.width;
    const outputBottom = outputMask.rect.y + outputMask.rect.height;
    if (outputRight <= 0 || outputBottom <= 0 || outputMask.rect.x >= canvas.width || outputMask.rect.y >= canvas.height) return;
    drawMaskEffect(context, sourceCanvas, outputMask);
  });
  drawWatermark(context, canvas.width, canvas.height);
}

function renderCurrentCanvas(): HTMLCanvasElement {
  const image = currentImage.value;
  if (!image) throw new Error('请先导入图片');
  const sourceCrop = activeTab.value === 'resize' && cropRect.value ? normalizeRect(cropRect.value) : fullImageRect();
  const resizeSize = activeTab.value === 'resize' ? getResizeOutputSize(image, sourceCrop) : null;
  const width = resizeSize?.width || image.naturalWidth;
  const height = resizeSize?.height || image.naturalHeight;
  if (resizeSize) {
    outputWidth.value = resizeSize.width;
    outputHeight.value = resizeSize.height;
  }
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
  processedTab.value = activeTab.value;
  viewMode.value = 'processed';
  saveImageState(selectedId.value);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function toExifDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const localDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (localDate) {
    return `${localDate[1]}:${localDate[2]}:${localDate[3]} ${localDate[4]}:${localDate[5]}:${localDate[6] || '00'}`;
  }
  const exifDate = trimmed.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (exifDate) {
    return `${exifDate[1]}:${exifDate[2]}:${exifDate[3]} ${exifDate[4]}:${exifDate[5]}:${exifDate[6] || '00'}`;
  }
  return '';
}

function toDateTimeLocalInput(value: string): string {
  const exifDate = toExifDate(value);
  if (!exifDate) return '';
  return exifDate.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T');
}

function formatDateTimeForDisplay(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return '';
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6] || '00'}`;
}

function openExifDatePicker(): void {
  const current = parseDateTimeLocal(exifEditDate.value) || new Date();
  current.setMilliseconds(0);
  exifPickerDraft.value = formatDateTimeLocal(current);
  exifPickerMonth.value = `${current.getFullYear()}-${padDatePart(current.getMonth() + 1)}`;
  exifDatePickerOpen.value = true;
}

function changeExifPickerMonth(delta: number): void {
  const match = exifPickerMonth.value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return;
  const date = new Date(Number(match[1]), Number(match[2]) - 1 + delta, 1);
  exifPickerMonth.value = `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}`;
}

function changeExifPickerYear(event: Event): void {
  const year = Number((event.target as HTMLSelectElement).value);
  const match = exifPickerMonth.value.match(/^(\d{4})-(\d{2})$/);
  if (!Number.isInteger(year) || year < 1900 || !match) return;

  const month = Number(match[2]);
  const current = parseDateTimeLocal(exifPickerDraft.value);
  const day = current?.getDate() || 1;
  const hours = current?.getHours() || 0;
  const minutes = current?.getMinutes() || 0;
  const seconds = current?.getSeconds() || 0;
  const lastDay = new Date(year, month, 0).getDate();
  const selected = new Date(year, month - 1, Math.min(day, lastDay), hours, minutes, seconds, 0);

  exifPickerDraft.value = formatDateTimeLocal(selected);
  exifPickerMonth.value = `${year}-${padDatePart(month)}`;
}

function selectExifPickerDate(dateKey: string): void {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return;
  const current = parseDateTimeLocal(exifPickerDraft.value) || new Date();
  const selected = new Date(parts[0], parts[1] - 1, parts[2], current.getHours(), current.getMinutes(), current.getSeconds(), 0);
  exifPickerDraft.value = formatDateTimeLocal(selected);
  exifPickerMonth.value = `${selected.getFullYear()}-${padDatePart(selected.getMonth() + 1)}`;
}

function updateExifPickerTime(unit: 'hours' | 'minutes' | 'seconds', event: Event): void {
  const value = Number((event.target as HTMLSelectElement).value);
  if (!Number.isInteger(value)) return;
  const date = parseDateTimeLocal(exifPickerDraft.value) || new Date();
  if (unit === 'hours') date.setHours(value);
  if (unit === 'minutes') date.setMinutes(value);
  if (unit === 'seconds') date.setSeconds(value);
  date.setMilliseconds(0);
  exifPickerDraft.value = formatDateTimeLocal(date);
}

function clearExifPicker(): void {
  exifEditDate.value = '';
  exifPickerDraft.value = '';
  exifDatePickerOpen.value = false;
}

function confirmExifPicker(): void {
  if (parseDateTimeLocal(exifPickerDraft.value)) exifEditDate.value = exifPickerDraft.value;
  exifDatePickerOpen.value = false;
}

function closeExifDatePickerOnOutside(event: PointerEvent): void {
  if (!exifDatePickerOpen.value || !exifDatePickerRoot.value) return;
  if (!exifDatePickerRoot.value.contains(event.target as Node)) exifDatePickerOpen.value = false;
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
      const formattedDate = toExifDate(exifEditDate.value);
      if (formattedDate) {
        exifObj['0th'][piexif.ImageIFD.DateTime] = formattedDate;
        exifObj.Exif[piexif.ExifIFD.DateTimeOriginal] = formattedDate;
        exifObj.Exif[piexif.ExifIFD.DateTimeDigitized] = formattedDate;
      }
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
    blob = await compressToTarget(canvas, Math.max(10, Number(targetKB.value) || 200) * 1024);
  } else if (activeTab.value === 'convert' && mime === 'image/jpeg' && exifPolicy.value !== 'strip') {
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
  if (!currentImage.value || isProcessing.value) return;
  isProcessing.value = true;
  errorMessage.value = '';
  try {
    await createNineGrid();
    await nextTick();
    if (nineGridSection.value) nineGridSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '九宫格生成失败';
  } finally {
    isProcessing.value = false;
  }
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
  saveImageState(image.id);
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
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function downloadProcessed(): void {
  if (!hasCurrentProcessed.value || !processedBlob.value) return;
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
  return source.map((mask) => cloneMask(mask));
}
function cloneMaskHistory(source: Mask[][]): Mask[][] {
  return source.map((history) => cloneMasks(history));
}

function updateSelectedMask(nextMask: Mask): void {
  if (selectedMaskIndex.value === null || !masks.value[selectedMaskIndex.value]) return;
  if (masksAreEqual([masks.value[selectedMaskIndex.value]], [nextMask])) return;
  undoStack.value.push(cloneMasks(masks.value));
  masks.value[selectedMaskIndex.value] = cloneMask(nextMask);
  redoStack.value = [];
  nextTick(schedulePreviewDraw);
}

function normalizeSelectedMaskIndex(): void {
  if (selectedMaskIndex.value === null || masks.value.length === 0) {
    selectedMaskIndex.value = masks.value.length === 0 ? null : selectedMaskIndex.value;
    return;
  }
  selectedMaskIndex.value = Math.max(0, Math.min(selectedMaskIndex.value, masks.value.length - 1));
}

function onMaskRotationInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);
  if (!selectedMask.value || !Number.isFinite(value)) return;
  updateSelectedMask({ ...cloneMask(selectedMask.value), rotation: normalizeRotation(value) });
}

function rotateSelectedMask(delta: number): void {
  if (!selectedMask.value) return;
  updateSelectedMask({ ...cloneMask(selectedMask.value), rotation: normalizeRotation(selectedMask.value.rotation + delta) });
}

function undoMask(): void {
  const prev = undoStack.value.pop();
  if (prev) {
    redoStack.value.push(cloneMasks(masks.value));
    masks.value = cloneMasks(prev);
    normalizeSelectedMaskIndex();
    nextTick(schedulePreviewDraw);
  }
}
function redoMask(): void {
  const next = redoStack.value.pop();
  if (next) {
    undoStack.value.push(cloneMasks(masks.value));
    masks.value = cloneMasks(next);
    normalizeSelectedMaskIndex();
    nextTick(schedulePreviewDraw);
  }
}
function clearMasks(): void {
  if (!masks.value.length) return;
  undoStack.value.push(cloneMasks(masks.value));
  masks.value = [];
  redoStack.value = [];
  selectedMaskIndex.value = null;
  nextTick(schedulePreviewDraw);
}

watch(() => currentImage.value?.id, (newId, oldId) => {
  if (oldId && oldId !== newId) saveImageState(oldId);
  initializeImageState();
});
watch(viewMode, () => nextTick(schedulePreviewDraw));
watch([activeTab, watermarkEnabled, watermarkText, maskStyle, cropRect], () => {
  if (!restoringState && viewMode.value === 'original') viewMode.value = 'editing';
  nextTick(schedulePreviewDraw);
}, { deep: true });

onMounted(() => {
  document.addEventListener('pointerdown', closeExifDatePickerOnOutside);
  nextTick(schedulePreviewDraw);
});
onUnmounted(() => {
  if (previewFrameHandle !== null) window.cancelAnimationFrame(previewFrameHandle);
  previewFrameHandle = null;
  pendingPointerPosition = null;
  document.removeEventListener('pointerdown', closeExifDatePickerOnOutside);
  saveImageState(selectedId.value);
  files.value.forEach((image) => {
    URL.revokeObjectURL(image.sourceUrl);
    disposeImageState(image);
  });
});
</script>

<style scoped>
.exif-date-picker {
  isolation: isolate;
  background: rgba(24, 24, 27, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 18px 45px rgba(0, 0, 0, 0.48);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  backdrop-filter: blur(20px) saturate(150%);
}

.liquid-glass-select {
  appearance: none;
  color-scheme: dark;
  background-color: rgba(24, 24, 27, 0.72);
  background-image:
    linear-gradient(45deg, transparent 50%, rgba(255, 255, 255, 0.72) 50%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.72) 50%, transparent 50%);
  background-position:
    calc(100% - 16px) 50%,
    calc(100% - 11px) 50%;
  background-repeat: no-repeat;
  background-size: 5px 5px, 5px 5px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 30px rgba(0, 0, 0, 0.12);
  padding-right: 2.5rem;
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  backdrop-filter: blur(18px) saturate(140%);
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.liquid-glass-select:hover {
  background-color: rgba(39, 39, 42, 0.78);
  border-color: rgba(255, 255, 255, 0.24);
}

.liquid-glass-select:focus {
  border-color: rgba(0, 122, 255, 0.8);
  box-shadow:
    0 0 0 3px rgba(0, 122, 255, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.liquid-glass-select:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.liquid-glass-select option {
  background: #18181b;
  color: #fff;
}
</style>
