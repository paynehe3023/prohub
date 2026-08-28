<template>
  <div class="min-h-screen py-8 px-4">
    <div class="max-w-7xl mx-auto space-y-6">
      <section v-if="isHost" class="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-xl overflow-hidden">
        <div class="p-6 md:p-8 bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <div class="flex flex-col xl:flex-row xl:items-start gap-6">
            <div class="flex-1 space-y-5">
              <div class="flex flex-wrap items-center gap-2">
                <span :class="statusBadgeClass" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border">
                  <component :is="statusIcon" size="14" />
                  {{ connectionLabel }}
                </span>
                <span v-if="roomTtlMinutes > 0" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-sky-200 text-sky-700 bg-sky-50 dark:border-sky-900/50 dark:text-sky-300 dark:bg-sky-900/20">
                  <IconClockHour4 size="14" />
                  {{ ttlLabel }} 自动清空
                </span>
                <span v-else class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300 dark:bg-emerald-900/20">
                  <IconClockHour4 size="14" />
                  永不销毁
                </span>
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 bg-white dark:border-slate-700 dark:text-slate-300 dark:bg-slate-900/60">
                  <IconClipboardText size="14" />
                  最多 {{ maxClips }} 条
                </span>
              </div>

              <div>
                <h1 class="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">网页极速剪贴板</h1>
                <p class="mt-3 text-sm md:text-base text-slate-600 dark:text-slate-400 max-w-3xl leading-7">
                  免登录房间制剪贴板，支持文本、截图、图片和文件跨端实时同步。打开同一房间链接，手机和电脑即可同步同一份内容。
                </p>
              </div>

              <div v-if="isLocalShareOrigin" class="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                当前地址是本机地址，手机扫码会连不上。请把“外部访问地址”改成电脑局域网 IP 或正式域名。
              </div>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-xs uppercase tracking-[0.24em] text-slate-400">当前房间</p>
                      <p class="mt-1 text-2xl font-black tracking-[0.35em] text-slate-900 dark:text-white">{{ displayRoomId }}</p>
                    </div>
                    <div class="flex shrink-0 items-center gap-2">
                      <button type="button" @click="toggleRoomCodeVisibility" :aria-label="roomCodeVisible ? '隐藏完整房间号' : '显示完整房间号'" :title="roomCodeVisible ? '隐藏完整房间号' : '显示完整房间号'" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                        <component :is="roomCodeVisible ? IconEyeOff : IconEye" size="18" />
                      </button>
                      <button type="button" @click="copyRoomUrl" class="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors">
                        <IconCopy size="18" />
                        <span class="hidden sm:inline">复制链接</span>
                      </button>
                    </div>
                  </div>
                  <p class="mt-3 text-xs text-slate-500 break-all">{{ displayRoomUrl }}</p>
                </div>

                <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-[0.24em] text-slate-400">自动销毁</p>
                      <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{{ remainingText }}</p>
                    </div>
                    <select v-model.number="roomTtlMinutes" @change="syncRoomSettings" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500">
                      <option v-for="option in ttlOptions" :key="option" :value="option">{{ option === 0 ? '永不销毁' : `${option} 分钟` }}</option>
                    </select>
                  </div>
                  <p class="mt-3 text-xs text-slate-500">房间无活动后自动清空，避免持久化隐私残留。</p>
                </div>

                <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-[0.24em] text-slate-400">外部访问地址</p>
                      <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white break-all">{{ shareOrigin }}</p>
                    </div>
                    <button type="button" @click="resetShareOrigin" class="text-xs font-medium text-sky-600 hover:text-sky-500 inline-flex items-center gap-1">
                      <IconRefresh size="14" />
                      恢复默认
                    </button>
                  </div>
                  <input v-model="shareOriginDraft" type="text" placeholder="http://192.168.1.10:5173 或 https://your-domain.com" class="mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500" />
                  <p class="mt-3 text-xs leading-5" :class="shareOriginHintClass">{{ shareOriginHint }}</p>
                </div>
              </div>
            </div>

            <div class="w-full xl:w-72 shrink-0 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/75 p-4 shadow-lg">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.24em] text-slate-400">房间二维码</p>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">手机扫码直接进入同一房间</p>
                </div>
                <button type="button" @click="refreshQr" class="text-xs font-medium text-sky-600 hover:text-sky-500 inline-flex items-center gap-1">
                  <IconRefresh size="14" /> 刷新
                </button>
              </div>

              <div class="mt-4 rounded-2xl bg-white p-3 flex items-center justify-center border border-slate-200">
                <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="房间二维码" class="w-44 h-44 object-contain" />
                <div v-else class="w-44 h-44 rounded-2xl flex items-center justify-center text-slate-400 text-sm">生成中...</div>
              </div>

              <div class="mt-4 flex items-center gap-2">
                <button type="button" @click="clearRoom" class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-900/15 dark:text-rose-300 transition-colors">
                  <IconTrash size="16" />
                  清空房间
                </button>
                <button type="button" @click="focusComposer" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <IconClipboardText size="16" />
                  输入
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl px-5 py-4 shadow-xl">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" @click="copyRoomUrl" class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors">
              <IconCopy size="18" />
              房间号: {{ displayRoomId }}
            </button>
            <button type="button" @click="toggleRoomCodeVisibility" :aria-label="roomCodeVisible ? '隐藏完整房间号' : '显示完整房间号'" :title="roomCodeVisible ? '隐藏完整房间号' : '显示完整房间号'" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
              <component :is="roomCodeVisible ? IconEyeOff : IconEye" size="16" />
            </button>
            <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold" :class="statusBadgeClass">
              <component :is="statusIcon" size="14" />
              {{ connectionLabel }}
            </span>
          </div>
          <span class="text-xs text-slate-500 dark:text-slate-400">点击房间号复制链接</span>
        </div>
      </section>

      <div class="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section class="space-y-6">
          <div class="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl p-5 shadow-xl">
            <div class="flex items-center gap-2 mb-4">
              <IconFileText size="18" class="text-sky-600" />
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">文本同步</h2>
            </div>

            <textarea ref="composerRef" v-model="textDraft" @paste="handleTextPaste" @keydown.ctrl.enter.prevent="sendTextNow" @input="scheduleTextSend" rows="8" placeholder="在这里输入内容，或直接 Ctrl+V 粘贴文本/截图/文件。" class="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-500 resize-none" />

            <div class="mt-3 flex flex-wrap gap-2">
              <button type="button" @click="sendTextNow" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors">
                <IconSend size="16" />
                立即同步
              </button>
              <button type="button" @click="clearTextDraft" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <IconTrash size="16" />
                清空草稿
              </button>
            </div>
          </div>

          <div class="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-950/50 p-5 transition-colors" :class="dragging ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-900/15' : ''" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="handleDrop">
            <div class="flex items-center gap-2 mb-3">
              <IconUpload size="18" class="text-sky-600" />
              <h3 class="text-base font-bold text-slate-900 dark:text-white">拖拽 / 粘贴图片与文件</h3>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-6">支持截图粘贴、图片拖拽、文件拖拽。小图片直接内联同步，大文件自动走临时链接广播。</p>
            <p class="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">支持图片及常用文档，单文件最大 50MB</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <button type="button" :disabled="uploading" @click="triggerFilePick" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                <IconPhoto size="16" />
                {{ uploading ? '传输中...' : '选择图片/文件' }}
              </button>
              <input ref="fileInputRef" type="file" multiple class="hidden" @change="handleFileSelect" />
            </div>
          </div>
        </section>

        <section class="space-y-4">
          <div class="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl p-5 shadow-xl flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">同步列表</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">共 {{ clips.length }} 条 · 最多保存 {{ maxClips }} 条 · 失活后自动销毁</p>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <IconDeviceMobile size="14" />
                {{ displayRoomId }}
              </span>
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" :class="statusBadgeClass">
                <component :is="statusIcon" size="14" />
                {{ connectionLabel }}
              </span>
            </div>
          </div>

          <div v-if="!sortedClips.length" class="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-950/50 p-10 text-center text-slate-500 dark:text-slate-400">
            还没有任何内容。先在左侧输入文本，或者直接粘贴截图/拖拽文件试试。
          </div>

          <div class="space-y-4">
            <article v-for="clip in sortedClips" :key="clip.id" class="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl p-5 shadow-xl">
              <div v-if="clip.transferStatus === 'uploading' || clip.transferStatus === 'failed'" class="absolute inset-x-0 bottom-0 z-10 bg-slate-950/95 px-3 py-2.5 text-white md:inset-0 md:flex md:items-center md:justify-center md:bg-slate-950/55 md:px-6 md:backdrop-blur-sm">
                <div class="w-full max-w-sm rounded-xl border border-white/15 bg-slate-950/90 p-3 shadow-xl md:rounded-2xl md:p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex min-w-0 items-center gap-2">
                      <IconLoader2 v-if="clip.transferStatus === 'uploading'" class="h-4 w-4 shrink-0 animate-spin text-sky-300" />
                      <IconX v-else class="h-4 w-4 shrink-0 text-rose-300" />
                      <span class="truncate text-sm font-semibold">{{ clip.transferStatus === 'uploading' ? '正在传输' : '传输失败' }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-bold">{{ clip.transferProgress || 0 }}%</span>
                      <button v-if="clip.transferStatus === 'uploading'" type="button" @click.stop="cancelUpload(clip.msgId)" aria-label="取消传输" title="取消传输" class="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white">
                        <IconX size="14" />
                      </button>
                    </div>
                  </div>
                  <p class="mt-1 truncate text-xs text-slate-300">{{ displayFileName(clip.fileName, 'clipboard-file') }}</p>
                  <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15 md:mt-3 md:h-2">
                    <div class="h-full rounded-full bg-sky-400 transition-[width] duration-150" :class="clip.transferStatus === 'failed' ? 'bg-rose-400' : ''" :style="{ width: `${clip.transferProgress || 0}%` }"></div>
                  </div>
                  <p class="mt-2 hidden text-[0.6875rem] text-slate-400 md:block">{{ clip.transferStatus === 'uploading' ? '请保持页面打开，传输完成后即可预览和下载。' : (clip.transferError || '文件传输失败') }}</p>
                </div>
              </div>
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div class="flex items-center gap-3">
                  <span class="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    <component :is="clipIcon(clip)" size="18" />
                  </span>
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="font-semibold text-slate-900 dark:text-white">{{ clipTypeLabel(clip) }}</h3>
                      <span class="px-2.5 py-1 rounded-full text-xs font-medium" :class="clipBadgeClass(clip)">{{ clipSizeLabel(clip) }}</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">{{ formatTime(clip.createdAt) }}</p>
                  </div>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button v-if="clip.kind === 'text' || isTextFile(clip)" type="button" @click="copyClip(clip)" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <IconCopy size="16" />
                    复制文本
                  </button>
                  <button v-if="isTextFile(clip)" type="button" @click="previewTextFile(clip)" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-700 bg-violet-50 hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-900/20 dark:text-violet-300 transition-colors">
                    <IconFileText size="16" />
                    预览
                  </button>
                  <button v-if="hasDownload(clip)" type="button" @click="downloadClip(clip)" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-sky-200 text-sm text-sky-700 bg-sky-50 hover:bg-sky-100 dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-300 transition-colors">
                    <IconDownload size="16" />
                    {{ clip.kind === 'image' ? '下载原图' : '下载原文件' }}
                  </button>
                  <button type="button" @click="deleteClip(clip)" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 text-sm text-rose-700 bg-rose-50 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300 transition-colors">
                    <IconTrash size="16" />
                    删除
                  </button>
                </div>
              </div>

              <div class="mt-4">
                <div v-if="clip.kind === 'text'" class="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4">
                  <pre class="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800 dark:text-slate-100 font-mono">{{ clip.text }}</pre>
                </div>

                <div v-else-if="clip.kind === 'image'" class="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] items-start">
                  <div class="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                    <img :src="clip.localPreviewUrl || clip.previewUrl || clip.dataUrl" alt="图片预览" class="w-full h-auto object-contain" />
                  </div>
                  <div class="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                    <p class="break-all">文件名：{{ displayFileName(clip.fileName, 'image.png') }}</p>
                    <p>尺寸：{{ formatBytes(clip.size) }}</p>
                    <p>类型：{{ clip.mimeType || 'image/*' }}</p>
                  </div>
                </div>

                <div v-else class="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4">
                  <div class="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <IconFile size="22" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-slate-900 dark:text-white break-all">{{ displayFileName(clip.fileName, 'clipboard-file') }}</p>
                    <p class="text-xs text-slate-500 mt-1">{{ formatBytes(clip.size) }} · {{ clip.mimeType || 'application/octet-stream' }}</p>
                    <p class="text-xs text-slate-500 mt-1 break-all">{{ clip.downloadUrl }}</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>

    <div class="fixed right-4 top-4 z-50 space-y-2 w-[min(92vw,360px)] pointer-events-none">
      <transition-group name="toast" tag="div" class="space-y-2">
        <div v-for="toast in toasts" :key="toast.id" class="pointer-events-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-xl px-4 py-3 text-sm flex items-start gap-3">
          <span class="mt-0.5" :class="toastToneClass(toast.type)">
            <component :is="toastIcon(toast.type)" size="16" />
          </span>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-slate-900 dark:text-white">{{ toast.title }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words">{{ toast.message }}</p>
          </div>
        </div>
      </transition-group>
    </div>

    <div v-if="textPreview.open" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" @click.self="closeTextPreview">
      <section class="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-white shadow-2xl">
        <div class="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div class="min-w-0">
            <h2 class="truncate text-base font-bold">{{ textPreview.fileName }}</h2>
            <p class="mt-1 text-xs text-slate-400">文本文件预览</p>
          </div>
          <button type="button" @click="closeTextPreview" aria-label="关闭文本预览" title="关闭" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white">
            <IconX size="18" />
          </button>
        </div>
        <div class="min-h-0 overflow-auto p-5">
          <div v-if="textPreview.loading" class="py-12 text-center text-sm text-slate-400">正在读取文件...</div>
          <div v-else-if="textPreview.error" class="rounded-2xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-300">{{ textPreview.error }}</div>
          <pre v-else class="whitespace-pre-wrap break-words rounded-2xl bg-slate-900 p-4 text-sm leading-7 text-slate-200">{{ textPreview.content }}</pre>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { useRoute, useRouter } from 'vue-router';
import QRCode from 'qrcode';
import { io } from 'socket.io-client';
import { apiConfig } from '../../config/api';
import {
  IconCheck,
  IconClipboardText,
  IconClockHour4,
  IconCopy,
  IconDeviceMobile,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconFile,
  IconFileText,
  IconLoader2,
  IconPhoto,
  IconRefresh,
  IconSend,
  IconTrash,
  IconUpload,
  IconWifi,
  IconWifiOff,
  IconX,
} from '@tabler/icons-vue';

useHead({
  title: '网页极速剪贴板 - proHub',
  meta: [
    { name: 'description', content: '免登录房间式剪贴板，支持文本、图片、文件跨端实时同步，二维码直达与阅后即焚自动清空。' },
    { name: 'keywords', content: '剪贴板,实时同步,跨端同步,二维码,图片同步,文件同步,实时连接' },
  ],
});

const route = useRoute();
const router = useRouter();
const socketBaseUrl = apiConfig.socketURL || window.location.origin;
const defaultShareOrigin = apiConfig.publicOrigin || window.location.origin;
const SHARE_ORIGIN_STORAGE_KEY = 'prohub-clipboard-share-origin';
const HOST_TOKEN_STORAGE_PREFIX = 'prohub-clipboard-host-token:';
const CLIENT_ID_STORAGE_KEY = 'prohub-clipboard-client-id';
const shareOriginDraft = ref(defaultShareOrigin);
const ttlOptions = [0, 5, 10, 15, 30, 60];
const maxClips = 20;
const inlineImageThreshold = 750 * 1024;
const maxFileBytes = 50 * 1024 * 1024;

const roomId = ref('');
const isHost = ref(false);
const hostToken = ref('');
const roomCodeVisible = ref(false);
const roomTtlMinutes = ref(15);
const roomExpiresAt = ref(Date.now() + 15 * 60 * 1000);
const clips = ref([]);
const textDraft = ref('');
const qrCodeDataUrl = ref('');
const dragging = ref(false);
const socketState = ref('connecting');
const uploading = ref(false);
const now = ref(Date.now());
const toasts = ref([]);
const composerRef = ref(null);
const fileInputRef = ref(null);
const textPreview = ref({
  open: false,
  loading: false,
  fileName: '',
  content: '',
  error: '',
});

let socketInstance = null;
let textTimer = null;
let ticker = null;
let lastSentText = '';
let qrStamp = 0;
let visibilityHandler = null;
const uploadRequests = new Map();
const uploadReaders = new Map();
const cancelledUploads = new Set();
const seenMessageIds = new Set();

function getClientId() {
  try {
    const existing = window.sessionStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (existing) return existing;
    const generated = createMessageId();
    window.sessionStorage.setItem(CLIENT_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return createMessageId();
  }
}

const selfClientId = getClientId();

function normalizeBaseUrl(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  try {
    return new URL(candidate).origin;
  } catch {
    try {
      return new URL('http://' + candidate).origin;
    } catch {
      return '';
    }
  }
}

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.localhost');
}

function maskRoomId(value) {
  const normalized = String(value || '');
  if (normalized.length <= 3) return normalized ? normalized.slice(0, 1) + '***' : '';
  return normalized.slice(0, 2) + '***' + normalized.slice(-1);
}

const sortedClips = computed(() => [...clips.value].sort((left, right) => right.createdAt - left.createdAt));
const shareOrigin = computed(() => normalizeBaseUrl(shareOriginDraft.value) || defaultShareOrigin);
const roomUrl = computed(() => (roomId.value ? shareOrigin.value + '/clipboard/' + roomId.value : ''));
const displayRoomId = computed(() => (roomCodeVisible.value ? roomId.value : maskRoomId(roomId.value)));
const displayRoomUrl = computed(() => (roomId.value ? shareOrigin.value + '/clipboard/' + displayRoomId.value : ''));
const isLocalShareOrigin = computed(() => {
  try {
    return isLoopbackHost(new URL(shareOrigin.value).hostname);
  } catch {
    return true;
  }
});
const shareOriginHint = computed(() => (isLocalShareOrigin.value ? '当前是本机地址，手机扫码请改成电脑局域网 IP 或正式域名。' : '二维码和复制链接会使用这个地址生成。正式部署一般无需修改。'));
const shareOriginHintClass = computed(() => (isLocalShareOrigin.value ? 'text-amber-600 dark:text-amber-300' : 'text-slate-500'));
const ttlLabel = computed(() => (roomTtlMinutes.value === 0 ? '永不销毁' : roomTtlMinutes.value + ' 分钟'));
const connectionLabel = computed(() => {
  if (socketState.value === 'connected') return '已连接';
  if (socketState.value === 'reconnecting') return '重连中';
  if (socketState.value === 'offline') return '离线';
  return '连接中';
});
const statusIcon = computed(() => (socketState.value === 'connected' ? IconCheck : socketState.value === 'offline' ? IconWifiOff : IconRefresh));
const statusBadgeClass = computed(() => {
  if (socketState.value === 'connected') return 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300 dark:bg-emerald-900/20';
  if (socketState.value === 'offline') return 'border-rose-200 text-rose-700 bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:bg-rose-900/20';
  return 'border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-900/50 dark:text-amber-300 dark:bg-amber-900/20';
});
const remainingText = computed(() => {
  if (roomTtlMinutes.value === 0 || !roomExpiresAt.value) return '永不销毁';
  const seconds = Math.max(0, Math.floor((roomExpiresAt.value - now.value) / 1000));
  if (seconds <= 0) return '即将清空';
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return minutes + '分' + String(remainSeconds).padStart(2, '0') + '秒后清空';
});

function generateRoomId(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

function normalizeRoomId(value) {
  const candidate = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return candidate.length >= 4 ? candidate.slice(0, 24) : '';
}

function createMessageId() {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function hostTokenStorageKey(value) {
  return HOST_TOKEN_STORAGE_PREFIX + normalizeRoomId(value);
}

function readHostToken(value) {
  try {
    return window.sessionStorage.getItem(hostTokenStorageKey(value)) || '';
  } catch {
    return '';
  }
}

function rememberHostToken(value, token) {
  const nextRoomId = normalizeRoomId(value);
  const nextToken = String(token || '').trim();
  if (!nextRoomId || !nextToken) return;
  window.sessionStorage.setItem(hostTokenStorageKey(nextRoomId), nextToken);
}

function forgetHostToken(value) {
  try {
    window.sessionStorage.removeItem(hostTokenStorageKey(value));
  } catch {
    return;
  }
}

async function requestRoomSession(nextRoomId, intent = 'join') {
  const normalizedRoomId = normalizeRoomId(nextRoomId);
  if (!normalizedRoomId) throw new Error('房间号无效');

  const response = await fetch(apiConfig.baseURL + apiConfig.endpoints.clipboardRoomSession, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: normalizedRoomId,
      intent,
      hostToken: readHostToken(normalizedRoomId),
      ttlMinutes: roomTtlMinutes.value,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || `房间身份确认失败（HTTP ${response.status}）`);
  }

  roomId.value = normalizedRoomId;
  const confirmedHost = data.role === 'host' && Boolean(data.hostToken);
  isHost.value = confirmedHost;
  hostToken.value = confirmedHost ? String(data.hostToken) : '';
  if (isHost.value && hostToken.value) {
    rememberHostToken(normalizedRoomId, hostToken.value);
  } else if (!isHost.value) {
    forgetHostToken(normalizedRoomId);
  }
  syncRoomMeta(data.room);
  return data;
}

function showToast(type, title, message) {
  const id = createMessageId();
  toasts.value.unshift({ id, type, title, message });
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }, 2600);
}

function toastIcon(type) {
  if (type === 'success') return IconCheck;
  if (type === 'error') return IconX;
  return IconRefresh;
}

function toastToneClass(type) {
  if (type === 'success') return 'text-emerald-500';
  if (type === 'error') return 'text-rose-500';
  return 'text-sky-500';
}

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Number(bytes);
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1) + ' ' + units[unitIndex];
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(timestamp));
}

function displayFileName(value, fallback = 'clipboard-file') {
  const rawName = String(value || '').trim();
  if (!rawName) return fallback;
  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function toggleRoomCodeVisibility() {
  roomCodeVisible.value = !roomCodeVisible.value;
}

function clipTypeLabel(clip) {
  if (clip.kind === 'text') return '文本';
  if (clip.kind === 'image') return '图片';
  return '文件';
}

function clipIcon(clip) {
  if (clip.kind === 'text') return IconFileText;
  if (clip.kind === 'image') return IconPhoto;
  return IconFile;
}

function clipBadgeClass(clip) {
  if (clip.kind === 'text') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  if (clip.kind === 'image') return 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300';
  return 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300';
}

function clipSizeLabel(clip) {
  if (clip.kind === 'text') return (clip.textLength || 0) + ' 字';
  return formatBytes(clip.size);
}

const textFileExtensions = new Set(['.txt', '.md', '.markdown', '.json', '.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.java', '.c', '.cpp', '.h', '.css', '.scss', '.less', '.html', '.htm', '.xml', '.yaml', '.yml', '.csv', '.log', '.sh', '.bat', '.ps1']);
const textFileMimeTypes = new Set(['application/json', 'application/javascript', 'application/xml', 'application/x-sh', 'application/x-httpd-php']);

function isTextFile(clip) {
  if (!clip || clip.kind === 'text') return false;
  const mimeType = String(clip.mimeType || '').toLowerCase().split(';')[0];
  if (mimeType.startsWith('text/') || textFileMimeTypes.has(mimeType)) return true;
  const fileName = displayFileName(clip.fileName).toLowerCase();
  return Array.from(textFileExtensions).some((extension) => fileName.endsWith(extension));
}

function clipMessageKey(clip) {
  return String(clip?.msgId || clip?.id || '');
}

function upsertClip(clip, { allowSelf = false } = {}) {
  if (!clip) return false;
  const key = clipMessageKey(clip);
  if (!key) return false;
  const index = clips.value.findIndex((item) => clipMessageKey(item) === key || item.id === clip.id);
  if (index < 0 && !allowSelf && clip.clientId && clip.clientId === selfClientId) return false;
  if (index < 0 && seenMessageIds.has(key)) return false;
  const previous = index >= 0 ? clips.value[index] : null;
  if (previous?.localPreviewUrl && previous.localPreviewUrl !== clip.localPreviewUrl) {
    URL.revokeObjectURL(previous.localPreviewUrl);
  }
  seenMessageIds.add(key);
  if (index >= 0) {
    clips.value.splice(index, 1, clip);
    return false;
  }
  clips.value.unshift(clip);
  return true;
}

function replaceInitialClips(incomingClips) {
  const nextClips = Array.isArray(incomingClips) ? incomingClips.filter(Boolean) : [];
  const incomingKeys = new Set(nextClips.map((clip) => clipMessageKey(clip)));
  const pendingUploads = clips.value.filter((item) => (
    (item.transferStatus === 'uploading' || item.transferStatus === 'failed')
    && !incomingKeys.has(clipMessageKey(item))
  ));
  nextClips.forEach((clip) => seenMessageIds.add(clipMessageKey(clip)));
  clips.value = [...nextClips, ...pendingUploads];
}

function updateUploadCard(msgId, patch) {
  const index = clips.value.findIndex((clip) => clip.msgId === msgId);
  if (index >= 0) clips.value.splice(index, 1, { ...clips.value[index], ...patch });
}

function createUploadCard(file) {
  const msgId = createMessageId();
  cancelledUploads.delete(msgId);
  const localPreviewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
  const localClip = {
    id: `local-${msgId}`,
    msgId,
    roomId: roomId.value,
    clientId: selfClientId,
    kind: file.type.startsWith('image/') ? 'image' : 'file',
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    localPreviewUrl,
    createdAt: Date.now(),
    transferStatus: 'uploading',
    transferProgress: 0,
  };
  upsertClip(localClip, { allowSelf: true });
  return msgId;
}

function markUploadFailed(msgId, error) {
  if (cancelledUploads.has(msgId)) {
    updateUploadCard(msgId, {
      transferStatus: 'cancelled',
      transferProgress: 0,
      transferError: '已取消传输',
    });
    cancelledUploads.delete(msgId);
    return;
  }
  updateUploadCard(msgId, {
    transferStatus: 'failed',
    transferProgress: 0,
    transferError: error?.message || '文件传输失败',
  });
}

function completeUpload(msgId, clip, file) {
  updateUploadCard(msgId, { transferProgress: 100 });
  upsertClip(clip, { allowSelf: true });
  cancelledUploads.delete(msgId);
  showToast('success', '传输完成', `${file.type.startsWith('image/') ? '图片' : '文件'} ${file.name} 传输完成。`);
}

function hasDownload(clip) {
  return Boolean(clip.downloadUrl || clip.dataUrl || clip.previewUrl);
}

function getAbsoluteUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return window.location.origin + url;
}

function connectSocket() {
  disconnectSocket();
  if (!roomId.value) return;

  socketState.value = 'connecting';
  socketInstance = io(socketBaseUrl, {
    query: {
      roomId: roomId.value,
      clientId: selfClientId,
      hostToken: hostToken.value,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 4000,
    timeout: 15000,
  });

  socketInstance.on('connect', () => {
    socketState.value = 'connected';
    socketInstance.emit('room:join', {
      roomId: roomId.value,
      ttlMinutes: roomTtlMinutes.value,
      hostToken: hostToken.value,
    }, (response) => {
      if (response?.ok) {
        if (response.role) isHost.value = response.role === 'host';
        replaceInitialClips(response.clips || []);
        syncRoomMeta(response.room);
        showToast('success', '已进入房间', '房间历史内容已同步。');
      }
    });
  });

  socketInstance.on('disconnect', () => {
    socketState.value = 'offline';
  });

  socketInstance.io.on('reconnect_attempt', () => {
    socketState.value = 'reconnecting';
  });

  socketInstance.io.on('reconnect', () => {
    socketState.value = 'connected';
    socketInstance.emit('room:join', {
      roomId: roomId.value,
      ttlMinutes: roomTtlMinutes.value,
      hostToken: hostToken.value,
    });
    showToast('success', '连接已恢复', '房间已自动重新加入。');
  });

  socketInstance.on('connect_error', (error) => {
    socketState.value = 'offline';
    showToast('error', '连接失败', error.message || 'Socket 连接失败');
  });

  socketInstance.on('clip:init', (payload) => {
    replaceInitialClips(payload?.clips || []);
    syncRoomMeta(payload?.room);
  });

  socketInstance.on('clip:sync', (payload) => {
    if (payload?.room?.expiresAt) roomExpiresAt.value = payload.room.expiresAt;
    if (payload?.clip) {
      if (upsertClip(payload.clip)) {
        showToast('success', '收到同步', clipTypeLabel(payload.clip) + ' 已同步到房间。');
      }
    }
  });

  socketInstance.on('clip:delete', (payload) => {
    clips.value = clips.value.filter((item) => item.id !== payload?.clipId);
    if (payload?.room?.expiresAt) roomExpiresAt.value = payload.room.expiresAt;
  });

  socketInstance.on('room:settings', (payload) => {
    syncRoomMeta(payload);
  });

  socketInstance.on('room:cleared', (payload) => {
    clips.value = [];
    roomExpiresAt.value = Date.now() + roomTtlMinutes.value * 60 * 1000;
    showToast('success', '房间已清空', payload?.reason === 'expired' ? '因长时间无活动自动销毁。' : '房间已手动清空。');
  });
}

function disconnectSocket() {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
}

function syncRoomSettings() {
  if (!socketInstance) return;
  socketInstance.emit('room:update-settings', {
    roomId: roomId.value,
    ttlMinutes: roomTtlMinutes.value,
    hostToken: hostToken.value,
  });
}

function scheduleTextSend() {
  if (textTimer) window.clearTimeout(textTimer);
  textTimer = window.setTimeout(() => {
    if (textDraft.value.trim()) sendTextNow();
  }, 900);
}

function clearTextDraft() {
  textDraft.value = '';
  lastSentText = '';
}

function sendTextNow() {
  const text = textDraft.value.trim();
  if (!text) {
    showToast('error', '内容为空', '请输入一点文本再同步。');
    return;
  }
  if (text === lastSentText) return;
  if (!socketInstance) {
    showToast('error', '尚未连接', '请等待房间连接成功后再同步。');
    return;
  }

  const msgId = createMessageId();
  socketInstance.emit('clip:send', {
    roomId: roomId.value,
    kind: 'text',
    msgId,
    clientId: selfClientId,
    text,
    ttlMinutes: roomTtlMinutes.value,
  }, (response) => {
    if (!response?.ok) {
      showToast('error', '同步失败', response?.error || '文本发送失败');
      return;
    }
    upsertClip(response.clip, { allowSelf: true });
    if (response.room) syncRoomMeta(response.room);
    lastSentText = text;
    textDraft.value = '';
    showToast('success', '文本已同步', '同房间设备已收到这段文本。');
  });
}

function readFileAsDataUrl(file, onProgress, msgId) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    if (msgId) uploadReaders.set(msgId, reader);
    reader.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.min(90, Math.round((event.loaded / event.total) * 90)));
      }
    };
    reader.onload = () => {
      if (msgId) uploadReaders.delete(msgId);
      resolve(String(reader.result || ''));
    };
    reader.onerror = () => {
      if (msgId) uploadReaders.delete(msgId);
      reject(new Error('读取文件失败'));
    };
    reader.onabort = () => {
      if (msgId) uploadReaders.delete(msgId);
      reject(new Error('已取消传输'));
    };
    reader.readAsDataURL(file);
  });
}

function uploadFileWithProgress(file, msgId) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('roomId', roomId.value);
    formData.append('ttlMinutes', String(roomTtlMinutes.value));
    formData.append('msgId', msgId);
    formData.append('clientId', selfClientId);
    formData.append('file', file);

    const request = new XMLHttpRequest();
    uploadRequests.set(msgId, request);
    request.open('POST', apiConfig.baseURL + apiConfig.endpoints.clipboardUpload);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        updateUploadCard(msgId, { transferProgress: Math.min(95, Math.round((event.loaded / event.total) * 95)) });
      }
    };
    request.onerror = () => {
      uploadRequests.delete(msgId);
      reject(new Error('上传连接失败'));
    };
    request.onabort = () => {
      uploadRequests.delete(msgId);
      reject(new Error('已取消传输'));
    };
    request.onload = () => {
      uploadRequests.delete(msgId);
      let responseData = {};
      try {
        responseData = JSON.parse(request.responseText || '{}');
      } catch {
        responseData = {};
      }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(responseData.message || responseData.error || `上传失败（HTTP ${request.status}）`));
        return;
      }
      resolve(responseData);
    };
    request.send(formData);
  });
}

function cancelUpload(msgId) {
  cancelledUploads.add(msgId);
  uploadReaders.get(msgId)?.abort();
  uploadRequests.get(msgId)?.abort();
  if (!uploadReaders.has(msgId) && !uploadRequests.has(msgId)) {
    markUploadFailed(msgId, new Error('已取消传输'));
  }
}

async function uploadAndSendFile(file) {
  if (!file) return;
  if (file.size > maxFileBytes) {
    throw new Error(`${file.name} 超过 50MB 单文件限制`);
  }
  const msgId = createUploadCard(file);

  try {
    if (!socketInstance) {
      throw new Error('尚未连接到房间，请稍后重试');
    }
    let response;
    if (file.type.startsWith('image/') && file.size <= inlineImageThreshold) {
      const dataUrl = await readFileAsDataUrl(file, (progress) => updateUploadCard(msgId, { transferProgress: progress }), msgId);
      if (cancelledUploads.has(msgId)) throw new Error('已取消传输');
      response = await new Promise((resolve, reject) => {
        socketInstance?.emit('clip:send', {
          roomId: roomId.value,
          msgId,
          clientId: selfClientId,
          kind: 'image',
          dataUrl,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          ttlMinutes: roomTtlMinutes.value,
        }, (acknowledgement) => {
          if (!acknowledgement?.ok) {
            reject(new Error(acknowledgement?.error || '图片同步失败'));
            return;
          }
          resolve(acknowledgement);
        });
      });
    } else {
      const uploadData = await uploadFileWithProgress(file, msgId);
      if (cancelledUploads.has(msgId)) throw new Error('已取消传输');
      updateUploadCard(msgId, { transferProgress: 97 });
      response = await new Promise((resolve, reject) => {
        socketInstance?.emit('clip:send', {
          roomId: roomId.value,
          msgId,
          clientId: selfClientId,
          assetId: uploadData?.asset?.assetId,
          ttlMinutes: roomTtlMinutes.value,
        }, (acknowledgement) => {
          if (!acknowledgement?.ok) {
            reject(new Error(acknowledgement?.error || '文件同步失败'));
            return;
          }
          resolve(acknowledgement);
        });
      });
    }
    if (cancelledUploads.has(msgId)) throw new Error('已取消传输');
    if (response.room) syncRoomMeta(response.room);
    completeUpload(msgId, response.clip, file);
  } catch (error) {
    markUploadFailed(msgId, error);
    throw error;
  }
}

async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  uploading.value = true;
  try {
    for (const file of files) {
      await uploadAndSendFile(file);
    }
    showToast('success', '同步完成', files.length + ' 个文件已同步到房间。');
  } catch (error) {
    showToast('error', '发送失败', error.message || '文件发送失败');
  } finally {
    uploading.value = false;
    dragging.value = false;
    if (fileInputRef.value) fileInputRef.value.value = '';
  }
}

function handleFileSelect(event) {
  handleFiles(event.target.files);
}

function handleDrop(event) {
  dragging.value = false;
  handleFiles(event.dataTransfer?.files);
}

function triggerFilePick() {
  fileInputRef.value?.click();
}

function focusComposer() {
  composerRef.value?.focus();
}

function handleTextPaste(event) {
  const fileItems = Array.from(event.clipboardData?.items || []).filter((item) => item.kind === 'file');
  const files = fileItems.map((item) => item.getAsFile()).filter(Boolean);
  if (files.length) {
    event.preventDefault();
    handleFiles(files);
    return;
  }

  const text = event.clipboardData?.getData('text/plain');
  if (text) {
    event.preventDefault();
    textDraft.value = text;
    sendTextNow();
  }
}

function handleGlobalPaste(event) {
  const active = document.activeElement;
  if (active && active.matches && active.matches('input, textarea, [contenteditable="true"]')) {
    return;
  }

  const files = Array.from(event.clipboardData?.files || []);
  if (files.length) {
    event.preventDefault();
    handleFiles(files);
    return;
  }

  const text = event.clipboardData?.getData('text/plain');
  if (text) {
    event.preventDefault();
    textDraft.value = text;
    sendTextNow();
  }
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

async function copyClip(clip) {
  try {
    if (clip.kind === 'text') {
      await copyText(clip.text || '');
      showToast('success', '已复制', '文本已复制到剪贴板。');
      return;
    }

    if (isTextFile(clip)) {
      const blob = await getClipBlob(clip);
      await copyText(await blob.text());
      showToast('success', '已复制', '文本文件内容已复制到剪贴板。');
      return;
    }

    if (clip.kind === 'image' && (clip.dataUrl || clip.previewUrl)) {
      const url = clip.dataUrl || getAbsoluteUrl(clip.previewUrl);
      const blob = await fetch(url).then((response) => response.blob());
      if (navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
        showToast('success', '已复制', '图片已复制到剪贴板。');
        return;
      }
    }

    await copyText(getAbsoluteUrl(clip.downloadUrl || clip.previewUrl || clip.fileName || ''));
    showToast('success', '已复制', '文件链接已复制。');
  } catch (error) {
    showToast('error', '复制失败', error.message || '当前浏览器不支持复制此类型内容');
  }
}

async function getClipBlob(clip) {
  const source = clip.dataUrl || clip.downloadUrl || clip.previewUrl;
  const url = getAbsoluteUrl(source);
  if (!url) throw new Error('文件地址不存在');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取文件失败（HTTP ${response.status}）`);
  return response.blob();
}

async function previewTextFile(clip) {
  textPreview.value = {
    open: true,
    loading: true,
    fileName: displayFileName(clip.fileName, 'clipboard-file'),
    content: '',
    error: '',
  };
  try {
    const blob = await getClipBlob(clip);
    const content = await blob.text();
    textPreview.value = {
      open: true,
      loading: false,
      fileName: displayFileName(clip.fileName, 'clipboard-file'),
      content,
      error: '',
    };
  } catch (error) {
    textPreview.value = {
      ...textPreview.value,
      loading: false,
      error: error?.message || '无法读取文本文件',
    };
  }
}

function closeTextPreview() {
  textPreview.value = {
    open: false,
    loading: false,
    fileName: '',
    content: '',
    error: '',
  };
}

async function downloadClip(clip) {
  try {
    const blob = await getClipBlob(clip);
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = displayFileName(clip.fileName, clip.kind === 'image' ? 'clipboard-image' : 'clipboard-file');
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    showToast('success', '下载已开始', `${anchor.download} 正在保存。`);
  } catch (error) {
    showToast('error', '下载失败', error?.message || '无法下载原始文件');
  }
}

function deleteClip(clip) {
  socketInstance?.emit('clip:delete', { roomId: roomId.value, clipId: clip.id }, (response) => {
    if (!response?.ok) {
      showToast('error', '删除失败', response?.error || '删除失败');
      return;
    }
    clips.value = clips.value.filter((item) => item.id !== clip.id);
    roomExpiresAt.value = response.room?.expiresAt || roomExpiresAt.value;
    showToast('success', '已删除', '条目已从房间中移除。');
  });
}

function clearRoom() {
  if (!window.confirm('确认清空整个房间吗？此操作会删除所有同步内容。')) return;
  socketInstance?.emit('room:clear', {
    roomId: roomId.value,
    hostToken: hostToken.value,
  }, (response) => {
    if (!response?.ok) {
      showToast('error', '清空失败', response?.error || '无法清空房间');
      return;
    }
    clips.value = [];
    textDraft.value = '';
    showToast('success', '房间已清空', '所有内容已删除。');
  });
}

async function copyRoomUrl() {
  if (!roomUrl.value) return;
  try {
    await copyText(roomUrl.value);
    showToast('success', '房间链接已复制', '可以直接发给另一台设备。');
  } catch (error) {
    showToast('error', '复制失败', error.message || '复制房间链接失败');
  }
}

function scheduleQrRefresh() {
  if (qrStamp) window.clearTimeout(qrStamp);
  qrStamp = window.setTimeout(refreshQr, 30);
}

async function refreshQr() {
  if (!roomUrl.value) {
    qrCodeDataUrl.value = '';
    return;
  }
  qrCodeDataUrl.value = await QRCode.toDataURL(roomUrl.value, {
    width: 240,
    margin: 1,
    errorCorrectionLevel: 'L',
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

function syncRoomMeta(room) {
  if (!room) return;
  if (Object.prototype.hasOwnProperty.call(room, 'ttlMinutes')) roomTtlMinutes.value = Number(room.ttlMinutes);
  if (Object.prototype.hasOwnProperty.call(room, 'expiresAt')) roomExpiresAt.value = room.expiresAt;
}

function resetShareOrigin() {
  shareOriginDraft.value = defaultShareOrigin;
  window.localStorage.removeItem(SHARE_ORIGIN_STORAGE_KEY);
}

let roomSessionRequestId = 0;

watch(() => route.params.roomId, async (value) => {
  const requestId = ++roomSessionRequestId;
  const normalized = normalizeRoomId(value);
  if (!normalized) {
    const generatedRoomId = generateRoomId();
    try {
      await requestRoomSession(generatedRoomId, 'create');
    } catch (error) {
      isHost.value = false;
      hostToken.value = '';
      showToast('error', '房间创建未确认', error?.message || '请检查后端服务是否正常。');
    }
    if (requestId !== roomSessionRequestId) return;
    await router.replace({ name: 'RealtimeClipboard', params: { roomId: generatedRoomId } });
    return;
  }

  try {
    await requestRoomSession(normalized, 'join');
  } catch (error) {
    isHost.value = false;
    hostToken.value = '';
    showToast('error', '房间身份确认失败', error?.message || '请检查后端服务是否正常。');
  }
  if (requestId !== roomSessionRequestId) return;
  connectSocket();
  await refreshQr();
}, { immediate: true });

watch(roomUrl, () => {
  scheduleQrRefresh();
}, { immediate: true });

watch(shareOriginDraft, (value) => {
  window.localStorage.setItem(SHARE_ORIGIN_STORAGE_KEY, String(value || '').trim());
});

watch(textDraft, () => {
  if (!textDraft.value.trim()) lastSentText = '';
});

onMounted(() => {
  const savedShareOrigin = window.localStorage.getItem(SHARE_ORIGIN_STORAGE_KEY);
  if (savedShareOrigin) {
    shareOriginDraft.value = savedShareOrigin;
  }
  ticker = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
  visibilityHandler = () => {
    showToast('success', document.visibilityState === 'visible' ? '页面已回到前台' : '页面已转入后台', document.visibilityState === 'visible' ? '连接状态会自动重连保持。' : '继续后台运行，回到页面即可恢复可见状态。');
  };
  window.addEventListener('paste', handleGlobalPaste);
  document.addEventListener('visibilitychange', visibilityHandler);
});

onBeforeUnmount(() => {
  if (textTimer) window.clearTimeout(textTimer);
  if (ticker) window.clearInterval(ticker);
  if (qrStamp) window.clearTimeout(qrStamp);
  uploadReaders.forEach((reader) => {
    if (reader.readyState === FileReader.LOADING) reader.abort();
  });
  uploadRequests.forEach((request) => request.abort());
  uploadReaders.clear();
  uploadRequests.clear();
  cancelledUploads.clear();
  window.removeEventListener('paste', handleGlobalPaste);
  if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
  disconnectSocket();
  clips.value.forEach((clip) => {
    if (clip.localPreviewUrl) URL.revokeObjectURL(clip.localPreviewUrl);
  });
});
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>



