<template>
  <div class="theme-page mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-6 lg:pt-16">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-ios-blue">proHub Administration</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">管理后台工作台</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-zinc-400">集中管理项目内容与运营设置。</p>
      </div>
      <button v-if="authenticated" type="button" class="btn-ios btn-ios-glass" @click="logout">退出登录</button>
    </div>

    <div v-if="error" class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{{ error }}</div>
    <section v-if="!authenticated" class="liquid-glass mx-auto max-w-md p-5 sm:p-6">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white">管理员登录</h2>
      <form class="mt-5 grid gap-4" @submit.prevent="login">
        <input v-model="credentials.username" required placeholder="管理员账号" class="liquid-glass-inset w-full px-4 py-3 text-sm outline-none" autocomplete="username" />
        <input v-model="credentials.password" required type="password" placeholder="管理员密码" class="liquid-glass-inset w-full px-4 py-3 text-sm outline-none" autocomplete="current-password" />
        <button type="submit" :disabled="saving" class="btn-ios btn-ios-primary justify-center">{{ saving ? '登录中…' : '登录' }}</button>
      </form>
    </section>

    <template v-else>
      <section class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="card in dashboardCards" :key="card.title" class="liquid-glass p-5">
          <component :is="card.icon" class="h-6 w-6 text-ios-blue" />
          <h2 class="mt-4 text-base font-semibold text-slate-900 dark:text-white">{{ card.title }}</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-zinc-400">{{ card.description }}</p>
          <span class="mt-4 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 dark:bg-white/10 dark:text-zinc-400">{{ card.status }}</span>
        </article>
      </section>

      <section class="liquid-glass mb-6 p-5 sm:p-6">
        <div class="mb-5">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-ios-blue">Content management</p>
          <h2 class="mt-1 text-xl font-semibold text-slate-900 dark:text-white">通知管理</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-zinc-400">发布或删除网页通知。</p>
        </div>
        <form class="grid gap-4" @submit.prevent="publish">
          <div class="grid gap-4 sm:grid-cols-2">
            <input v-model="form.title" required maxlength="120" placeholder="通知标题" class="liquid-glass-inset w-full px-4 py-3 text-sm outline-none" />
            <select v-model="form.level" class="liquid-glass-inset w-full px-4 py-3 text-sm outline-none"><option value="info">普通</option><option value="success">成功</option><option value="warning">提醒</option><option value="danger">重要</option></select>
          </div>
          <textarea v-model="form.content" required maxlength="2000" rows="4" placeholder="通知内容" class="liquid-glass-inset w-full resize-y px-4 py-3 text-sm outline-none"></textarea>
          <div class="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label class="min-w-0 text-xs text-slate-500 dark:text-zinc-400">过期时间（可选；到达该时间后，正式页面将不再展示此通知）<input v-model="form.expiresAt" type="datetime-local" class="liquid-glass-inset mt-2 block h-12 w-full min-w-0 max-w-full appearance-none px-3 py-3 text-sm text-slate-800 outline-none dark:text-white" /></label>
            <button type="submit" :disabled="saving" class="btn-ios btn-ios-primary justify-center">{{ saving ? '发布中…' : '发布通知' }}</button>
          </div>
        </form>
      </section>

      <div v-if="loading" class="liquid-glass p-8 text-center text-sm text-slate-500 dark:text-zinc-400">正在加载通知…</div>
      <div v-else class="space-y-4">
        <article v-for="notification in notifications" :key="notification.id" class="liquid-glass flex items-start gap-4 p-5 sm:p-6">
          <span class="mt-1 h-3 w-3 shrink-0 rounded-full" :class="levelClass(notification.level)"></span>
          <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center justify-between gap-2"><h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ notification.title }}</h2><time :datetime="notification.createdAt" class="text-xs text-slate-500 dark:text-zinc-400">{{ formatDate(notification.createdAt) }}</time></div><p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-zinc-300">{{ notification.content }}</p><p class="mt-2 text-xs text-slate-500 dark:text-zinc-400">{{ notification.expiresAt ? `过期时间：${formatDate(notification.expiresAt)}` : '永不过期' }}</p></div>
          <button type="button" class="btn-ios btn-ios-glass shrink-0 text-red-500" :disabled="deleting === notification.id" @click="remove(notification)">{{ deleting === notification.id ? '删除中…' : '删除' }}</button>
        </article>
        <div v-if="notifications.length === 0" class="liquid-glass p-10 text-center text-sm text-slate-500 dark:text-zinc-400">暂时没有通知</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { IconChartBar, IconFileText, IconSettings, IconUsers } from '@tabler/icons-vue';
import { apiConfig, apiFetch } from '../config/api';

const dashboardCards = [
  { title: '用户管理', description: '用户与权限管理入口，功能待接入。', status: '即将接入', icon: IconUsers },
  { title: '内容管理', description: '管理站点内容与资源，功能待接入。', status: '即将接入', icon: IconFileText },
  { title: '系统设置', description: '配置系统运行参数，功能待接入。', status: '即将接入', icon: IconSettings },
  { title: '数据概览', description: '查看运营数据与趋势，功能待接入。', status: '即将接入', icon: IconChartBar },
];
const notifications = ref([]); const loading = ref(true); const saving = ref(false); const deleting = ref(''); const error = ref(''); const authenticated = ref(false);
const credentials = reactive({ username: '', password: '' }); const form = reactive({ title: '', content: '', level: 'info', expiresAt: '' });
async function checkSession() { try { await apiFetch('/admin/notifications/me'); authenticated.value = true; await loadNotifications(); } catch { authenticated.value = false; loading.value = false; } }
async function login() { saving.value = true; error.value = ''; try { await apiFetch('/admin/notifications/login', { method: 'POST', body: JSON.stringify(credentials) }); credentials.password = ''; authenticated.value = true; await loadNotifications(); } catch (err) { error.value = err.message; } finally { saving.value = false; } }
async function logout() { await apiFetch('/admin/notifications/logout', { method: 'POST' }); authenticated.value = false; notifications.value = []; }
async function loadNotifications() { loading.value = true; try { notifications.value = (await apiFetch(apiConfig.endpoints.adminNotifications)).notifications || []; } catch (err) { error.value = err.message; } finally { loading.value = false; } }
async function publish() { saving.value = true; error.value = ''; try { const payload = { ...form, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null }; await apiFetch(apiConfig.endpoints.notifications, { method: 'POST', body: JSON.stringify(payload) }); Object.assign(form, { title: '', content: '', level: 'info', expiresAt: '' }); await loadNotifications(); } catch (err) { error.value = err.message; } finally { saving.value = false; } }
async function remove(notification) { if (!window.confirm(`确定删除通知“${notification.title}”吗？`)) return; deleting.value = notification.id; try { await apiFetch(`${apiConfig.endpoints.notifications}/${encodeURIComponent(notification.id)}`, { method: 'DELETE' }); await loadNotifications(); } catch (err) { error.value = err.message; } finally { deleting.value = ''; } }
function formatDate(value) { return new Date(value).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }); }
function levelClass(level) { return { info: 'bg-ios-blue', success: 'bg-ios-green', warning: 'bg-ios-yellow', danger: 'bg-red-500' }[level] || 'bg-ios-blue'; }
onMounted(checkSession);
</script>
