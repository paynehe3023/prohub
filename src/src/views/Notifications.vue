<template>
  <div class="theme-page mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-6 lg:pt-16">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-ios-blue">proHub Updates</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">网页通知</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-zinc-400">查看项目维护者发布的更新、提醒与重要消息。</p>
      </div>
      <button v-if="unreadCount" type="button" class="btn-ios btn-ios-glass self-start sm:self-auto" @click="markAllRead">一键已读（{{ unreadCount }}）</button>
    </div>

    <div v-if="error" class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{{ error }}</div>
    <div v-if="loading" class="liquid-glass p-8 text-center text-sm text-slate-500 dark:text-zinc-400">正在加载通知…</div>
    <div v-else-if="notifications.length === 0" class="liquid-glass p-10 text-center">
      <IconBellOff class="mx-auto h-10 w-10 text-slate-400" />
      <p class="mt-3 font-medium text-slate-700 dark:text-zinc-200">暂时没有通知</p>
      <p class="mt-1 text-sm text-slate-500 dark:text-zinc-400">有新消息时会显示在这里。</p>
    </div>
    <div v-else-if="!selectedNotification" class="space-y-4">
      <article v-for="notification in notifications" :key="notification.id" class="liquid-glass cursor-pointer p-5 transition hover:-translate-y-0.5 sm:p-6" :class="{ 'ring-2 ring-ios-blue/30': !isRead(notification) }" @click="openNotification(notification)">
        <div class="flex items-start gap-4">
          <span class="mt-1 h-3 w-3 shrink-0 rounded-full" :class="isRead(notification) ? levelClass(notification.level) : 'bg-red-500'" :aria-label="isRead(notification) ? '已读' : '未读'"></span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ notification.title }}</h2>
              <div class="flex items-center gap-3"><span class="text-xs text-slate-500 dark:text-zinc-400">{{ isRead(notification) ? '已读' : '未读' }}</span><time class="text-xs text-slate-500 dark:text-zinc-400">{{ formatDate(notification.createdAt) }}</time></div>
            </div>
            <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-zinc-300">{{ notification.content }}</p>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="liquid-glass p-5 sm:p-6">
      <button type="button" class="btn-ios btn-ios-glass mb-5" @click="selectedNotification = null">返回通知列表</button>
      <div class="flex items-center gap-3"><span class="h-3 w-3 rounded-full" :class="levelClass(selectedNotification.level)"></span><span class="text-sm text-slate-500 dark:text-zinc-400">{{ isRead(selectedNotification) ? '已读' : '未读' }}</span></div>
      <h2 class="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{{ selectedNotification.title }}</h2>
      <time class="mt-2 block text-xs text-slate-500 dark:text-zinc-400">{{ formatDate(selectedNotification.createdAt) }}</time>
      <p class="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-zinc-300">{{ selectedNotification.content }}</p>
    </div>

  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { IconBellOff } from '@tabler/icons-vue';
import { apiConfig, apiFetch } from '../config/api';

const notifications = ref([]);
const loading = ref(true);
const error = ref('');
const selectedNotification = ref(null);
const unreadCount = ref(0);
const route = useRoute();
const NOTIFICATIONS_READ_KEY = 'prohub-notifications-read';
function normalizeNotificationId(id) { return String(id ?? ''); }
function getReadIds() { try { return new Set(JSON.parse(window.localStorage.getItem(NOTIFICATIONS_READ_KEY) || '[]').map(normalizeNotificationId)); } catch { return new Set(); } }
function isRead(notification) { return getReadIds().has(normalizeNotificationId(notification?.id)); }
function saveReadIds(ids) { window.localStorage.setItem(NOTIFICATIONS_READ_KEY, JSON.stringify([...ids].map(normalizeNotificationId))); }
function updateUnreadCount() { unreadCount.value = notifications.value.filter((item) => !isRead(item)).length; }
function notifyReadStateChanged() { window.dispatchEvent(new CustomEvent('prohub-notifications-updated')); }
function pruneReadIds() { const activeIds = new Set(notifications.value.map((item) => normalizeNotificationId(item.id))); saveReadIds(new Set([...getReadIds()].filter((id) => activeIds.has(id)))); }
function markRead(notification) { if (!notification?.id) return; const ids = getReadIds(); ids.add(normalizeNotificationId(notification.id)); saveReadIds(ids); updateUnreadCount(); notifyReadStateChanged(); }
function markAllRead() { const ids = getReadIds(); notifications.value.forEach((item) => ids.add(normalizeNotificationId(item.id))); saveReadIds(ids); updateUnreadCount(); notifyReadStateChanged(); }

async function loadNotifications() {
  loading.value = true;
  try {
    if (route.params.id) {
      selectedNotification.value = (await apiFetch(`${apiConfig.endpoints.notifications}/${encodeURIComponent(route.params.id)}`)).notification;
      markRead(selectedNotification.value);
    } else {
      notifications.value = (await apiFetch(apiConfig.endpoints.notifications)).notifications || [];
      pruneReadIds();
      updateUnreadCount();
    }
  } catch (err) { error.value = err.message; } finally { loading.value = false; }
}
function openNotification(notification) { markRead(notification); selectedNotification.value = notification; }
function formatDate(value) { return new Date(value).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }); }
function levelClass(level) { return { info: 'bg-ios-blue', success: 'bg-ios-green', warning: 'bg-ios-yellow', danger: 'bg-red-500' }[level] || 'bg-ios-blue'; }
onMounted(loadNotifications);
</script>
