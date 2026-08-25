<template>
  <div class="min-h-screen py-8 px-4">
    <div class="max-w-7xl mx-auto space-y-6">
      <section class="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl shadow-xl overflow-hidden">
        <div class="p-6 md:p-8 bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <div class="flex flex-col xl:flex-row xl:items-start gap-6">
            <div class="flex-1 space-y-5">
              <div class="flex flex-wrap items-center gap-2">
                <span :class="statusBadgeClass" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border">
                  <component :is="statusIcon" size="14" />
                  {{ connectionLabel }}
                </span>
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-sky-200 text-sky-700 bg-sky-50 dark:border-sky-900/50 dark:text-sky-300 dark:bg-sky-900/20">
                  <IconClockHour4 size="14" />
                  {{ ttlLabel }} 自动清空
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

              <div class="grid gap-4 md:grid-cols-2">
                <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-[0.24em] text-slate-400">当前房间</p>
                      <p class="mt-1 text-2xl font-black tracking-[0.35em] text-slate-900 dark:text-white">{{ roomId }}</p>
                    </div>
                    <button type="button" @click="copyRoomUrl" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors">
                      <IconCopy size="16" />
                      复制房间链接
                    </button>
                  </div>
                  <p class="mt-3 text-xs text-slate-500 break-all">{{ roomUrl }}</p>
                </div>

                <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-[0.24em] text-slate-400">自动销毁</p>
                      <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{{ remainingText }}</p>
                    </div>
                    <select v-model.number="roomTtlMinutes" @change="syncRoomSettings" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500">
                      <option v-for="option in ttlOptions" :key="option" :value="option">{{ option }} 分钟</option>
                    </select>
                  </div>
                  <p class="mt-3 text-xs text-slate-500">房间无活动后自动清空，避免持久化隐私残留。</p>
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
            <div class="mt-4 flex flex-wrap gap-2">
              <button type="button" @click="triggerFilePick" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 transition-colors">
                <IconPhoto size="16" />
                选择图片/文件
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
                {{ roomId }}
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
            <article v-for="clip in sortedClips" :key="clip.id" class="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl p-5 shadow-xl">
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
                  <button type="button" @click="copyClip(clip)" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <IconCopy size="16" />
                    复制
                  </button>
                  <button v-if="hasDownload(clip)" type="button" @click="downloadClip(clip)" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-sky-200 text-sm text-sky-700 bg-sky-50 hover:bg-sky-100 dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-300 transition-colors">
                    <IconDownload size="16" />
                    下载原图
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
                    <img :src="clip.previewUrl || clip.dataUrl" alt="图片预览" class="w-full h-auto object-contain" />
                  </div>
                  <div class="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                    <p class="break-all">文件名：{{ clip.fileName || 'image.png' }}</p>
                    <p>尺寸：{{ formatBytes(clip.size) }}</p>
                    <p>类型：{{ clip.mimeType || 'image/*' }}</p>
                  </div>
                </div>

                <div v-else class="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4">
                  <div class="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <IconFile size="22" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-slate-900 dark:text-white break-all">{{ clip.fileName || 'clipboard-file' }}</p>
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
  IconFile,
  IconFileText,
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
    { name: 'keywords', content: '剪贴板,实时同步,跨端同步,二维码,图片同步,文件同步,Socket.io' },
  ],
});

const route = useRoute();
const router = useRouter();
const socketBaseUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
const ttlOptions = [5, 10, 15, 30, 60];
const maxClips = 20;
const inlineImageThreshold = 750 * 1024;

const roomId = ref('');
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

let socketInstance = null;
let textTimer = null;
let ticker = null;
let lastSentText = '';
let qrStamp = 0;
let visibilityHandler = null;

const sortedClips = computed(() => [...clips.value].sort((left, right) => right.createdAt - left.createdAt));
const roomUrl = computed(() => (roomId.value ? window.location.origin + '/clipboard/' + roomId.value : ''));
const ttlLabel = computed(() => roomTtlMinutes.value + ' 分钟');
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

function showToast(type, title, message) {
  const id = crypto.randomUUID();
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
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 4000,
    timeout: 15000,
  });

  socketInstance.on('connect', () => {
    socketState.value = 'connected';
    socketInstance.emit('room:join', { roomId: roomId.value, ttlMinutes: roomTtlMinutes.value }, (response) => {
      if (response?.ok) {
        clips.value = [...(response.clips || [])];
        if (response.room?.ttlMinutes) roomTtlMinutes.value = response.room.ttlMinutes;
        if (response.room?.expiresAt) roomExpiresAt.value = response.room.expiresAt;
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
    socketInstance.emit('room:join', { roomId: roomId.value, ttlMinutes: roomTtlMinutes.value });
    showToast('success', '连接已恢复', '房间已自动重新加入。');
  });

  socketInstance.on('connect_error', (error) => {
    socketState.value = 'offline';
    showToast('error', '连接失败', error.message || 'Socket 连接失败');
  });

  socketInstance.on('clip:init', (payload) => {
    clips.value = [...(payload?.clips || [])];
    if (payload?.room?.ttlMinutes) roomTtlMinutes.value = payload.room.ttlMinutes;
    if (payload?.room?.expiresAt) roomExpiresAt.value = payload.room.expiresAt;
  });

  socketInstance.on('clip:sync', (payload) => {
    if (payload?.room?.expiresAt) roomExpiresAt.value = payload.room.expiresAt;
    if (payload?.clip) {
      clips.value = [payload.clip].concat(clips.value.filter((item) => item.id !== payload.clip.id));
      showToast('success', '收到同步', clipTypeLabel(payload.clip) + ' 已同步到房间。');
    }
  });

  socketInstance.on('clip:delete', (payload) => {
    clips.value = clips.value.filter((item) => item.id !== payload?.clipId);
    if (payload?.room?.expiresAt) roomExpiresAt.value = payload.room.expiresAt;
  });

  socketInstance.on('room:settings', (payload) => {
    if (payload?.ttlMinutes) roomTtlMinutes.value = payload.ttlMinutes;
    if (payload?.expiresAt) roomExpiresAt.value = payload.expiresAt;
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

function initRoom() {
  const routeRoomId = normalizeRoomId(route.params.roomId);
  if (routeRoomId) {
    roomId.value = routeRoomId;
    return;
  }

  router.replace({ name: 'RealtimeClipboard', params: { roomId: generateRoomId() } });
}

function syncRoomSettings() {
  if (!socketInstance) return;
  socketInstance.emit('room:update-settings', {
    roomId: roomId.value,
    ttlMinutes: roomTtlMinutes.value,
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

  socketInstance?.emit('clip:send', {
    roomId: roomId.value,
    kind: 'text',
    text,
    ttlMinutes: roomTtlMinutes.value,
  }, (response) => {
    if (!response?.ok) {
      showToast('error', '同步失败', response?.error || '文本发送失败');
      return;
    }
    clips.value = [response.clip].concat(clips.value.filter((item) => item.id !== response.clip.id));
    roomExpiresAt.value = response.room?.expiresAt || roomExpiresAt.value;
    lastSentText = text;
    textDraft.value = '';
    showToast('success', '文本已同步', '同房间设备已收到这段文本。');
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

async function uploadAndSendFile(file) {
  if (!file) return;

  if (file.type.startsWith('image/') && file.size <= inlineImageThreshold) {
    const dataUrl = await readFileAsDataUrl(file);
    await new Promise((resolve, reject) => {
      socketInstance?.emit('clip:send', {
        roomId: roomId.value,
        kind: 'image',
        dataUrl,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        ttlMinutes: roomTtlMinutes.value,
      }, (response) => {
        if (!response?.ok) {
          reject(new Error(response?.error || '图片同步失败'));
          return;
        }
        clips.value = [response.clip].concat(clips.value.filter((item) => item.id !== response.clip.id));
        roomExpiresAt.value = response.room?.expiresAt || roomExpiresAt.value;
        resolve();
      });
    });
    return;
  }

  const formData = new FormData();
  formData.append('roomId', roomId.value);
  formData.append('ttlMinutes', String(roomTtlMinutes.value));
  formData.append('file', file);

  const uploadResponse = await fetch(apiConfig.baseURL + apiConfig.endpoints.clipboardUpload, {
    method: 'POST',
    body: formData,
  });
  const uploadData = await uploadResponse.json().catch(() => ({}));
  if (!uploadResponse.ok) {
    throw new Error(uploadData.message || uploadData.error || '上传失败');
  }

  await new Promise((resolve, reject) => {
    socketInstance?.emit('clip:send', {
      roomId: roomId.value,
      assetId: uploadData?.asset?.assetId,
      ttlMinutes: roomTtlMinutes.value,
    }, (response) => {
      if (!response?.ok) {
        reject(new Error(response?.error || '文件同步失败'));
        return;
      }
      clips.value = [response.clip].concat(clips.value.filter((item) => item.id !== response.clip.id));
      roomExpiresAt.value = response.room?.expiresAt || roomExpiresAt.value;
      resolve();
    });
  });
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

function downloadClip(clip) {
  const url = getAbsoluteUrl(clip.downloadUrl || clip.previewUrl || clip.dataUrl);
  if (!url) return;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = clip.fileName || 'clipboard-item';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
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
  socketInstance?.emit('room:clear', { roomId: roomId.value }, (response) => {
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
    errorCorrectionLevel: 'M',
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

function syncRoomMeta(room) {
  if (!room) return;
  if (room.ttlMinutes) roomTtlMinutes.value = room.ttlMinutes;
  if (room.expiresAt) roomExpiresAt.value = room.expiresAt;
}

watch(() => route.params.roomId, async (value) => {
  const normalized = normalizeRoomId(value);
  if (normalized) {
    roomId.value = normalized;
    connectSocket();
    await refreshQr();
    return;
  }
  router.replace({ name: 'RealtimeClipboard', params: { roomId: generateRoomId() } });
}, { immediate: true });

watch(roomUrl, () => {
  scheduleQrRefresh();
}, { immediate: true });

watch(textDraft, () => {
  if (!textDraft.value.trim()) lastSentText = '';
});

onMounted(() => {
  ticker = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
  visibilityHandler = () => {
    showToast('success', document.visibilityState === 'visible' ? '页面已回到前台' : '页面已转入后台', document.visibilityState === 'visible' ? '连接状态仍由 Socket.io 自动保持。' : '继续后台运行，回到页面即可恢复可见状态。');
  };
  window.addEventListener('paste', handleGlobalPaste);
  document.addEventListener('visibilitychange', visibilityHandler);
});

onBeforeUnmount(() => {
  if (textTimer) window.clearTimeout(textTimer);
  if (ticker) window.clearInterval(ticker);
  if (qrStamp) window.clearTimeout(qrStamp);
  window.removeEventListener('paste', handleGlobalPaste);
  if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
  disconnectSocket();
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
