<template>
  <Teleport to="body">
    <Transition name="feedback-modal">
      <div
        v-if="open"
        data-modal-overlay
        class="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-slate-950/75"
        @click.self="close"
      >
        <section
          class="w-full max-w-md min-h-[420px] max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-2xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-950/95 dark:text-white dark:shadow-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          @paste="handlePaste"
        >
          <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <p class="text-[0.6875rem] uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Feedback</p>
              <h2 id="feedback-title" class="mt-1 text-xl font-bold">给 proHub 留个反馈</h2>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">你的建议会直接帮助下一次迭代。</p>
            </div>
            <button type="button" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="关闭反馈弹窗" @click="close">
              <IconX size="18" />
            </button>
          </div>

          <form class="min-h-0 overflow-y-auto p-5" @submit.prevent="submitFeedback">
            <div class="mb-5 flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 px-3 py-3 dark:border-sky-900/60 dark:bg-sky-950/30 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-xs leading-5 text-slate-600 dark:text-slate-300">任何问题、建议或商务需求联系 <span class="font-semibold text-slate-900 dark:text-white">paynehe3023@gmail.com</span></p>
              <button type="button" class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-500" @click="copyContactEmail">
                <IconCheck v-if="contactEmailCopied" size="14" />
                <IconCopy v-else size="14" />
                {{ contactEmailCopied ? '已复制' : '复制邮箱' }}
              </button>
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                v-for="item in feedbackTypes"
                :key="item"
                type="button"
                class="rounded-full border px-3 py-2 text-xs font-semibold transition-colors"
                :class="feedbackType === item ? 'border-sky-400 bg-sky-500/20 text-sky-700 dark:text-sky-200' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200'"
                @click="feedbackType = item"
              >
                {{ item }}
              </button>
            </div>

            <label class="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              反馈内容 <span class="text-rose-300">*</span>
              <textarea
                v-model="content"
                maxlength="500"
                rows="6"
                required
                placeholder="请描述你遇到的问题、希望增加的功能或合作需求。"
                class="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
              ></textarea>
              <span class="mt-1 block text-right text-xs text-slate-500">{{ content.length }}/500</span>
            </label>

            <div
              class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition-colors dark:border-slate-700 dark:bg-slate-900/60"
              :class="dragging ? 'border-sky-400 bg-sky-500/10' : ''"
              @click="fileInput?.click()"
              @dragover.prevent="dragging = true"
              @dragleave="dragging = false"
              @drop.prevent="handleDrop"
            >
              <input ref="fileInput" type="file" accept="image/png,image/jpeg" multiple class="sr-only" @change="handleFileChange" />
              <div class="flex items-start gap-3">
                <IconPaperclip class="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-300" />
                <div>
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">添加截图附件</p>
                  <p class="mt-1 text-xs leading-5 text-slate-400">支持拖拽、点击选择或直接 Ctrl+V 粘贴。仅支持 PNG/JPG 格式，单张图片不超过 3MB。</p>
                </div>
              </div>
              <div v-if="attachments.length" class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                <div v-for="attachment in attachments" :key="attachment.id" class="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
                  <img :src="attachment.dataUrl" :alt="attachment.name" class="h-full w-full object-cover" />
                  <button type="button" class="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/80 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-label="删除附件" @click.stop="removeAttachment(attachment.id)">
                    <IconTrash size="13" />
                  </button>
                </div>
              </div>
            </div>

            <label class="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
              联系方式 <span class="text-xs font-normal text-slate-500">（选填）</span>
              <input v-model="contact" type="text" maxlength="120" placeholder="邮箱 / 微信 / QQ，方便回复处理进度" class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500" />
            </label>

            <input v-model="honeypot" type="text" autocomplete="off" tabindex="-1" aria-hidden="true" class="absolute left-[-9999px] h-px w-px opacity-0" />

            <p v-if="formError" class="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2.5 text-sm leading-6 text-rose-700 dark:text-rose-200">{{ formError }}</p>
            <div class="mt-5 flex items-center justify-end gap-2">
              <button type="button" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900" :disabled="submitting" @click="close">取消</button>
              <button type="submit" class="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50" :disabled="submitting || !content.trim()">
                <IconLoader2 v-if="submitting" class="h-4 w-4 animate-spin" />
                <IconSend v-else class="h-4 w-4" />
                {{ submitting ? '发送中...' : '提交反馈' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onUnmounted, ref, watch } from 'vue';
import { apiConfig, apiFetch } from '../config/api';
import { IconCheck, IconCopy, IconLoader2, IconPaperclip, IconSend, IconTrash, IconX } from '@tabler/icons-vue';

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(['update:open', 'submitted', 'copied']);

const feedbackTypes = ['功能建议', 'Bug 提交', '商务合作', '其他'];
const feedbackType = ref(feedbackTypes[0]);
const content = ref('');
const contact = ref('');
const honeypot = ref('');
const attachments = ref([]);
const dragging = ref(false);
const submitting = ref(false);
const formError = ref('');
const fileInput = ref(null);
const contactEmailCopied = ref(false);
let contactEmailTimer = null;

function close() {
  if (!submitting.value) emit('update:open', false);
}

function resetForm() {
  feedbackType.value = feedbackTypes[0];
  content.value = '';
  contact.value = '';
  honeypot.value = '';
  attachments.value = [];
  formError.value = '';
  dragging.value = false;
  contactEmailCopied.value = false;
  if (fileInput.value) fileInput.value.value = '';
}

async function copyContactEmail() {
  const email = 'paynehe3023@gmail.com';
  try {
    await navigator.clipboard.writeText(email);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = email;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  contactEmailCopied.value = true;
  emit('copied');
  if (contactEmailTimer) window.clearTimeout(contactEmailTimer);
  contactEmailTimer = window.setTimeout(() => {
    contactEmailCopied.value = false;
    contactEmailTimer = null;
  }, 1800);
}

function validateImage(file) {
  if (!file || !['image/png', 'image/jpeg'].includes(file.type)) {
    formError.value = '附件仅支持 PNG/JPG 格式。';
    return false;
  }
  if (file.size > 3 * 1024 * 1024) {
    formError.value = `${file.name || '图片'} 超过 3MB 限制，已拒绝添加。`;
    return false;
  }
  return true;
}

function addFiles(fileList) {
  for (const file of Array.from(fileList || [])) {
    if (!validateImage(file)) continue;
    const reader = new FileReader();
    reader.onload = () => {
      attachments.value = [
        ...attachments.value,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name || 'pasted-image.png',
          type: file.type,
          size: file.size,
          dataUrl: String(reader.result || ''),
        },
      ];
    };
    reader.readAsDataURL(file);
  }
}

function handleFileChange(event) {
  addFiles(event.target.files);
  event.target.value = '';
}

function handleDrop(event) {
  dragging.value = false;
  addFiles(event.dataTransfer?.files);
}

function handlePaste(event) {
  const files = Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === 'file' && ['image/png', 'image/jpeg'].includes(item.type))
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (!files.length) return;
  event.preventDefault();
  addFiles(files);
}

function removeAttachment(id) {
  attachments.value = attachments.value.filter((item) => item.id !== id);
}

async function submitFeedback() {
  formError.value = '';
  if (!content.value.trim()) {
    formError.value = '请先填写反馈内容。';
    return;
  }
  if (honeypot.value.trim()) {
    close();
    return;
  }
  const lastSubmittedAt = Number(window.localStorage.getItem('prohub-feedback-last-submitted') || 0);
  if (Date.now() - lastSubmittedAt < 60 * 1000) {
    formError.value = '提交过于频繁，请 60 秒后再试。';
    return;
  }

  submitting.value = true;
  const payload = {
    type: feedbackType.value,
    content: content.value.trim(),
    contact: contact.value.trim(),
    honeypot: honeypot.value,
    attachments: attachments.value.map(({ name, type, size, dataUrl }) => ({ name, type, size, dataUrl })),
  };
  try {
    try {
      await apiFetch(apiConfig.endpoints.feedback, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (primaryError) {
      const fallbackUrl = String(import.meta.env.VITE_FEEDBACK_FALLBACK_URL || '').trim();
      if (!fallbackUrl) throw primaryError;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json().catch(() => ({}));
        throw new Error(fallbackData?.error || primaryError?.message || '反馈发送失败');
      }
    }
    window.localStorage.setItem('prohub-feedback-last-submitted', String(Date.now()));
    resetForm();
    emit('update:open', false);
    emit('submitted');
  } catch (error) {
    formError.value = error?.message || '反馈发送失败，请稍后重试。';
  } finally {
    submitting.value = false;
  }
}

watch(() => props.open, (value) => {
  if (value) formError.value = '';
});

onUnmounted(() => {
  if (contactEmailTimer) window.clearTimeout(contactEmailTimer);
});
</script>

<style scoped>
/* 自定义滚动条样式 */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(107, 114, 128, 0.7);
}

.feedback-modal-enter-active,
.feedback-modal-leave-active {
  transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.feedback-modal-enter-active section,
.feedback-modal-leave-active section {
  transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.feedback-modal-enter-from,
.feedback-modal-leave-to {
  opacity: 0;
}

.feedback-modal-enter-from section,
.feedback-modal-leave-to section {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
