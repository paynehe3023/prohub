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
          <p class="mt-2 text-sm text-zinc-400 text-glass-sm">选择视频后可立即在本地预览，再按需提取字幕、转录文本与背景音乐。</p>
        </div>
        <button type="button" class="btn-ios btn-ios-glass" :disabled="!videoFile" @click="reset">清空工作台</button>
      </div>
    </section>

    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
      <main class="space-y-5 min-w-0">
        <section class="liquid-glass p-4 sm:p-5">
          <div class="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 items-stretch">
            <div
              class="rounded-[20px] border border-dashed px-3 py-5 text-center transition-colors flex flex-col justify-center"
              :class="dragging ? 'border-ios-blue bg-ios-blue/10 text-white' : 'border-white/20 bg-black/10 text-zinc-400'"
              @dragover.prevent="dragging = true"
              @dragleave.prevent="dragging = false"
              @drop.prevent="onDrop"
            >
              <IconUpload class="w-7 h-7 mx-auto mb-2 text-ios-blue" />
              <p class="text-sm text-white text-glass">拖拽视频到这里</p>
              <p class="text-xs text-zinc-500 mt-2">支持 MP4、MOV、WEBM、MKV</p>
              <label class="btn-ios btn-ios-primary inline-flex self-center mt-3 cursor-pointer text-xs">
                <IconUpload class="w-4 h-4" />选择视频
                <input type="file" class="hidden" accept="video/*,.mkv" @change="onFileChange" />
              </label>
            </div>

            <div v-if="videoFile" class="rounded-[18px] liquid-glass-inset p-3 sm:p-4 min-w-0">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-ios-blue/20 flex items-center justify-center shrink-0"><IconVideo class="w-5 h-5 text-ios-blue" /></div>
                <div class="min-w-0 flex-1"><p class="text-sm text-white truncate">{{ videoFile.name }}</p><p class="text-xs text-zinc-500 mt-1">{{ formatBytes(videoFile.size) }} · {{ videoMeta }}</p></div>
                <button type="button" class="text-zinc-500 hover:text-white" aria-label="移除视频" @click="reset"><IconX class="w-5 h-5" /></button>
              </div>
              <video v-if="videoUrl" :src="videoUrl" controls preload="metadata" playsinline class="w-full h-[240px] sm:h-[300px] lg:h-[360px] rounded-[14px] bg-black object-contain" @loadedmetadata="onMetadata" @error="onPreviewError" />
              <p v-if="previewError" class="mt-2 text-xs text-ios-red">当前浏览器不支持该视频编码，但仍可上传处理。</p>
            </div>

            <div v-else class="rounded-[18px] liquid-glass-inset min-h-[240px] flex items-center justify-center text-xs text-zinc-600">
              上传视频后将在这里立即预览
            </div>
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
            <button type="button" class="btn-ios btn-ios-primary" :disabled="!videoFile || !selectedTasks.length || processing" @click="startExtraction"><IconUpload v-if="!processing" class="w-4 h-4" /><IconLoader2 v-else class="w-4 h-4 animate-spin" />{{ processing ? `处理中 ${progress}%` : '开始提取' }}</button>
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
              <p class="text-sm text-white truncate">{{ displayTrackTitle(result.track) }}</p>
              <p v-if="result.track?.artist || result.track?.artist_zh" class="text-xs text-zinc-400">作者：{{ result.track.artist_zh || result.track.artist }}</p>
              <p v-if="result.track?.album" class="text-xs text-zinc-500">专辑：{{ result.track.album }}</p>
              <p v-if="result.track?.status === 'matched' && !result.track?.title_zh" class="text-[0.6875rem] text-zinc-500">未获取到官方中文名称，显示原始识别名称。</p>
              <div class="flex flex-wrap gap-2 text-xs">
                <a v-if="result.sourceUrl" :href="result.sourceUrl" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition-colors" :class="sourceButtonClass(result.track)"><span class="w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] font-bold" :class="sourceIconClass(result.track)">{{ sourceIcon(result.track) }}</span>{{ displayTrackSource(result.track) }}</a>
              </div>
            </div>
            <pre v-if="result.content" class="max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-xs text-zinc-300 leading-relaxed">{{ result.content }}</pre>
            <div class="flex gap-2"><button type="button" class="inline-flex items-center gap-1.5 rounded-xl border border-ios-blue/50 bg-ios-blue/10 text-ios-blue px-3 py-2 text-xs transition-colors hover:bg-ios-blue/20" @click="downloadResult(result)"><IconDownload class="w-3.5 h-3.5 text-ios-blue" />下载</button><button v-if="result.content" type="button" class="rounded-xl liquid-glass-inset text-zinc-300 px-3 py-2 text-xs hover:text-white" @click="copyResult(result)"><IconCopy class="w-3.5 h-3.5 inline mr-1" />复制</button></div>
          </article>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { IconCopy, IconDownload, IconFileText, IconLoader2, IconUpload, IconVideo, IconX } from '@tabler/icons-vue';
import BreadcrumbNav from '../../components/BreadcrumbNav.vue';

type TaskId = 'subtitle' | 'transcript' | 'bgm' | 'bgm_separation';
type ResultKind = TaskId;
interface Task { id: TaskId; label: string; description: string; icon: unknown }
interface LogEntry { time: string; message: string; type?: 'info' | 'success' | 'error' }
interface TrackInfo { title?: string; title_zh?: string; artist?: string; artist_zh?: string; album?: string; source?: 'netease' | 'qq' | 'shazam'; source_url?: string; status?: string }
interface ExtractionResult { id: string; kind: ResultKind; title: string; meta: string; content: string; url?: string; filename?: string; track?: TrackInfo; sourceUrl?: string }
interface WorkerResult { kind?: ResultKind; type?: ResultKind; title?: string; content?: string; text?: string; data?: string; url?: string; meta?: string; filename?: string; format?: string; audio?: { url?: string; filename?: string; format?: string }; segments?: unknown[]; srt?: string; subtitles?: WorkerResult; transcript?: WorkerResult; bgm?: WorkerResult; bgm_separation?: WorkerResult; identification?: TrackInfo; track?: TrackInfo; source_url?: string }
interface WorkerEvent { type?: string; progress?: number; message?: string; task?: TaskId; done?: boolean; status?: string; result?: WorkerResult | WorkerResult[]; results?: WorkerResult[]; output?: WorkerResult | WorkerResult[]; subtitle_srt?: string; srt?: string; transcript?: string; bgm_segments?: unknown[] }

const tasks: Task[] = [
  { id: 'subtitle', label: '字幕提取', description: '识别并导出 SRT / VTT 字幕文件', icon: IconFileText },
  { id: 'transcript', label: '语音转录', description: '生成可编辑的纯文本转录稿', icon: IconFileText },
  { id: 'bgm', label: 'BGM 提取', description: '快速提取视频音频并下载为 MP3', icon: IconVideo },
  { id: 'bgm_separation', label: '人声/BGM 分离', description: '使用 Demucs 分离人声与背景音乐', icon: IconVideo },
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
const workerUrl = ref('/video-worker');
const sseState = ref<'idle' | 'connected' | 'closed'>('idle');
let eventSource: EventSource | null = null;
let activeJobId = '';
let reconnectTimer: number | null = null;

const allSelected = computed(() => selectedTasks.value.length === tasks.length);
const resultCount = computed(() => results.value.length);
const sseStateLabel = computed(() => ({ idle: '未连接', connected: '已连接', closed: '已断开' }[sseState.value]));

function formatBytes(bytes: number) { return bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`; }
function stamp() { return new Date().toLocaleTimeString('zh-CN', { hour12: false }); }
function addLog(message: string, type: LogEntry['type'] = 'info') { logs.value.push({ time: stamp(), message, type }); nextTick(() => { const panel = document.querySelector('.font-mono'); if (panel) panel.scrollTop = panel.scrollHeight; }); }
function acceptFile(file?: File) { if (!file || (!file.type.startsWith('video/') && !/\.(mkv|mov|mp4|webm)$/i.test(file.name))) { statusMessage.value = '请选择有效的视频文件'; return; } if (videoUrl.value) URL.revokeObjectURL(videoUrl.value); videoFile.value = file; videoUrl.value = URL.createObjectURL(file); previewError.value = false; videoMeta.value = '正在读取元数据'; results.value = []; logs.value = []; statusMessage.value = ''; }
function onFileChange(event: Event) { acceptFile((event.target as HTMLInputElement).files?.[0]); }
function onDrop(event: DragEvent) { dragging.value = false; acceptFile(event.dataTransfer?.files?.[0]); }
function onMetadata(event: Event) { const video = event.target as HTMLVideoElement; videoMeta.value = `${Math.floor(video.duration / 60)}:${String(Math.floor(video.duration % 60)).padStart(2, '0')} · ${video.videoWidth} × ${video.videoHeight}`; }
function onPreviewError() { previewError.value = true; videoMeta.value = '无法预览当前视频编码'; }
function toggleAll() { selectedTasks.value = allSelected.value ? [] : tasks.map(task => task.id); }
function iconFor(kind: ResultKind) { return kind === 'bgm' || kind === 'bgm_separation' ? IconVideo : IconFileText; }
function displayTrackTitle(track?: TrackInfo) { return track?.title_zh || track?.title || '暂未识别歌曲名称'; }
function displayTrackSource(track?: TrackInfo) { return track?.source === 'netease' ? '网易云音乐' : track?.source === 'qq' ? 'QQ音乐' : track?.source === 'shazam' ? 'Shazam' : '歌曲源'; }
function sourceIcon(track?: TrackInfo) { return track?.source === 'netease' ? '网' : track?.source === 'qq' ? 'Q' : 'S'; }
function sourceIconClass(track?: TrackInfo) { return track?.source === 'netease' ? 'bg-red-500 text-white' : track?.source === 'qq' ? 'bg-green-500 text-white' : 'bg-ios-blue text-white'; }
function sourceButtonClass(track?: TrackInfo) { return track?.source === 'netease' ? 'border-red-500/50 bg-red-500/10 text-red-200 hover:bg-red-500/20' : track?.source === 'qq' ? 'border-green-500/50 bg-green-500/10 text-green-200 hover:bg-green-500/20' : 'border-ios-blue/50 bg-ios-blue/10 text-ios-blue hover:bg-ios-blue/20'; }

function startExtraction() { if (!videoFile.value || !selectedTasks.value.length) return; processing.value = true; progress.value = 0; results.value = []; addLog(`已载入「${videoFile.value.name}」，准备处理 ${selectedTasks.value.length} 项任务`); void createJob(); }
async function createJob() {
  try {
    const file = videoFile.value as File;
    const sessionResponse = await fetch('/video-upload/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, size: file.size, type: file.type }) });
    if (!sessionResponse.ok) throw new Error(`上传会话 HTTP ${sessionResponse.status}`);
    const session = await sessionResponse.json() as { upload_id: string; chunk_size: number };
    const chunkSize = session.chunk_size || 512 * 1024;
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
    connectSse(`${workerUrl.value.replace(/\/$/, '')}/jobs/${encodeURIComponent(activeJobId)}/events`);
  } catch (error) { processing.value = false; statusMessage.value = '任务提交失败'; addLog(`任务提交失败：${error instanceof Error ? error.message : '未知错误'}`, 'error'); }
}
function connectSse(endpoint: string) {
  sseState.value = 'connected'; addLog('正在连接 SSE 进度流…'); eventSource?.close(); eventSource = new EventSource(endpoint);
  const handleSseMessage = (event: MessageEvent) => { try { handleWorkerEvent(JSON.parse(event.data) as WorkerEvent); } catch { addLog(event.data); } };
  eventSource.addEventListener('progress', handleSseMessage);
  eventSource.onerror = () => { if (!processing.value || !activeJobId) return; eventSource?.close(); eventSource = null; sseState.value = 'closed'; addLog('SSE 暂时断开，正在查询任务状态…'); void recoverJob(endpoint); };
}
async function recoverJob(endpoint: string) {
  try {
    const response = await fetch(`${workerUrl.value.replace(/\/$/, '')}/jobs/${encodeURIComponent(activeJobId)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const job = await response.json() as { status?: string; progress?: number; result?: WorkerResult | WorkerResult[]; error?: string };
    handleWorkerEvent({ progress: job.progress, result: job.result, status: job.status, message: job.status === 'processing' ? '任务仍在后台处理中…' : undefined });
    if (job.status === 'failed') { processing.value = false; statusMessage.value = job.error || 'Worker 处理失败'; addLog(`Worker 处理失败：${job.error || '未知错误'}`, 'error'); return; }
    if (job.status === 'completed') { finishExtraction(); return; }
    reconnectTimer = window.setTimeout(() => connectSse(endpoint), 1000);
  } catch (error) { addLog(`任务状态查询失败：${error instanceof Error ? error.message : '未知错误'}`, 'error'); reconnectTimer = window.setTimeout(() => recoverJob(endpoint), 2000); }
}
function handleWorkerEvent(data: WorkerEvent) { if (data.type === 'heartbeat') return; progress.value = Math.min(100, Math.max(progress.value, data.progress ?? progress.value)); if (data.message) addLog(data.message); const incoming = data.results || data.result || data.output; if (incoming) applyWorkerResults(incoming); if (data.subtitle_srt || data.srt) applyWorkerResults({ kind: 'subtitle', content: data.subtitle_srt || data.srt }); if (data.transcript) applyWorkerResults({ kind: 'transcript', content: data.transcript }); if (data.bgm_segments) applyWorkerResults({ kind: 'bgm', title: '背景音乐', meta: '音频片段' }); if (data.done || ['completed', 'complete', 'finished', 'success'].includes((data.status || '').toLowerCase())) finishExtraction(); }
function formatWorkerContent(kind: ResultKind, item: WorkerResult) { if (kind === 'subtitle') return item.srt || item.content || item.text || ''; if (kind === 'transcript') return item.text || item.content || ''; return item.content || item.text || ''; }
function applyWorkerResults(incoming: WorkerResult | WorkerResult[]) {
  const source = Array.isArray(incoming) ? incoming : [incoming];
  const items = source.flatMap(item => item.subtitles || item.transcript || item.bgm || item.bgm_separation ? ([item.subtitles ? { ...item.subtitles, kind: 'subtitle' as const } : null, item.transcript ? { ...item.transcript, kind: 'transcript' as const } : null, item.bgm ? { ...item.bgm, kind: 'bgm' as const } : null, item.bgm_separation ? { ...item.bgm_separation, kind: 'bgm_separation' as const } : null].filter(Boolean) as WorkerResult[]) : [item]);
  const mapped = items.map((item, index) => { const kind = item.kind || item.type || selectedTasks.value[index] || 'transcript'; const audio = item.audio; const identification = item.identification || item.track; return { id: `${kind}-${Date.now()}-${index}`, kind, title: item.title || ({ subtitle: '字幕文件', transcript: '转录文本', bgm: '背景音乐', bgm_separation: '人声/BGM 分离' }[kind]), meta: item.meta || (kind === 'bgm' || kind === 'bgm_separation' ? `${audio?.format?.toUpperCase() || 'MP3'} · 音频与识别结果` : kind === 'subtitle' ? 'SRT · UTF-8' : 'TXT · UTF-8'), content: formatWorkerContent(kind, item), url: audio?.url || item.url, filename: audio?.filename || item.filename, track: identification, sourceUrl: item.source_url || identification?.source_url }; });
  results.value = [...results.value.filter(result => !mapped.some(item => item.kind === result.kind)), ...mapped];
}
function finishExtraction() { eventSource?.close(); eventSource = null; activeJobId = ''; sseState.value = 'closed'; processing.value = false; progress.value = 100; statusMessage.value = `已完成 ${results.value.length} 项提取`; addLog('全部任务完成，可下载或复制结果', 'success'); }
function resolveWorkerUrl(url: string) { return url.startsWith('http') ? url : `${workerUrl.value.replace(/\/$/, '')}/${url.replace(/^\//, '')}`; }
function safeFilename(value: string) { return value.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim() || '未命名'; }
function downloadResult(result: ExtractionResult) { const extension = result.kind === 'subtitle' ? 'srt' : result.kind === 'bgm' || result.kind === 'bgm_separation' ? 'mp3' : 'txt'; if (result.url) { const link = document.createElement('a'); link.href = resolveWorkerUrl(result.url); link.download = result.kind === 'bgm' || result.kind === 'bgm_separation' ? `${safeFilename(displayTrackTitle(result.track))}_${safeFilename(result.track?.artist || '未知作者')}.${extension}` : result.filename || `${result.kind}.${extension}`; link.target = '_blank'; link.click(); return; } if (result.kind === 'bgm' || result.kind === 'bgm_separation') { statusMessage.value = 'BGM 音频地址不可用，请检查 Worker 输出'; return; } const blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${videoFile.value?.name.replace(/\.[^.]+$/, '') || 'video'}-${result.kind}.${extension}`; link.click(); URL.revokeObjectURL(link.href); }
async function copyResult(result: ExtractionResult) { await navigator.clipboard?.writeText(result.content); statusMessage.value = '结果已复制到剪贴板'; }
function reset() { eventSource?.close(); eventSource = null; if (reconnectTimer) window.clearTimeout(reconnectTimer); reconnectTimer = null; activeJobId = ''; if (videoUrl.value) URL.revokeObjectURL(videoUrl.value); videoFile.value = null; videoUrl.value = ''; videoMeta.value = '等待读取时长'; previewError.value = false; results.value = []; logs.value = []; progress.value = 0; processing.value = false; statusMessage.value = ''; sseState.value = 'idle'; }
onBeforeUnmount(reset);
</script>
