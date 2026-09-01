<template>
  <div class="theme-page max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
    <BreadcrumbNav label="视频提取工作台" />

    <section class="liquid-glass p-5 sm:p-6 mb-5">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-inset text-[0.75rem] text-zinc-300 text-glass-sm mb-3">
            <IconVideo class="w-4 h-4 text-ios-blue" />
            本地预览 · 多任务提取 · 实时进度
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-[-0.03em] text-glass">视频提取工作台</h1>
          <p class="mt-2 text-sm text-zinc-400 text-glass-sm">拖入视频，按需提取字幕、转录文本与背景音乐，处理进度实时可见。</p>
        </div>
        <button type="button" class="btn-ios btn-ios-glass" :disabled="!videoFile" @click="reset">清空工作台</button>
      </div>
    </section>

    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
      <main class="space-y-5 min-w-0">
        <section class="liquid-glass p-4 sm:p-5">
          <div
            class="rounded-[20px] border border-dashed px-4 py-10 sm:py-14 text-center transition-colors"
            :class="dragging ? 'border-ios-blue bg-ios-blue/10 text-white' : 'border-white/20 bg-black/10 text-zinc-400'"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="onDrop"
          >
            <IconCloudUpload class="w-8 h-8 mx-auto mb-2 text-ios-blue" />
            <p class="text-sm text-white text-glass">拖拽视频到这里</p>
            <p class="text-xs text-zinc-500 mt-2">支持 MP4、MOV、WEBM、MKV，建议不超过 2GB</p>
            <p class="text-[0.6875rem] text-zinc-600 mt-1">拖拽或选择文件后，可在下方预览并选择提取任务</p>
            <label class="btn-ios btn-ios-primary inline-flex mt-5 cursor-pointer text-xs">
              <IconFolderOpen class="w-4 h-4" />选择视频
              <input type="file" class="hidden" accept="video/*,.mkv" @change="onFileChange" />
            </label>
          </div>

          <div v-if="videoFile" class="mt-4 rounded-[18px] liquid-glass-inset p-3 sm:p-4">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-ios-blue/20 flex items-center justify-center shrink-0"><IconVideo class="w-5 h-5 text-ios-blue" /></div>
              <div class="min-w-0 flex-1"><p class="text-sm text-white truncate">{{ videoFile.name }}</p><p class="text-xs text-zinc-500 mt-1">{{ formatBytes(videoFile.size) }} · {{ videoMeta }}</p></div>
              <button type="button" class="text-zinc-500 hover:text-white" aria-label="移除视频" @click="reset"><IconX class="w-5 h-5" /></button>
            </div>
            <video v-if="videoUrl" :src="videoUrl" controls class="w-full max-h-[430px] rounded-[14px] bg-black object-contain" @loadedmetadata="onMetadata" />
          </div>
        </section>

        <section class="liquid-glass p-4 sm:p-5 space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div><h2 class="text-base font-semibold text-white text-glass">提取任务</h2><p class="text-xs text-zinc-500 mt-1">可同时勾选多个输出，完成后在右侧下载。</p></div>
            <button type="button" class="text-xs text-ios-blue hover:underline" @click="toggleAll">{{ allSelected ? '取消全选' : '全选任务' }}</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label v-for="task in tasks" :key="task.id" class="rounded-[16px] p-4 cursor-pointer transition-all" :class="selectedTasks.includes(task.id) ? 'bg-ios-blue/15 ring-1 ring-ios-blue/60' : 'liquid-glass-inset hover:bg-white/10'">
              <input v-model="selectedTasks" type="checkbox" :value="task.id" class="sr-only" />
              <div class="flex items-start gap-3"><span class="w-8 h-8 rounded-lg flex items-center justify-center" :class="selectedTasks.includes(task.id) ? 'bg-ios-blue text-white' : 'bg-white/10 text-zinc-400'"><component :is="task.icon" class="w-4 h-4" /></span><span><span class="block text-sm text-white">{{ task.label }}</span><span class="block text-xs text-zinc-500 mt-1 leading-relaxed">{{ task.description }}</span></span></div>
            </label>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button type="button" class="btn-ios btn-ios-primary" :disabled="!videoFile || !selectedTasks.length || processing" @click="startExtraction"><IconPlayerPlay v-if="!processing" class="w-4 h-4" /><IconLoader2 v-else class="w-4 h-4 animate-spin" />{{ processing ? `处理中 ${progress}%` : '开始提取' }}</button>
            <span v-if="statusMessage" class="text-xs text-zinc-400">{{ statusMessage }}</span>
          </div>
        </section>

        <section class="liquid-glass p-4 sm:p-5">
          <div class="flex items-center justify-between mb-3"><div><h2 class="text-base font-semibold text-white text-glass">SSE 实时进度日志</h2><p class="text-xs text-zinc-500 mt-1">服务端事件连接状态：<span :class="sseState === 'connected' ? 'text-ios-green' : 'text-zinc-400'">{{ sseStateLabel }}</span></p></div><button type="button" class="text-xs text-zinc-400 hover:text-white" @click="logs = []">清空日志</button></div>
          <div ref="logPanel" class="rounded-[16px] liquid-glass-inset p-3 h-48 overflow-y-auto font-mono text-[0.6875rem] space-y-1.5"><p v-if="!logs.length" class="text-zinc-600">等待任务开始…</p><p v-for="(log, index) in logs" :key="index" :class="log.type === 'error' ? 'text-ios-red' : log.type === 'success' ? 'text-ios-green' : 'text-zinc-400'"><span class="text-zinc-600 mr-2">{{ log.time }}</span>{{ log.message }}</p></div>
        </section>
      </main>

      <aside class="space-y-5">
        <section class="liquid-glass p-4 sm:p-5 space-y-3">
          <div class="flex items-center justify-between"><h2 class="text-base font-semibold text-white text-glass">提取结果</h2><span class="text-xs text-zinc-500">{{ resultCount }} 项</span></div>
          <div v-if="!resultCount" class="rounded-[16px] border border-dashed border-white/15 p-8 text-center text-xs text-zinc-500">完成任务后，结果会显示在这里</div>
          <article v-for="result in results" :key="result.id" class="rounded-[16px] liquid-glass-inset p-3 space-y-2">
            <div class="flex items-center gap-2"><span class="w-7 h-7 rounded-lg bg-ios-blue/15 text-ios-blue flex items-center justify-center"><component :is="iconFor(result.kind)" class="w-4 h-4" /></span><div class="min-w-0 flex-1"><p class="text-sm text-white">{{ result.title }}</p><p class="text-[0.6875rem] text-zinc-500">{{ result.meta }}</p></div><span class="text-[0.6875rem] text-ios-green">已完成</span></div>
            <div v-if="result.kind === 'bgm' || result.kind === 'bgm_separation'" class="rounded-xl bg-black/15 p-3 space-y-2">
              <p class="text-sm text-white truncate">{{ result.track?.title || '暂未识别歌曲名称' }}</p>
              <p v-if="result.track?.artist" class="text-xs text-zinc-400">作者：{{ result.track.artist }}</p>
              <p v-if="result.track?.album" class="text-xs text-zinc-500">专辑：{{ result.track.album }}</p>
              <div class="flex flex-wrap gap-3 text-xs">
                <a v-if="result.sourceUrl" :href="result.sourceUrl" target="_blank" rel="noreferrer" class="text-ios-blue hover:underline">打开歌曲源链接</a>
                <a v-if="result.url" :href="resolveWorkerUrl(result.url)" download class="text-ios-green hover:underline">直接下载 BGM</a>
              </div>
            </div>
            <pre v-if="result.content" class="max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-xs text-zinc-300 leading-relaxed">{{ result.content }}</pre>
            <div class="flex gap-2"><button type="button" class="rounded-xl bg-ios-blue/20 text-ios-blue px-3 py-2 text-xs hover:bg-ios-blue/30" @click="downloadResult(result)"><IconDownload class="w-3.5 h-3.5 inline mr-1" />下载</button><button type="button" class="rounded-xl liquid-glass-inset text-zinc-300 px-3 py-2 text-xs hover:text-white" @click="copyResult(result)"><IconCopy class="w-3.5 h-3.5 inline mr-1" />复制</button></div>
          </article>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { IconCloudUpload, IconCopy, IconDownload, IconFileMusic, IconFileText, IconFolderOpen, IconLoader2, IconPlayerPlay, IconVideo, IconX } from '@tabler/icons-vue';
import BreadcrumbNav from '../../components/BreadcrumbNav.vue';

/** 支持的处理任务。 */
type TaskId = 'subtitle' | 'transcript' | 'bgm' | 'bgm_separation';
type ResultKind = TaskId;
interface Task { id: TaskId; label: string; description: string; icon: unknown }
interface LogEntry { time: string; message: string; type?: 'info' | 'success' | 'error' }
interface TrackInfo { title?: string; artist?: string; album?: string; source_url?: string; status?: string }
interface ExtractionResult { id: string; kind: ResultKind; title: string; meta: string; content: string; url?: string; filename?: string; track?: TrackInfo; sourceUrl?: string }

const tasks: Task[] = [
  { id: 'subtitle', label: '字幕提取', description: '识别并导出 SRT / VTT 字幕文件', icon: IconFileText },
  { id: 'transcript', label: '语音转录', description: '生成可编辑的纯文本转录稿', icon: IconFileText },
  { id: 'bgm', label: 'BGM 提取', description: '快速提取视频音频并下载为 MP3', icon: IconFileMusic },
  { id: 'bgm_separation', label: '人声/BGM 分离', description: '使用 Demucs 分离人声与背景音乐', icon: IconFileMusic },
];
const videoFile = ref<File | null>(null);
const videoUrl = ref('');
const videoMeta = ref('等待读取时长');
const previewError = ref(false);
const dragging = ref(false);
const selectedTasks = ref<TaskId[]>([]);
const results = ref<ExtractionResult[]>([]);
const logs = ref<LogEntry[]>([]);
const processing = ref(false);
const progress = ref(0);
const statusMessage = ref('');
const workerUrl = ref((import.meta.env.VITE_VIDEO_WORKER_URL || '/video-worker').trim());
const sseState = ref<'idle' | 'connected' | 'closed'>('idle');
let eventSource: EventSource | null = null;
let activeJobId = '';
let reconnectTimer: number | null = null;
let demoTimer: number | null = null;

const allSelected = computed(() => selectedTasks.value.length === tasks.length);
const resultCount = computed(() => results.value.length);
const sseStateLabel = computed(() => ({ idle: '未连接', connected: '已连接', closed: '已断开' }[sseState.value]));

function formatBytes(bytes: number) { if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1024 ** 2).toFixed(1)} MB`; }
function stamp() { return new Date().toLocaleTimeString('zh-CN', { hour12: false }); }
function addLog(message: string, type: LogEntry['type'] = 'info') { logs.value.push({ time: stamp(), message, type }); nextTick(() => { const panel = document.querySelector('.font-mono'); if (panel) panel.scrollTop = panel.scrollHeight; }); }
function acceptFile(file?: File) { if (!file || (!file.type.startsWith('video/') && !/\.(mkv|mov|mp4|webm)$/i.test(file.name))) { statusMessage.value = '请选择有效的视频文件'; return; } if (videoUrl.value) URL.revokeObjectURL(videoUrl.value); videoFile.value = file; videoUrl.value = URL.createObjectURL(file); previewError.value = false; videoMeta.value = '正在读取元数据'; results.value = []; logs.value = []; statusMessage.value = ''; }
function onFileChange(event: Event) { acceptFile((event.target as HTMLInputElement).files?.[0]); }
function onDrop(event: DragEvent) { dragging.value = false; acceptFile(event.dataTransfer?.files?.[0]); }
function onMetadata(event: Event) { const video = event.target as HTMLVideoElement; videoMeta.value = `${Math.floor(video.duration / 60)}:${String(Math.floor(video.duration % 60)).padStart(2, '0')} · ${video.videoWidth} × ${video.videoHeight}`; }
function onPreviewError() { previewError.value = true; videoMeta.value = '无法预览当前视频编码'; }
function toggleAll() { selectedTasks.value = allSelected.value ? [] : tasks.map(task => task.id); }
function iconFor(kind: ResultKind) { return kind === 'bgm' || kind === 'bgm_separation' ? IconFileMusic : IconFileText; }
function makeResult(kind: TaskId): ExtractionResult { const labels: Record<TaskId, string> = { subtitle: '字幕文件', transcript: '转录文本', bgm: '背景音乐', bgm_separation: '人声/BGM 分离' }; const content = kind === 'subtitle' ? '1\n00:00:00,000 --> 00:00:04,000\n（演示字幕）视频处理完成后将替换为识别结果。' : kind === 'transcript' ? '（演示转录）视频处理完成后将替换为识别结果。' : 'BGM 音频已准备下载。'; return { id: `${kind}-${Date.now()}`, kind, title: labels[kind], meta: kind === 'bgm' || kind === 'bgm_separation' ? 'MP3 · 音频轨道' : kind === 'subtitle' ? 'SRT · UTF-8' : 'TXT · UTF-8', content }; }
interface WorkerResult { kind?: ResultKind; type?: ResultKind; title?: string; content?: string; text?: string; data?: string; url?: string; meta?: string; filename?: string; format?: string; audio?: { url?: string; filename?: string; format?: string }; audio_url?: string; audio_filename?: string; segments?: unknown[]; srt?: string; subtitles?: WorkerResult; transcript?: WorkerResult; bgm?: WorkerResult; bgm_separation?: WorkerResult; identification?: TrackInfo; track?: TrackInfo; source_url?: string }
interface WorkerEvent { progress?: number; message?: string; task?: TaskId; done?: boolean; status?: string; result?: WorkerResult | WorkerResult[]; results?: WorkerResult[]; output?: WorkerResult | WorkerResult[]; subtitle_srt?: string; srt?: string; transcript?: string; bgm_segments?: unknown[] }

function startExtraction() { if (!videoFile.value) return; processing.value = true; progress.value = 0; results.value = []; addLog(`已载入「${videoFile.value.name}」，准备处理 ${selectedTasks.value.length} 项任务`); if (workerUrl.value.trim()) createJob(); else { addLog('未配置 Worker 地址，进入本地演示模式', 'info'); runDemoProgress(); } }
async function createJob() {
  const baseUrl = workerUrl.value.trim().replace(/\/$/, '');
  try {
    const file = videoFile.value as File;
    const sessionResponse = await fetch('/video-upload/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, size: file.size, type: file.type }) });
    if (!sessionResponse.ok) throw new Error(`上传会话 HTTP ${sessionResponse.status}`);
    const session = await sessionResponse.json() as { upload_id: string; chunk_size: number };
    const chunkSize = session.chunk_size || 8 * 1024 * 1024;
    const total = Math.ceil(file.size / chunkSize);
    for (let index = 0; index < total; index += 1) {
      const start = index * chunkSize;
      const chunk = file.slice(start, Math.min(file.size, start + chunkSize));
      addLog(`正在上传分片 ${index + 1}/${total}…`);
      const response = await fetch(`/video-upload/sessions/${encodeURIComponent(session.upload_id)}/chunks/${index}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'X-Chunk-Start': String(start), 'X-Chunk-Length': String(chunk.size) }, body: chunk });
      if (!response.ok) throw new Error(`分片 ${index + 1} HTTP ${response.status}`);
      progress.value = Math.floor(((index + 1) / total) * 45);
    }
    addLog('视频上传完成，正在创建处理任务…');
    const completeResponse = await fetch(`/video-upload/sessions/${encodeURIComponent(session.upload_id)}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks: selectedTasks.value }) });
    if (!completeResponse.ok) throw new Error(`任务创建 HTTP ${completeResponse.status}`);
    const job = await completeResponse.json() as { id?: string; job_id?: string; jobId?: string };
    activeJobId = job.id || job.job_id || job.jobId || '';
    if (!activeJobId) throw new Error('服务端未返回任务 ID');
    connectSse(`${baseUrl}/jobs/${encodeURIComponent(activeJobId)}/events`);
  } catch (error) {
    processing.value = false;
    statusMessage.value = '任务提交失败';
    addLog(`任务提交失败：${error instanceof Error ? error.message : '未知错误'}`, 'error');
  }
}
function connectSse(endpoint: string) {
  sseState.value = 'connected';
  addLog('正在连接 SSE 进度流…');
  eventSource?.close();
  eventSource = new EventSource(endpoint);
  const handleSseMessage = (event: MessageEvent) => {
    try {
      handleWorkerEvent(JSON.parse(event.data) as WorkerEvent);
    } catch {
      addLog(event.data);
    }
  };
  eventSource.addEventListener('progress', handleSseMessage);
  eventSource.onerror = () => {
    if (!processing.value || !activeJobId) return;
    eventSource?.close();
    eventSource = null;
    sseState.value = 'closed';
    addLog('SSE 暂时断开，正在查询任务状态…', 'info');
    void recoverJob(endpoint);
  };
}

async function recoverJob(endpoint: string) {
  const baseUrl = workerUrl.value.trim().replace(/\/$/, '');
  try {
    const response = await fetch(`${baseUrl}/jobs/${encodeURIComponent(activeJobId)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const job = await response.json() as { status?: string; progress?: number; result?: WorkerResult | WorkerResult[]; error?: string };
    handleWorkerEvent({ progress: job.progress, result: job.result, status: job.status, message: job.status === 'processing' ? '任务仍在后台处理中…' : undefined });
    if (job.status === 'failed') {
      processing.value = false;
      statusMessage.value = job.error || 'Worker 处理失败';
      addLog(`Worker 处理失败：${job.error || '未知错误'}`, 'error');
      return;
    }
    if (job.status === 'completed') {
      finishExtraction(false);
      return;
    }
    reconnectTimer = window.setTimeout(() => connectSse(endpoint), 1000);
  } catch (error) {
    addLog(`任务状态查询失败：${error instanceof Error ? error.message : '未知错误'}`, 'error');
    reconnectTimer = window.setTimeout(() => recoverJob(endpoint), 2000);
  }
}

function handleWorkerEvent(data: WorkerEvent) { if ('type' in data && data.type === 'heartbeat') return; progress.value = Math.min(100, Math.max(progress.value, data.progress ?? progress.value)); if (data.message) addLog(data.message); const incoming = data.results || data.result || data.output; if (incoming) applyWorkerResults(incoming); const directResults: WorkerResult[] = []; if (data.subtitle_srt || data.srt) directResults.push({ kind: 'subtitle', content: data.subtitle_srt || data.srt }); if (data.transcript) directResults.push({ kind: 'transcript', content: data.transcript }); if (data.bgm_segments) directResults.push({ kind: 'bgm', title: 'BGM segments', meta: 'JSON · 音频片段', content: JSON.stringify(data.bgm_segments, null, 2) }); if (directResults.length) applyWorkerResults(directResults); if (data.done || ['completed', 'complete', 'finished', 'success'].includes((data.status || '').toLowerCase())) finishExtraction(false); }
function formatWorkerContent(kind: ResultKind, item: WorkerResult) {
  if (kind === 'subtitle') return item.srt || item.content || item.text || '';
  if (kind === 'transcript') return item.segments ? JSON.stringify(item.segments, null, 2) : item.text || item.content || '';
  if (kind === 'bgm' || kind === 'bgm_separation') return item.segments ? JSON.stringify(item.segments, null, 2) : item.content || item.text || '';
  return item.content || item.text || item.data || item.url || '';
}
function applyWorkerResults(incoming: WorkerResult | WorkerResult[]) {
  const source = Array.isArray(incoming) ? incoming : [incoming];
  const items = source.flatMap(item => item.subtitles || item.transcript || item.bgm || item.bgm_separation ? ([
    item.subtitles ? { ...item.subtitles, kind: 'subtitle' as const } : null,
    item.transcript ? { ...item.transcript, kind: 'transcript' as const } : null,
    item.bgm ? { ...item.bgm, kind: 'bgm' as const } : null,
    item.bgm_separation ? { ...item.bgm_separation, kind: 'bgm_separation' as const } : null,
  ].filter(Boolean) as WorkerResult[]) : [item]);
  const mapped = items.map((item, index) => {
    const kind = item.kind || item.type || selectedTasks.value[index] || 'transcript';
    const audio = item.audio;
    const identification = item.identification || item.track;
    return { id: `${kind}-${Date.now()}-${index}`, kind, title: item.title || ({ subtitle: '字幕文件', transcript: '转录文本', bgm: '背景音乐', bgm_separation: '人声/BGM 分离' }[kind]), meta: item.meta || (kind === 'bgm' || kind === 'bgm_separation' ? `${audio?.format?.toUpperCase() || 'MP3'} · 音频与识别结果` : kind === 'subtitle' ? 'SRT · UTF-8' : 'JSON · transcript segments'), content: formatWorkerContent(kind, item), url: audio?.url || item.url, filename: audio?.filename || item.filename, track: identification, sourceUrl: item.source_url || identification?.source_url };
  });
  results.value = [...results.value.filter(result => !mapped.some(item => item.kind === result.kind)), ...mapped];
}
function runDemoProgress() { sseState.value = 'connected'; let step = 0; demoTimer = window.setInterval(() => { step += 1; progress.value = Math.min(100, step * 20); addLog(`${progress.value < 100 ? '处理中' : '整理结果'}… ${progress.value}%`); if (step >= 5) { if (demoTimer) window.clearInterval(demoTimer); demoTimer = null; finishExtraction(true); } }, 420); }
function finishExtraction(useDemoResults = false) { eventSource?.close(); eventSource = null; activeJobId = ''; sseState.value = 'closed'; if (useDemoResults) results.value = selectedTasks.value.map(makeResult); processing.value = false; progress.value = 100; statusMessage.value = `已完成 ${results.value.length} 项提取`; addLog('全部任务完成，可下载或复制结果', 'success'); }
function resolveWorkerUrl(url: string) { return url.startsWith('http') ? url : `${workerUrl.value.replace(/\/$/, '')}/${url.replace(/^\//, '')}`; }
function downloadResult(result: ExtractionResult) { const extension = result.kind === 'subtitle' ? 'srt' : result.kind === 'bgm' || result.kind === 'bgm_separation' ? 'mp3' : 'txt'; if (result.url) { const link = document.createElement('a'); link.href = resolveWorkerUrl(result.url); link.download = result.filename || `${videoFile.value?.name.replace(/\.[^.]+$/, '') || 'video'}-${result.kind}.${extension}`; link.target = '_blank'; link.click(); return; } if (result.kind === 'bgm') { statusMessage.value = 'BGM 音频地址不可用，请检查 Worker 输出'; return; } const blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${videoFile.value?.name.replace(/\.[^.]+$/, '') || 'video'}-${result.kind}.${extension}`; link.click(); URL.revokeObjectURL(link.href); }
async function copyResult(result: ExtractionResult) { await navigator.clipboard?.writeText(result.content); statusMessage.value = '结果已复制到剪贴板'; }
function reset() { eventSource?.close(); eventSource = null; if (reconnectTimer) window.clearTimeout(reconnectTimer); reconnectTimer = null; if (demoTimer) window.clearInterval(demoTimer); demoTimer = null; activeJobId = ''; if (videoUrl.value) URL.revokeObjectURL(videoUrl.value); videoFile.value = null; videoUrl.value = ''; videoMeta.value = '等待读取时长'; previewError.value = false; results.value = []; logs.value = []; progress.value = 0; processing.value = false; statusMessage.value = ''; sseState.value = 'idle'; }
onBeforeUnmount(reset);
</script>
