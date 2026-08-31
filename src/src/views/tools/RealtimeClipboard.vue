<template>
  <div class="mobile-interface-shell min-h-dvh overflow-x-hidden px-4 py-8 pb-32 text-slate-900 dark:text-slate-100">
    <div class="max-w-7xl mx-auto space-y-6">
      <BackButton />
      <div v-if="isRoomDestroyed && !isHost" class="rounded-3xl border border-amber-300/70 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-rose-600/20 px-5 py-4 text-amber-900 shadow-xl shadow-rose-950/20 dark:text-amber-100">
        <div class="flex items-start gap-3">
          <IconAlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <div class="min-w-0">
            <p class="font-semibold">Host 已退出，房间已被销毁</p>
            <p class="mt-1 text-sm leading-6 text-amber-800/80 dark:text-amber-100/80">界面将在 {{ roomResetCountdown }} 秒后自动重置为您的独立 Host 房间。</p>
          </div>
        </div>
      </div>

      <section v-if="isHost" class="mobile-glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-xl overflow-hidden">
        <div class="mobile-glass-card p-6 md:p-8 bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <div class="flex flex-col xl:flex-row xl:items-start gap-6">
            <div class="flex-1 space-y-5">
              <div class="flex flex-wrap items-center gap-2">
                <span :class="statusBadgeClass" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border">
                  <component :is="statusIcon" size="14" />
                  {{ connectionLabel }}
                </span>
                <span v-if="roomMode === 'temporary'" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-sky-200 text-sky-700 bg-sky-50 dark:border-sky-900/50 dark:text-sky-300 dark:bg-sky-900/20">
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
                <button type="button" @click="openJoinRoomModal" class="inline-flex items-center gap-1.5 rounded-full border border-sky-300/70 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-500/20 dark:border-sky-700/70 dark:text-sky-300">
                  <IconDoorEnter size="14" />
                  切换/加入房间
                </button>
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
                <div class="mobile-glass-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-xs uppercase tracking-[0.24em] text-slate-400">当前房间</p>
                      <p class="mt-1 text-sm font-mono font-semibold tracking-[0.2em] text-slate-900 dark:text-white">{{ displayRoomId }}</p>
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

                <div class="mobile-glass-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-[0.24em] text-slate-400">自动销毁</p>
                      <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{{ remainingText }}</p>
                    </div>
                    <select v-model.number="roomTtlMinutes" @change="syncRoomSettings" class="mobile-glass-inset rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500">
                      <option v-for="option in ttlOptions" :key="option" :value="option">{{ option === 0 ? '永不销毁' : `${option} 分钟` }}</option>
                    </select>
                  </div>
                  <p class="mt-3 text-xs text-slate-500">房间无活动后自动清空，避免持久化隐私残留。</p>
                </div>

                <div class="mobile-glass-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-[0.24em] text-slate-400">外部访问地址</p>
                      <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white break-all">{{ shareOrigin }}</p>
                    </div>
                    <button type="button" @click="resetShareOrigin" class="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-sky-600 transition-colors hover:bg-slate-50 hover:text-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800">
                      <IconRefresh size="14" />
                      恢复默认
                    </button>
                  </div>
                   <input v-model="shareOriginDraft" type="text" placeholder="http://192.168.1.10:5173 或 https://your-domain.com" class="mobile-glass-inset mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500" />
                  <p class="mt-3 text-xs leading-5" :class="shareOriginHintClass">{{ shareOriginHint }}</p>
                </div>
              </div>
            </div>

            <div class="mobile-glass-card w-full xl:w-72 shrink-0 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/75 p-4 shadow-lg">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.24em] text-slate-400">房间二维码</p>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">手机扫码直接进入同一房间</p>
                </div>
                <div class="flex items-center gap-2">
                <button type="button" @click="refreshQr" class="text-xs font-medium text-sky-600 hover:text-sky-500 inline-flex items-center gap-1">
                  <IconRefresh size="14" /> 刷新
                </button>
                <button type="button" @click="destroyRoomAndExit" class="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-900/30">
                  <IconDoorExit size="14" />
                  退出并销毁
                </button>
                </div>
              </div>

              <div class="mt-4 rounded-2xl bg-white p-3 flex items-center justify-center border border-slate-200">
                <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="房间二维码" class="w-44 h-44 object-contain" />
                <div v-else class="w-44 h-44 rounded-2xl flex items-center justify-center text-slate-400 text-sm">生成中...</div>
              </div>

              <div class="mt-4">
                <button type="button" @click="clearRoom" class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-900/15 dark:text-rose-300 transition-colors">
                  <IconTrash size="16" />
                  清空房间
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="mobile-glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl px-5 py-4 shadow-xl">
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
            <span class="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-300">
              <IconClockHour4 size="14" />
              {{ remainingText }}
            </span>
            <button type="button" @click="openJoinRoomModal" class="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-300 dark:hover:bg-sky-900/40">
              <IconDoorEnter size="14" />
              切换/加入
            </button>
          </div>
          <span class="text-xs text-slate-500 dark:text-slate-400">点击房间号复制链接</span>
        </div>
      </section>

      <div class="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section class="space-y-6">
          <div class="mobile-glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl p-5 shadow-xl">
            <div class="flex items-center gap-2 mb-4">
              <IconFileText size="18" class="text-sky-600" />
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">文本同步</h2>
            </div>

            <textarea v-model="textDraft" :disabled="isInputDisabled" @paste="handleTextPaste" @keydown.ctrl.enter.prevent="sendTextNow" @keydown.meta.enter.prevent="sendTextNow" rows="8" placeholder="在这里输入内容，点击“立即同步”或按 Ctrl/Cmd + Enter 发送。" class="mobile-glass-inset w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-sky-500 resize-none disabled:cursor-not-allowed disabled:opacity-50" />

            <div class="mt-3 flex flex-wrap gap-2">
              <button type="button" :disabled="isInputDisabled" @click="sendTextNow" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                <IconSend size="16" />
                立即同步
              </button>
              <button type="button" @click="clearTextDraft" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <IconTrash size="16" />
                清空草稿
              </button>
            </div>
          </div>

          <div class="mobile-glass-card rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-950/50 p-5 transition-colors" :class="dragging ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-900/15' : ''" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="handleDrop">
            <div class="flex items-center gap-2 mb-3">
              <IconUpload size="18" class="text-sky-600" />
              <h3 class="text-base font-bold text-slate-900 dark:text-white">拖拽 / 粘贴图片与文件</h3>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-6">支持截图粘贴、图片拖拽、文件拖拽。小图片直接内联同步，大文件自动走临时链接广播。</p>
            <p class="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">支持图片及常用文档，单文件最大 50MB</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <button type="button" :disabled="uploading || isInputDisabled" @click="triggerFilePick" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                <IconPhoto size="16" />
                {{ uploading ? '传输中...' : '选择图片/文件' }}
              </button>
              <input ref="fileInputRef" type="file" multiple class="hidden" @change="handleFileSelect" />
            </div>
          </div>
        </section>

        <section class="space-y-4">
          <div class="mobile-glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl p-5 shadow-xl flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

          <div v-if="!sortedClips.length" class="mobile-glass-card rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-950/50 p-10 text-center text-slate-500 dark:text-slate-400">
            还没有任何内容。先在左侧输入文本，或者直接粘贴截图/拖拽文件试试。
          </div>

          <transition-group name="mobile-card" tag="div" class="space-y-4 clipboard-scroll-list">
            <article v-for="clip in sortedClips" :key="clip.id" class="mobile-glass-card relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl p-5 shadow-xl">
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
                    <div class=" rounded-full bg-sky-400 transition-[width] duration-150" :class="clip.transferStatus === 'failed' ? 'bg-rose-400' : ''" :style="{ width: `${clip.transferProgress || 0}%` }"></div>
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
                 <div v-if="clip.kind === 'text'" class="mobile-glass-inset rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4">
                  <pre class="whitespace-pre-wrap break-words text-sm leading-7 text-slate-900 dark:text-slate-100 font-mono">{{ clip.text }}</pre>
                </div>

                <div v-else-if="clip.kind === 'image'" class="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] items-start">
                   <div class="mobile-glass-inset rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                    <img :src="clip.localPreviewUrl || clip.dataUrl || getAbsoluteUrl(clip.previewUrl) || ''" alt="图片预览" class="w-full h-auto object-contain" @error="loadProtectedImagePreview(clip)" />
                  </div>
                  <div class="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                    <p class="break-all">文件名：{{ displayFileName(clip.fileName, 'image.png') }}</p>
                    <p>尺寸：{{ formatBytes(clip.size) }}</p>
                    <p>类型：{{ clip.mimeType || 'image/*' }}</p>
                  </div>
                </div>

                 <div v-else class="mobile-glass-inset rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4">
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
          </transition-group>
        </section>
      </div>
    </div>

    <div class="fixed right-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-[9999] space-y-2 w-[min(92vw,360px)] pointer-events-none">
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

    <div class="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-50 w-[min(92vw,320px)]">
      <section v-if="devicesPanelOpen" class="mb-2 rounded-2xl border border-slate-200 bg-white/95 p-3 text-slate-900 shadow-2xl shadow-slate-900/15 backdrop-blur-md dark:border-slate-700 dark:bg-slate-950/95 dark:text-white" @click.stop>
        <div class="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <IconUsers class="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            <h2 class="text-sm font-semibold">在线设备</h2>
          </div>
          <button type="button" @click="devicesPanelOpen = false" class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="收起在线设备面板">
            <IconX size="16" />
          </button>
        </div>
        <div class="mt-3 space-y-2">
          <div v-for="device in onlineDevices" :key="device.id" class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
            <component :is="device.deviceType === 'Mobile' ? IconDeviceMobile : IconDeviceDesktop" class="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                {{ device.ip }} · {{ device.location }}
              </p>
              <p class="mt-0.5 truncate text-[0.625rem] text-slate-500 dark:text-slate-400">服务器观测公网出口 IP · 归属地为近似 GeoIP</p>
              <p v-if="device.isSelf" class="mt-0.5 text-[0.6875rem] text-emerald-700 dark:text-emerald-300">当前设备（本机）</p>
            </div>
            <button v-if="isHost && !device.isSelf" type="button" @click="kickDevice(device)" class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-rose-300 hover:bg-rose-950/60 hover:text-rose-200" aria-label="踢出设备" title="踢出设备">
              <IconUserMinus size="16" />
            </button>
          </div>
          <p v-if="!onlineDevices.length" class="py-3 text-center text-xs text-slate-500">暂无设备信息</p>
        </div>
      </section>
      <button type="button" @click="devicesPanelOpen = !devicesPanelOpen" class="ml-auto inline-flex items-center gap-2 rounded-full border border-emerald-300/50 bg-white/90 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-xl shadow-slate-900/10 backdrop-blur-md hover:bg-emerald-50 dark:border-emerald-300/30 dark:bg-slate-950/90 dark:text-emerald-200 dark:hover:bg-slate-900">
        <span class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
        {{ onlineDevices.length }} 台设备在线
      </button>
    </div>

    <div v-if="roomLockOpen" class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-slate-950/70" @click.self="roomLockOpen = false">
      <section class="w-full max-w-sm rounded-3xl border border-rose-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-rose-400/40 dark:bg-gradient-to-br dark:from-slate-950 dark:via-rose-950/80 dark:to-slate-950 dark:text-white">
        <div class="flex items-start gap-3">
          <IconShieldX class="mt-0.5 h-6 w-6 shrink-0 text-rose-300" />
          <div>
            <h2 class="text-lg font-bold">您已被房主移出房间</h2>
            <p class="mt-2 text-sm leading-6 text-rose-700/80 dark:text-rose-100/80">原房间连接已断开，{{ roomResetCountdown }} 秒后将自动创建您的独立 Host 房间。</p>
          </div>
        </div>
        <button type="button" @click="roomLockOpen = false" class="mt-5 w-full rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-300/30 dark:text-rose-100 dark:hover:bg-rose-400/10">知道了</button>
      </section>
    </div>

    <div v-if="joinRoomOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-slate-950/70" @click.self="closeJoinRoomModal">
      <section class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-950/95 dark:text-white">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Room switch</p>
            <h2 class="mt-1 text-xl font-bold">切换 / 加入房间</h2>
          </div>
          <button type="button" @click="closeJoinRoomModal" class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="关闭加入房间弹窗">
            <IconX size="18" />
          </button>
        </div>
        <p class="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-sm leading-6 text-amber-900 dark:text-amber-100">切换房间将断开当前连接，当前房间的本地列表也会被清空。</p>
        <label class="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
          房间码
          <input v-model="joinRoomDraft" @input="joinRoomDraft = normalizeRoomIdInput(joinRoomDraft)" maxlength="24" autocomplete="off" placeholder="输入房间码" class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm uppercase tracking-[0.18em] text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        </label>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" @click="closeJoinRoomModal" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">取消</button>
          <button type="button" :disabled="joiningRoom" @click="submitJoinRoom" class="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50">
            <IconLoader2 v-if="joiningRoom" class="h-4 w-4 animate-spin" />
            立即加入
          </button>
        </div>
      </section>
    </div>

    <div v-if="textPreview.open" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-slate-950/70" @click.self="closeTextPreview">
      <section class="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-white">
        <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div class="min-w-0">
            <h2 class="truncate text-base font-bold">{{ textPreview.fileName }}</h2>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">文本文件预览</p>
          </div>
          <button type="button" @click="closeTextPreview" aria-label="关闭文本预览" title="关闭" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
            <IconX size="18" />
          </button>
        </div>
        <div class="min-h-0 overflow-auto p-5">
          <div v-if="textPreview.loading" class="py-12 text-center text-sm text-slate-400">正在读取文件...</div>
          <div v-else-if="textPreview.error" class="rounded-2xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-300">{{ textPreview.error }}</div>
          <pre v-else class="whitespace-pre-wrap break-words rounded-2xl bg-slate-100 p-4 text-sm leading-7 text-slate-800 dark:bg-slate-900 dark:text-slate-200">{{ textPreview.content }}</pre>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import QRCode from 'qrcode';
import { io } from 'socket.io-client';
import { apiConfig } from '../../config/api';
import { saveBlob } from '../../lib/download';
import BackButton from '../../components/BackButton.vue';
import {
  IconAlertTriangle,
  IconCheck,
  IconClipboardText,
  IconClockHour4,
  IconCopy,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDoorEnter,
  IconDoorExit,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconFile,
  IconFileText,
  IconLoader2,
  IconPhoto,
  IconRefresh,
  IconSend,
  IconShieldX,
  IconTrash,
  IconUserMinus,
  IconUsers,
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
const ROOM_STATE_STORAGE_KEY = 'prohub-clipboard-room-state';
const shareOriginDraft = ref(defaultShareOrigin);
const ttlOptions = [0, 5, 10, 15, 30, 60];
const maxClips = 20;
const inlineImageThreshold = 750 * 1024;
const imageCompressionThreshold = 1 * 1024 * 1024;
const imageCompressionMaxEdge = 2048;
const imageCompressionQuality = 0.85;
const uploadTimeoutMs = 120000;
const sessionRequestTimeoutMs = 10000;

// #region debug-point A:runtime-report
const debugClipboard = (hypothesisId, msg, data = {}) => fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'clipboard-reconnect', runId: 'pre-fix', hypothesisId, location: 'RealtimeClipboard.vue', msg: `[DEBUG] ${msg}`, data, ts: Date.now() }) }).catch(() => {});
// #endregion
const maxUploadRetries = 2;
const maxFileBytes = 50 * 1024 * 1024;
const maxTextPreviewBytes = 5 * 1024 * 1024;

const roomId = ref('');
const isHost = ref(false);
const role = ref('guest');
const hostToken = ref('');
const roomCodeVisible = ref(false);
const roomTtlMinutes = ref(15);
const roomMode = ref('temporary');
const roomExpiresAt = ref(Date.now() + 15 * 60 * 1000);
const isRoomDestroyed = ref(false);
const isInputDisabled = ref(false);
const roomResetCountdown = ref(5);
const roomResetReason = ref('');
const roomLockOpen = ref(false);
const joinRoomOpen = ref(false);
const joinRoomDraft = ref('');
const joiningRoom = ref(false);
const devicesPanelOpen = ref(false);
const onlineDevices = ref([]);
const clips = shallowRef([]);
const textDraft = ref('');
const qrCodeDataUrl = ref('');
const dragging = ref(false);
const socketState = ref('connecting');
const uploading = ref(false);
const now = ref(Date.now());
const toasts = ref([]);
const fileInputRef = ref(null);
const textPreview = ref({
  open: false,
  loading: false,
  fileName: '',
  content: '',
  error: '',
});

let socketInstance = null;
let ticker = null;
let qrStamp = 0;
let visibilityHandler = null;
let beforeUnloadHandler = null;
let roomResetTimer = null;
let roomRetryTimer = null;
let roomSessionRetryAttempts = 0;
let reconnectAttempts = 0;
let pendingRoomNavigation = null;
const uploadRequests = new Map();
const uploadReaders = new Map();
const uploadRetryTimers = new Map();
const preparingUploads = new Set();
const imagePreviewRequests = new Set();
const failedImagePreviews = new Set();
const cancelledUploads = new Set();
const seenMsgIds = new Set();
const pendingTextMessages = new Map();
const pendingIncomingClips = new Map();
const toastTimers = new Map();
let incomingFrameId = 0;

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
const displayRoomUrl = computed(() => roomUrl.value);
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
  if (roomTtlMinutes.value === 0 || roomMode.value === 'persistent') return '永不销毁';
  if (!roomExpiresAt.value) return '等待同步';
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

function normalizeRoomIdInput(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
}

function getDeviceType() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'Mobile' : 'PC';
}

function getDeviceLocation() {
  return '';
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

function readPersistedRoomState() {
  const storages = [window.sessionStorage, window.localStorage];
  for (const storage of storages) {
    try {
      const value = JSON.parse(storage.getItem(ROOM_STATE_STORAGE_KEY) || 'null');
      if (value?.roomId) return value;
    } catch {
      continue;
    }
  }
  return null;
}

function persistRoomState(nextRoomId, nextRole) {
  const value = {
    roomId: normalizeRoomId(nextRoomId),
    role: nextRole === 'host' ? 'host' : 'guest',
    updatedAt: Date.now(),
  };
  if (!value.roomId) return;
  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      storage.setItem(ROOM_STATE_STORAGE_KEY, JSON.stringify(value));
    } catch {
      continue;
    }
  }
}

function clearRoomSessionRetry({ resetAttempts = true } = {}) {
  if (roomRetryTimer) {
    window.clearTimeout(roomRetryTimer);
    roomRetryTimer = null;
  }
  if (resetAttempts) roomSessionRetryAttempts = 0;
}

async function requestRoomSession(nextRoomId, intent = 'join', { forceGuest = false } = {}) {
  debugClipboard('A', 'room session request', { roomId: normalizeRoomId(nextRoomId), intent, forceGuest, role: role.value, hasHostToken: Boolean(hostToken.value), persisted: readPersistedRoomState() });
  const normalizedRoomId = normalizeRoomId(nextRoomId);
  if (!normalizedRoomId) throw new Error('房间号无效');
  const shouldCreate = intent === 'create' && !forceGuest;
  if (shouldCreate) {
    role.value = 'host';
    isHost.value = true;
    persistRoomState(normalizedRoomId, 'host');
  }

  const sessionAbortController = new AbortController();
  const sessionTimeoutId = window.setTimeout(() => sessionAbortController.abort(), sessionRequestTimeoutMs);
  let response;
  try {
    response = await fetch(apiConfig.baseURL + apiConfig.endpoints.clipboardRoomSession, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: sessionAbortController.signal,
      body: JSON.stringify({
        roomId: normalizedRoomId,
        intent,
        hostToken: forceGuest ? '' : readHostToken(normalizedRoomId),
        ttlMinutes: roomTtlMinutes.value,
      }),
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('房间服务响应超时');
    }
    throw error;
  } finally {
    window.clearTimeout(sessionTimeoutId);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || `房间身份确认失败（HTTP ${response.status}）`);
  }

  roomId.value = normalizedRoomId;
    debugClipboard('A', 'room session success', { roomId: normalizedRoomId, role: data.role, hasHostToken: Boolean(data.hostToken) });
  const confirmedHost = !forceGuest && data.role === 'host' && Boolean(data.hostToken);
  isHost.value = confirmedHost;
  role.value = confirmedHost ? 'host' : 'guest';
  hostToken.value = confirmedHost ? String(data.hostToken) : '';
  if (isHost.value && hostToken.value) {
    rememberHostToken(normalizedRoomId, hostToken.value);
  } else if (!isHost.value) {
    forgetHostToken(normalizedRoomId);
  }
  persistRoomState(normalizedRoomId, role.value);
  syncRoomMeta(data.room);
  syncRoomConfig(data.config);
  return data;
}

function showToast(type, title, message) {
  const id = createMessageId();
  toasts.value.unshift({ id, type, title, message });
  const timerId = window.setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
    toastTimers.delete(id);
  }, 2600);
  toastTimers.set(id, timerId);
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

function upsertClip(clip, { markSeen = true } = {}) {
  if (!clip) return { added: false, completed: false };
  const key = clipMessageKey(clip);
  if (!key) return { added: false, completed: false };
  const index = clips.value.findIndex((item) => clipMessageKey(item) === key || item.id === clip.id);
  const previous = index >= 0 ? clips.value[index] : null;
  if (index < 0 && markSeen && seenMsgIds.has(key)) {
    return { added: false, completed: false };
  }
  const nextClip = {
    ...clip,
    ...(index >= 0 && previous?.localPreviewUrl && !clip.localPreviewUrl ? { localPreviewUrl: previous.localPreviewUrl } : {}),
    transferStatus: clip.transferStatus || 'complete',
    transferProgress: clip.transferProgress ?? 100,
  };
  if (previous?.localPreviewUrl && previous.localPreviewUrl !== nextClip.localPreviewUrl) {
    URL.revokeObjectURL(previous.localPreviewUrl);
  }
  if (markSeen) seenMsgIds.add(key);
  if (index >= 0) {
    clips.value = clips.value.map((item, itemIndex) => (itemIndex === index ? nextClip : item));
    return { added: false, completed: previous?.transferStatus === 'uploading' };
  }
  clips.value = [nextClip, ...clips.value];
  return { added: true, completed: false };
}

function replaceInitialClips(incomingClips) {
  const nextClips = Array.isArray(incomingClips) ? incomingClips.filter(Boolean) : [];
  const incomingKeys = new Set(nextClips.map((clip) => clipMessageKey(clip)));
  const pendingUploads = clips.value.filter((item) => (
    (item.transferStatus === 'uploading' || item.transferStatus === 'failed')
    && !incomingKeys.has(clipMessageKey(item))
  ));
  nextClips.forEach((clip) => seenMsgIds.add(clipMessageKey(clip)));
  clips.value = [...nextClips, ...pendingUploads];
}

function updateUploadCard(msgId, patch) {
  const index = clips.value.findIndex((clip) => clip.msgId === msgId);
  if (index >= 0) {
    clips.value = clips.value.map((clip, clipIndex) => (
      clipIndex === index ? { ...clip, ...patch } : clip
    ));
  }
}

function updateClipByKey(clip, patch) {
  const key = clipMessageKey(clip);
  const index = clips.value.findIndex((item) => clipMessageKey(item) === key || item.id === clip.id);
  if (index >= 0) {
    clips.value = clips.value.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    ));
  }
}

async function loadProtectedImagePreview(clip) {
  if (!clip || clip.kind !== 'image' || clip.localPreviewUrl || clip.dataUrl || !clip.previewUrl) return;
  const key = clipMessageKey(clip);
  if (!key || imagePreviewRequests.has(key) || failedImagePreviews.has(key)) return;
  imagePreviewRequests.add(key);
  try {
    const blob = await getClipBlob(clip);
    const localPreviewUrl = URL.createObjectURL(blob);
    const current = clips.value.find((item) => clipMessageKey(item) === key);
    if (current?.localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      return;
    }
    if (current) updateClipByKey(current, { localPreviewUrl });
    else URL.revokeObjectURL(localPreviewUrl);
  } catch {
    failedImagePreviews.add(key);
  } finally {
    imagePreviewRequests.delete(key);
  }
}

function scheduleIncomingClip(clip) {
  const key = clipMessageKey(clip);
  if (!key || seenMsgIds.has(key)) return;
  seenMsgIds.add(key);
  pendingIncomingClips.set(key, clip);
  if (incomingFrameId) return;

  incomingFrameId = window.requestAnimationFrame(() => {
    incomingFrameId = 0;
    const batch = Array.from(pendingIncomingClips.values());
    pendingIncomingClips.clear();
    batch.forEach((incomingClip) => {
      const incomingKey = clipMessageKey(incomingClip);
      if (!incomingKey) return;
      const result = upsertClip(incomingClip, { markSeen: false });
      if (result.added || result.completed) {
        showToast('success', '收到同步', clipTypeLabel(incomingClip) + ' 已同步到房间。');
      }
    });
  });
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
  clips.value = [localClip, ...clips.value];
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

function hasDownload(clip) {
  return Boolean(clip.downloadUrl || clip.dataUrl || clip.previewUrl);
}

function getAbsoluteUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return window.location.origin + url;
}

function syncOnlineDevices(payload) {
  const devices = Array.isArray(payload?.devices) ? payload.devices : [];
  onlineDevices.value = devices.map((device) => ({
    id: String(device.id || device.connectionId || device.clientId || ''),
    clientId: String(device.clientId || ''),
    ip: String(device.ip || '未知 IP'),
    location: String(device.location || '未知地区'),
    isSelf: Boolean(device.isSelf) || String(device.clientId || '') === selfClientId || String(device.id || '') === String(socketInstance?.id || ''),
    deviceType: device.deviceType === 'Mobile' ? 'Mobile' : 'PC',
  })).filter((device) => device.id);
}

function joinSocketRoom() {
  if (!socketInstance) return;
  socketInstance.emit('room:join', {
    roomId: roomId.value,
    ttlMinutes: roomTtlMinutes.value,
    hostToken: hostToken.value,
    deviceType: getDeviceType(),
    deviceLocation: getDeviceLocation(),
  }, (response) => {
    if (!response?.ok) {
      handleRoomJoinFailure(response?.error || '无法加入当前房间');
      return;
    }
    if (response.role) {
      role.value = response.role === 'host' ? 'host' : 'guest';
      isHost.value = role.value === 'host';
    }
    replaceInitialClips(response.clips || []);
    syncRoomMeta(response.room);
    syncRoomConfig(response.config);
    syncOnlineDevices({ devices: response.devices || [] });
  });
}

function isTransientRoomError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('failed to fetch')
    || message.includes('networkerror')
    || message.includes('load failed')
    || message.includes('timeout')
    || message.includes('响应超时')
    || message.includes('房间不存在')
    || message.includes('room_not_found')
    || message.includes('信令服务');
}

function handleRoomJoinFailure(message) {
  const errorMessage = String(message || '无法加入当前房间');
  if (errorMessage === 'ROOM_NOT_FOUND' || errorMessage.includes('房间不存在')) {
    const wasHost = isHost.value || role.value === 'host' || Boolean(hostToken.value) || Boolean(readHostToken(roomId.value));
    const requestedSession = wasHost
      ? { roomId: roomId.value, intent: 'create', forceGuest: false }
      : { roomId: roomId.value, intent: 'join', forceGuest: true };
    disconnectSocket();
    socketState.value = 'reconnecting';
    showToast('info', '正在恢复房间', isHost.value ? '房间服务已重启，正在恢复房主身份。' : '正在等待原房主重新上线。');
    if (requestedSession.intent === 'create') {
      void requestRoomSession(roomId.value, 'create', { forceGuest: false })
        .then(() => {
          connectSocket();
          return refreshQr();
        })
        .catch(() => {
          scheduleRoomSessionRetry(roomId.value, requestedSession, roomSessionRequestId);
        });
    } else {
      scheduleRoomSessionRetry(roomId.value, requestedSession, roomSessionRequestId);
    }
    return;
  }
  showToast('error', '加入房间失败', errorMessage);
}

function connectSocket() {
  debugClipboard('B', 'connect socket', { roomId: roomId.value, clientId: selfClientId, hasHostToken: Boolean(hostToken.value), role: role.value });
  disconnectSocket();
  if (!roomId.value) return;

  socketState.value = 'connecting';
  socketInstance = io(socketBaseUrl, {
    query: {
      roomId: roomId.value,
      clientId: selfClientId,
      hostToken: hostToken.value,
      deviceType: getDeviceType(),
      deviceLocation: getDeviceLocation(),
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelayMax: 4000,
    timeout: 15000,
  });

  socketInstance.on('connect', () => {
    debugClipboard('B', 'socket connected', { roomId: roomId.value, socketId: socketInstance?.id });
    socketState.value = 'connected';
    joinSocketRoom();
  });

  socketInstance.on('disconnect', (reason) => {
    debugClipboard('B', 'socket disconnected', { reason, roomId: roomId.value });
    socketState.value = 'offline';
  });

  socketInstance.io.on('reconnect_attempt', (attempt) => {
    debugClipboard('B', 'socket reconnect attempt', { attempt, roomId: roomId.value });
    socketState.value = 'reconnecting';
  });

  socketInstance.io.on('reconnect', () => {
    socketState.value = 'connected';
    joinSocketRoom();
    showToast('success', '连接已恢复', '房间已自动重新加入。');
  });

  socketInstance.on('connect_error', (error) => {
    debugClipboard('D', 'socket connect error', { message: error?.message, description: error?.description, context: error?.context, roomId: roomId.value, clientId: selfClientId, hasHostToken: Boolean(hostToken.value) });
    socketState.value = 'offline';
    showToast('error', '连接失败', error.message || 'Socket 连接失败');
  });

  socketInstance.on('clip:init', (payload) => {
    replaceInitialClips(payload?.clips || []);
    syncRoomMeta(payload?.room);
    syncOnlineDevices(payload);
  });

  socketInstance.on('SYNC_HISTORY_STATE', (payload) => {
    replaceInitialClips(payload?.list || []);
    syncRoomMeta(payload?.room);
  });

  socketInstance.on('ROOM_CONFIG_SYNC', (payload) => {
    syncRoomConfig(payload);
  });

  socketInstance.on('ONLINE_DEVICES_CHANGE', (payload) => {
    syncOnlineDevices(payload);
  });

  socketInstance.on('HOST_DISCONNECTED', (payload) => {
    handleHostDisconnected(payload);
  });

  socketInstance.on('KICK_DEVICE', (payload) => {
    handleKickSignal(payload);
  });

  socketInstance.on('clip:sync', (payload) => {
    syncRoomMeta(payload?.room);
    if (payload?.clip) {
      scheduleIncomingClip(payload.clip);
    }
  });

  socketInstance.on('clip:delete', (payload) => {
    const removedClip = clips.value.find((item) => item.id === payload?.clipId);
    if (removedClip?.localPreviewUrl) URL.revokeObjectURL(removedClip.localPreviewUrl);
    clips.value = clips.value.filter((item) => item.id !== payload?.clipId);
    syncRoomMeta(payload?.room);
  });

  socketInstance.on('room:settings', (payload) => {
    syncRoomMeta(payload);
  });

  socketInstance.on('room:cleared', (payload) => {
    releaseLocalPreviewUrls(clips.value);
    clips.value = [];
    syncRoomMeta(payload?.room);
    showToast('success', '房间已清空', payload?.reason === 'expired' ? '因长时间无活动自动销毁。' : '房间已手动清空。');
  });
}

function disconnectSocket() {
  const activeSocket = socketInstance;
  socketInstance = null;
  if (!activeSocket) return;
  activeSocket.removeAllListeners();
  activeSocket.disconnect();
}

function destroyHostRoomOnRouteLeave() {
  const activeSocket = socketInstance;
  if (!isHost.value || !activeSocket || !roomId.value || !hostToken.value) return Promise.resolve();
  const payload = { roomId: roomId.value, hostToken: hostToken.value };
  debugClipboard('A', 'host route leave destroys room', { roomId: roomId.value });
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    activeSocket.emit('room:destroy', payload, finish);
    window.setTimeout(finish, 500);
  });
}

function releaseLocalPreviewUrls(items) {
  for (const item of items || []) {
    if (item?.localPreviewUrl) {
      URL.revokeObjectURL(item.localPreviewUrl);
    }
  }
}

function clearRoomResetTimer() {
  if (roomResetTimer) {
    window.clearInterval(roomResetTimer);
    roomResetTimer = null;
  }
}

function cleanupCurrentRoomConnections({ clearRoomData = true, clearResetTimer = true } = {}) {
  clearRoomSessionRetry();
  if (clearResetTimer) clearRoomResetTimer();
  if (ticker) {
    window.clearInterval(ticker);
    ticker = null;
  }
  if (qrStamp) {
    window.clearTimeout(qrStamp);
    qrStamp = 0;
  }
  if (incomingFrameId) {
    window.cancelAnimationFrame(incomingFrameId);
    incomingFrameId = 0;
  }
  pendingIncomingClips.clear();
  seenMsgIds.clear();
  pendingTextMessages.clear();
  for (const reader of uploadReaders.values()) {
    if (reader.readyState === FileReader.LOADING) reader.abort();
  }
  for (const request of uploadRequests.values()) {
    request.abort();
  }
  for (const timer of uploadRetryTimers.values()) {
    window.clearTimeout(timer);
  }
  uploadReaders.clear();
  uploadRequests.clear();
  uploadRetryTimers.clear();
  imagePreviewRequests.clear();
  failedImagePreviews.clear();
  preparingUploads.clear();
  cancelledUploads.clear();
  disconnectSocket();
  onlineDevices.value = [];
  if (clearRoomData) {
    releaseLocalPreviewUrls(clips.value);
    clips.value = [];
    textDraft.value = '';
    qrCodeDataUrl.value = '';
  }
}

function openJoinRoomModal() {
  joinRoomDraft.value = '';
  joinRoomOpen.value = true;
}

function closeJoinRoomModal() {
  if (!joiningRoom.value) joinRoomOpen.value = false;
}

async function submitJoinRoom() {
  const targetRoomId = normalizeRoomId(joinRoomDraft.value);
  if (!targetRoomId) {
    showToast('error', '房间码无效', '请输入至少 4 位房间码。');
    return;
  }
  if (targetRoomId === roomId.value) {
    closeJoinRoomModal();
    return;
  }
  joiningRoom.value = true;
  cleanupCurrentRoomConnections();
  isHost.value = false;
  role.value = 'guest';
  hostToken.value = '';
  isRoomDestroyed.value = false;
  isInputDisabled.value = false;
  pendingRoomNavigation = { roomId: targetRoomId, intent: 'join', forceGuest: true };
  joinRoomOpen.value = false;
  try {
    await router.replace({ name: 'RealtimeClipboard', params: { roomId: targetRoomId } });
  } catch (error) {
    pendingRoomNavigation = null;
    showToast('error', '切换失败', error?.message || '无法切换房间。');
  } finally {
    joiningRoom.value = false;
  }
}

async function startIndependentHostRoom() {
  cleanupCurrentRoomConnections();
  roomLockOpen.value = false;
  isRoomDestroyed.value = false;
  isInputDisabled.value = false;
  roomResetCountdown.value = 5;
  const nextRoomId = generateRoomId();
  role.value = 'host';
  isHost.value = true;
  hostToken.value = '';
  reconnectAttempts = 0;
  roomSessionRetryAttempts = 0;
  persistRoomState(nextRoomId, 'host');
  pendingRoomNavigation = { roomId: nextRoomId, intent: 'create', forceGuest: false };
  try {
    await router.replace({ name: 'RealtimeClipboard', params: { roomId: nextRoomId } });
  } catch (error) {
    pendingRoomNavigation = null;
    showToast('error', '新房间创建失败', error?.message || '无法创建独立 Host 房间。');
  }
}

function startRoomResetCountdown(reason, { openLock = false } = {}) {
  clearRoomResetTimer();
  cleanupCurrentRoomConnections({ clearRoomData: true, clearResetTimer: false });
  isRoomDestroyed.value = true;
  isInputDisabled.value = true;
  roomResetReason.value = reason;
  roomResetCountdown.value = 5;
  roomLockOpen.value = openLock;
  roomResetTimer = window.setInterval(() => {
    roomResetCountdown.value -= 1;
    if (roomResetCountdown.value > 0) return;
    clearRoomResetTimer();
    void startIndependentHostRoom();
  }, 1000);
}

function handleHostDisconnected(payload = {}) {
  if (isHost.value || role.value === 'host') return;
  startRoomResetCountdown(payload.reason || 'Host 已退出，房间已被销毁');
  showToast('error', '房间已销毁', '当前 Host 已退出，5 秒后将自动创建独立房间。');
}

function handleKickSignal(payload = {}) {
  const targetClientId = String(payload.targetClientId || payload.clientId || '');
  if (targetClientId && targetClientId !== selfClientId) return;
  startRoomResetCountdown('您已被房主移出房间', { openLock: true });
  showToast('error', '已被移出房间', '5 秒后将自动创建您的独立 Host 房间。');
}

function kickDevice(device) {
  if (!isHost.value || !socketInstance || !device?.id) return;
  socketInstance.emit('room:kick-device', {
    roomId: roomId.value,
    hostToken: hostToken.value,
    targetDeviceId: device.clientId || device.id,
  }, (response) => {
    if (!response?.ok) {
      showToast('error', '踢出失败', response?.error || '无法移除该设备。');
      return;
    }
    syncOnlineDevices({ devices: response.devices || [] });
    showToast('success', '设备已移除', '目标设备已断开房间连接。');
  });
}

function destroyRoomAndExit() {
  if (!isHost.value || !socketInstance) return;
  socketInstance.emit('room:destroy', {
    roomId: roomId.value,
    hostToken: hostToken.value,
  }, (response) => {
    if (!response?.ok) {
      showToast('error', '销毁失败', response?.error || '无法销毁当前房间。');
      return;
    }
    showToast('success', '房间已销毁', '正在为本机创建新的独立房间。');
    void startIndependentHostRoom();
  });
}

function syncRoomSettings() {
  if (!socketInstance || !isHost.value) return;
  socketInstance.emit('room:update-settings', {
    roomId: roomId.value,
    ttlMinutes: roomTtlMinutes.value,
    mode: roomTtlMinutes.value === 0 ? 'persistent' : 'temporary',
    hostToken: hostToken.value,
  }, (response) => {
    if (!response?.ok) {
      showToast('error', '设置同步失败', response?.error || '房间设置更新失败');
      return;
    }
    syncRoomMeta(response.room);
    syncRoomConfig(response.config);
  });
}

function clearTextDraft() {
  textDraft.value = '';
}

function sendTextNow() {
  if (isInputDisabled.value || isRoomDestroyed.value) {
    showToast('error', '房间已锁定', '当前房间已销毁，暂时不能发送内容。');
    return;
  }
  const text = textDraft.value.trim();
  if (!text) {
    showToast('error', '内容为空', '请输入一点文本再同步。');
    return;
  }
  if (!socketInstance) {
    showToast('error', '尚未连接', '请等待房间连接成功后再同步。');
    return;
  }
  if (Array.from(pendingTextMessages.values()).includes(text)) return;

  const msgId = createMessageId();
  pendingTextMessages.set(msgId, text);
  socketInstance.emit('clip:send', {
    roomId: roomId.value,
    kind: 'text',
    msgId,
    clientId: selfClientId,
    text,
    ttlMinutes: roomTtlMinutes.value,
  }, (response) => {
    pendingTextMessages.delete(msgId);
    if (!response?.ok) {
      showToast('error', '同步失败', response?.error || '文本发送失败');
      return;
    }
    if (response.room) syncRoomMeta(response.room);
    if (textDraft.value.trim() === text) textDraft.value = '';
  });
}

function isCompressibleImage(file) {
  const mimeType = String(file?.type || '').toLowerCase();
  const fileName = String(file?.name || '').toLowerCase();
  return mimeType === 'image/jpeg'
    || mimeType === 'image/jpg'
    || mimeType === 'image/png'
    || /\.(jpe?g|png)$/.test(fileName);
}

function replaceFileExtension(fileName, extension) {
  const sourceName = String(fileName || 'image');
  const baseName = sourceName.replace(/\.[^.]+$/, '') || 'image';
  return `${baseName}.${extension}`;
}

function loadImageForCompression(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片解码失败'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('图片压缩失败'));
    }, mimeType, quality);
  });
}

async function prepareImageForUpload(file, msgId) {
  const mimeType = String(file?.type || '').toLowerCase();
  if (!mimeType.startsWith('image/') || file.size <= imageCompressionThreshold || !isCompressibleImage(file)) {
    return file;
  }

  updateUploadCard(msgId, { transferProgress: 5 });
  const image = await loadImageForCompression(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) {
    updateUploadCard(msgId, { transferProgress: 0 });
    return file;
  }

  updateUploadCard(msgId, { transferProgress: 18 });
  const scale = Math.min(1, imageCompressionMaxEdge / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    updateUploadCard(msgId, { transferProgress: 0 });
    return file;
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const outputType = mimeType === 'image/png' ? 'image/webp' : 'image/jpeg';
  const outputExtension = outputType === 'image/webp' ? 'webp' : 'jpg';
  const blob = await canvasToBlob(canvas, outputType, imageCompressionQuality);
  if (!blob || blob.size >= file.size) {
    updateUploadCard(msgId, { transferProgress: 0 });
    return file;
  }

  const compressedFile = new File([blob], replaceFileExtension(file.name, outputExtension), {
    type: outputType,
    lastModified: file.lastModified || Date.now(),
  });
  const previousClip = clips.value.find((clip) => clip.msgId === msgId);
  if (previousClip?.localPreviewUrl) URL.revokeObjectURL(previousClip.localPreviewUrl);
  updateUploadCard(msgId, {
    fileName: compressedFile.name,
    mimeType: compressedFile.type,
    size: compressedFile.size,
    localPreviewUrl: URL.createObjectURL(compressedFile),
    transferProgress: 45,
  });
  return compressedFile;
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

function uploadFileWithProgress(file, msgId, attempt = 0, progressStart = 0) {
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
    request.setRequestHeader('x-room-id', roomId.value);
    request.setRequestHeader('x-client-id', selfClientId);
    request.setRequestHeader('x-host-token', hostToken.value || '');
    request.timeout = uploadTimeoutMs;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = progressStart + Math.round((event.loaded / event.total) * (95 - progressStart));
        updateUploadCard(msgId, { transferProgress: Math.min(95, progress) });
      }
    };
    const cleanupRequest = () => {
      uploadRequests.delete(msgId);
    };
    const retryOrReject = (error) => {
      cleanupRequest();
      if (attempt < maxUploadRetries && !cancelledUploads.has(msgId)) {
        updateUploadCard(msgId, {
          transferProgress: Math.min(95, Math.max(progressStart, 10 + attempt * 5)),
        });
        const retryTimer = window.setTimeout(() => {
          uploadRetryTimers.delete(msgId);
          uploadFileWithProgress(file, msgId, attempt + 1, progressStart).then(resolve, reject);
        }, 700 * (attempt + 1));
        uploadRetryTimers.set(msgId, retryTimer);
        return;
      }
      reject(error);
    };
    request.onerror = () => retryOrReject(new Error('上传连接失败，正在重试'));
    request.ontimeout = () => retryOrReject(new Error('上传超时，正在重试'));
    request.onabort = () => {
      cleanupRequest();
      reject(new Error('已取消传输'));
    };
    request.onload = () => {
      cleanupRequest();
      let responseData = {};
      try {
        responseData = JSON.parse(request.responseText || '{}');
      } catch {
        responseData = {};
      }
      if (request.status < 200 || request.status >= 300) {
        const error = new Error(responseData.message || responseData.error || `上传失败（HTTP ${request.status}）`);
        if (request.status >= 500) {
          retryOrReject(error);
          return;
        }
        reject(error);
        return;
      }
      resolve(responseData);
    };
    try {
      request.send(formData);
    } catch (error) {
      retryOrReject(error);
    }
  });
}

async function deleteUploadedAsset(assetId) {
  if (!assetId || !roomId.value) return;
  try {
    await fetch(`${apiConfig.baseURL}${apiConfig.endpoints.clipboardUpload}/${encodeURIComponent(roomId.value)}/${encodeURIComponent(assetId)}`, {
      method: 'DELETE',
      headers: {
        'x-room-id': roomId.value,
        'x-client-id': selfClientId,
        'x-host-token': hostToken.value || '',
      },
    });
  } catch {
    // Cleanup is best effort; the room TTL still bounds retained assets.
  }
}

function cancelUpload(msgId) {
  cancelledUploads.add(msgId);
  const retryTimer = uploadRetryTimers.get(msgId);
  if (retryTimer) {
    window.clearTimeout(retryTimer);
    uploadRetryTimers.delete(msgId);
  }
  uploadReaders.get(msgId)?.abort();
  uploadRequests.get(msgId)?.abort();
  if (!uploadReaders.has(msgId) && !uploadRequests.has(msgId) && !uploadRetryTimers.has(msgId) && !preparingUploads.has(msgId)) {
    markUploadFailed(msgId, new Error('已取消传输'));
  }
}

async function uploadAndSendFile(file) {
  if (!file) return;
  if (file.size > maxFileBytes) {
    throw new Error(`${file.name} 超过 50MB 单文件限制`);
  }
  const msgId = createUploadCard(file);
  let uploadedAssetId = '';
  preparingUploads.add(msgId);

  try {
    if (!socketInstance) {
      throw new Error('尚未连接到房间，请稍后重试');
    }
    const preparedFile = await prepareImageForUpload(file, msgId);
    preparingUploads.delete(msgId);
    if (cancelledUploads.has(msgId)) throw new Error('已取消传输');
    const wasCompressed = preparedFile !== file;
    let response;
    if (preparedFile.type.startsWith('image/') && preparedFile.size <= inlineImageThreshold) {
      const readProgressStart = wasCompressed ? 45 : 0;
      const readProgressSpan = 90 - readProgressStart;
      const dataUrl = await readFileAsDataUrl(preparedFile, (progress) => updateUploadCard(msgId, {
        transferProgress: Math.min(90, readProgressStart + Math.round((progress / 90) * readProgressSpan)),
      }), msgId);
      if (cancelledUploads.has(msgId)) throw new Error('已取消传输');
      response = await new Promise((resolve, reject) => {
        socketInstance?.emit('clip:send', {
          roomId: roomId.value,
          msgId,
          clientId: selfClientId,
          kind: 'image',
          dataUrl,
          fileName: preparedFile.name,
          mimeType: preparedFile.type,
          size: preparedFile.size,
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
      const uploadData = await uploadFileWithProgress(preparedFile, msgId, 0, wasCompressed ? 45 : 0);
      uploadedAssetId = uploadData?.asset?.assetId || '';
      if (cancelledUploads.has(msgId)) {
        await deleteUploadedAsset(uploadedAssetId);
        throw new Error('已取消传输');
      }
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
    const pendingClip = clips.value.find((clip) => clip.msgId === msgId);
    if (pendingClip?.transferStatus === 'uploading') {
      updateUploadCard(msgId, { transferProgress: 99 });
    }
  } catch (error) {
    preparingUploads.delete(msgId);
    if (uploadedAssetId) await deleteUploadedAsset(uploadedAssetId);
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
    showToast('info', '已粘贴到草稿', '点击“立即同步”后才会发送。');
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
    showToast('info', '已粘贴到草稿', '点击“立即同步”后才会发送。');
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
      const blob = await getClipBlob(clip);
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
  const response = await fetch(url, {
    headers: {
      'x-room-id': roomId.value,
      'x-client-id': selfClientId,
      'x-host-token': hostToken.value || '',
    },
  });
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
    if (blob.size > maxTextPreviewBytes) {
      throw new Error('文本文件超过 5MB，暂不支持在线预览');
    }
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
    const fileName = displayFileName(clip.fileName, clip.kind === 'image' ? 'clipboard-image' : 'clipboard-file');
    // 统一保存逻辑：移动端优先系统分享面板（图片可"存储到相册"），桌面直接下载
    await saveBlob(blob, fileName);
    showToast('success', '保存完成', `${fileName} 已保存或已唤起保存面板。`);
  } catch (error) {
    if (error?.name === 'AbortError') return; // 用户取消分享面板
    showToast('error', '下载失败', error?.message || '无法下载原始文件');
  }
}

function deleteClip(clip) {
  socketInstance?.emit('clip:delete', { roomId: roomId.value, clipId: clip.id }, (response) => {
    if (!response?.ok) {
      showToast('error', '删除失败', response?.error || '删除失败');
      return;
    }
    if (clip.localPreviewUrl) URL.revokeObjectURL(clip.localPreviewUrl);
    imagePreviewRequests.delete(clipMessageKey(clip));
    failedImagePreviews.delete(clipMessageKey(clip));
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
    releaseLocalPreviewUrls(clips.value);
    clips.value = [];
    textDraft.value = '';
    syncRoomMeta(response.room);
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

function refreshCountdownTicker() {
  const shouldRun = roomTtlMinutes.value > 0
    && roomMode.value !== 'persistent'
    && Boolean(roomExpiresAt.value);
  if (!shouldRun) {
    if (ticker) window.clearInterval(ticker);
    ticker = null;
    return;
  }
  if (!ticker) {
    ticker = window.setInterval(() => {
      now.value = Date.now();
    }, 1000);
  }
}

function syncRoomMeta(room) {
  if (!room) return;
  if (Object.prototype.hasOwnProperty.call(room, 'mode')) {
    roomMode.value = room.mode || 'temporary';
  }
  if (Object.prototype.hasOwnProperty.call(room, 'ttlMinutes')) {
    const nextTtl = Number(room.ttlMinutes);
    if (Number.isFinite(nextTtl) && nextTtl >= 0) roomTtlMinutes.value = nextTtl;
  }
  if (Object.prototype.hasOwnProperty.call(room, 'expiresAt')) {
    roomExpiresAt.value = room.expiresAt ? Number(room.expiresAt) : null;
  }
  now.value = Date.now();
  refreshCountdownTicker();
}

function syncRoomConfig(config) {
  if (!config) return;
  const room = config.room ? { ...config.room } : {};
  if (Object.prototype.hasOwnProperty.call(config, 'mode')) room.mode = config.mode;
  if (Object.prototype.hasOwnProperty.call(config, 'ttlMinutes')) {
    room.ttlMinutes = config.ttlMinutes;
  } else if (Object.prototype.hasOwnProperty.call(config, 'ttl')) {
    room.ttlMinutes = Number(config.ttl) / 60;
  }
  if (Object.prototype.hasOwnProperty.call(config, 'expireAt')) {
    room.expiresAt = config.expireAt;
  }
  syncRoomMeta(room);
}

function resetShareOrigin() {
  shareOriginDraft.value = defaultShareOrigin;
  window.localStorage.removeItem(SHARE_ORIGIN_STORAGE_KEY);
}

function scheduleRoomSessionRetry(nextRoomId, requestedSession, requestId) {
  clearRoomSessionRetry({ resetAttempts: false });
  if (roomSessionRetryAttempts >= 5) {
    socketState.value = 'offline';
    showToast('error', '连接失败', '房间服务暂时不可用，请稍后手动重试。');
    return;
  }
  roomSessionRetryAttempts += 1;
  roomRetryTimer = window.setTimeout(async () => {
    roomRetryTimer = null;
    if (requestId !== roomSessionRequestId || roomId.value !== nextRoomId) return;
    try {
      await requestRoomSession(nextRoomId, requestedSession.intent, {
        forceGuest: requestedSession.forceGuest,
      });
      roomSessionRetryAttempts = 0;
      connectSocket();
      await refreshQr();
    } catch (error) {
      socketState.value = 'reconnecting';
      scheduleRoomSessionRetry(nextRoomId, requestedSession, requestId);
    }
  }, Math.min(3000 * roomSessionRetryAttempts, 12000));
}

let roomSessionRequestId = 0;

watch(() => route.params.roomId, async (value) => {
  const requestId = ++roomSessionRequestId;
  const normalized = normalizeRoomId(value);
  if (!normalized) {
    const persisted = readPersistedRoomState();
    const restoredRoomId = normalizeRoomId(persisted?.roomId);
    const restoredHost = persisted?.role === 'host' && Boolean(readHostToken(restoredRoomId));
    // 只有能恢复 Host 身份的旧房间才复用；Host Token 已丢失（如关闭标签页后重开）时
    // 一律创建新房间，避免以 Guest 意图加入早已过期的旧房间导致反复重试和 toast。
    const nextRoomId = restoredHost ? restoredRoomId : generateRoomId();
    pendingRoomNavigation = {
      roomId: nextRoomId,
      intent: 'create',
      forceGuest: false,
    };
    await router.replace({ name: 'RealtimeClipboard', params: { roomId: nextRoomId } });
    return;
  }

  const persisted = readPersistedRoomState();
  const hasSavedHostToken = Boolean(readHostToken(normalized));

  // 强制校验：如果 URL 中指定了房间且有存储的 Host token，强制走 create
  const requestedSession = pendingRoomNavigation?.roomId === normalized
    ? pendingRoomNavigation
    : {
      roomId: normalized,
      intent: hasSavedHostToken ? 'create' : 'join',
      forceGuest: !hasSavedHostToken,
    };

  pendingRoomNavigation = null;
  clearRoomSessionRetry();
  try {
    await requestRoomSession(normalized, requestedSession.intent, { forceGuest: requestedSession.forceGuest });
    // 成功后，如果设备类型为移动端，再次确保本地状态持久化
    if (getDeviceType() === 'Mobile') persistRoomState(normalized, role.value);
  } catch (error) {
    roomId.value = normalized;
    const preserveHostIntent = requestedSession.intent === 'create' && !requestedSession.forceGuest;
    if (preserveHostIntent) {
      isHost.value = true;
      role.value = 'host';
      persistRoomState(normalized, 'host');
    } else {
      isHost.value = false;
      role.value = 'guest';
      hostToken.value = '';
    }
    if (requestId === roomSessionRequestId) {
      cleanupCurrentRoomConnections();
      socketState.value = 'offline';
      if (isTransientRoomError(error) || requestedSession.intent === 'join') {
        socketState.value = 'reconnecting';
        showToast('info', '正在连接房间', requestedSession.intent === 'create'
          ? '正在连接信令服务并创建房间，请稍候。'
          : '正在等待房间服务响应，请稍候。');
        scheduleRoomSessionRetry(normalized, requestedSession, requestId);
      } else {
        showToast('error', '房间身份确认失败', error?.message || '请检查后端服务是否正常。');
      }
    }
    return;
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

onBeforeRouteLeave(async () => {
  await destroyHostRoomOnRouteLeave();
  cleanupCurrentRoomConnections();
});

onMounted(() => {
  const savedShareOrigin = window.localStorage.getItem(SHARE_ORIGIN_STORAGE_KEY);
  if (savedShareOrigin) {
    shareOriginDraft.value = savedShareOrigin;
  }
  refreshCountdownTicker();
  visibilityHandler = () => {
    showToast('success', document.visibilityState === 'visible' ? '页面已回到前台' : '页面已转入后台', document.visibilityState === 'visible' ? '连接状态会自动重连保持。' : '继续后台运行，回到页面即可恢复可见状态。');
  };
  beforeUnloadHandler = () => {
    // 页面刷新或进入后台不代表用户主动退出，交给 Socket 断线恢复机制处理。
  };
  window.addEventListener('paste', handleGlobalPaste);
  window.addEventListener('beforeunload', beforeUnloadHandler);
  document.addEventListener('visibilitychange', visibilityHandler);
});

onBeforeUnmount(() => {
  cleanupCurrentRoomConnections();
  if (beforeUnloadHandler) window.removeEventListener('beforeunload', beforeUnloadHandler);
  window.removeEventListener('paste', handleGlobalPaste);
  if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
  for (const timerId of toastTimers.values()) window.clearTimeout(timerId);
  toastTimers.clear();
});
</script>

<style scoped>
.clipboard-scroll-list {
  content-visibility: auto;
  contain-intrinsic-size: 1px 920px;
  overscroll-behavior: contain;
  will-change: transform;
  transform: translateZ(0);
}

.mobile-card-enter-active,
.mobile-card-leave-active {
  transition: opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}

.mobile-card-enter-from,
.mobile-card-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
}

.mobile-card-move {
  transition: transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>



