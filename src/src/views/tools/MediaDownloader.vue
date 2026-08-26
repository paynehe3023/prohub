<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
    <BreadcrumbNav label="无水印解析下载" />

    <!-- 输入区 -->
    <div class="liquid-glass p-5 mb-6">
      <label class="block text-[0.8125rem] font-medium text-zinc-200 mb-2.5 tracking-[-0.01em] text-glass">粘贴分享链接</label>
      <div class="flex flex-col sm:flex-row gap-2.5">
        <input ref="inputRef" v-model="inputUrl" @keyup.enter="handleParse"
          placeholder="粘贴小红书/抖音/微博分享链接..."
          class="flex-1 px-4 py-3 liquid-glass-inset text-white placeholder:text-zinc-500 text-[0.9375rem] tracking-[-0.01em] focus:ring-2 focus:ring-ios-blue/30 outline-none transition-all" />
        <button @click="handleParse" :disabled="loading || !inputUrl.trim()"
          class="shrink-0 btn-ios btn-ios-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100">
          <IconLoader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <IconSearch v-else class="w-4 h-4" /> {{ loading ? '解析中' : '解析' }}
        </button>
      </div>
      <div class="flex items-center gap-2 mt-3">
        <span class="text-[0.6875rem] text-zinc-500 text-glass-sm">支持：</span>
        <span class="text-[0.6875rem] px-2 py-0.5 rounded-full bg-ios-red/20 text-ios-red font-medium">小红书</span>
        <span class="text-[0.6875rem] px-2 py-0.5 rounded-full bg-ios-blue/20 text-ios-blue font-medium">抖音</span>
        <span class="text-[0.6875rem] px-2 py-0.5 rounded-full bg-ios-orange/20 text-ios-orange font-medium">微博</span>
      </div>
    </div>

    <div v-if="error" class="mb-6 p-4 rounded-[20px] bg-ios-red/20 border border-ios-red/30 text-[0.875rem] text-ios-red text-glass-sm">{{ error }}</div>

    <div v-if="result" class="space-y-4">

      <!-- 一键下载全部（右上角醒目按钮） -->
      <div class="flex justify-end">
        <button v-if="allDownloads.length > 0" @click="downloadAll" :disabled="downloading"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-[16px] btn-ios btn-ios-primary shadow-lg shadow-ios-blue/25 disabled:opacity-40 disabled:scale-100 transition-all">
          <IconLoader2 v-if="downloading" class="w-4 h-4 animate-spin" />
          <IconDownload v-else class="w-4 h-4" />
          {{ downloading ? '正在下载...' : '一键下载全部 (' + allDownloads.length + ')' }}
        </button>
        <!-- Toast -->
        <span v-if="toast" class="ml-3 px-3 py-1.5 rounded-full liquid-glass-inset text-[0.75rem] text-ios-green text-glass-sm self-center">{{ toast }}</span>
      </div>

      <!-- 视频卡片 -->
      <div v-if="result.type === 'video' && (result.cover || result.video)" class="liquid-glass overflow-hidden">
        <div class="relative bg-black/20">
          <video v-if="result.video" :src="proxyVideo(result.video)" :poster="result.cover ? proxyImage(result.cover) : ''"
            controls preload="metadata" class="w-full max-h-[420px] object-contain mx-auto bg-black" @error="onVideoError($event)">
            您的浏览器不支持视频播放
          </video>
          <img v-else-if="result.cover" :src="proxyImage(result.cover)" referrerpolicy="no-referrer"
            class="w-full max-h-72 object-contain mx-auto" @error="onImgError($event)" />
          <div v-else class="flex items-center justify-center h-40 text-zinc-500 text-sm">封面加载中...</div>
          <button v-if="result.video" @click="downloadSingle(result.video)"
            class="absolute bottom-3 right-3 px-4 py-2.5 rounded-[16px] bg-ios-blue text-white text-[0.875rem] font-semibold hover:bg-ios-blue/90 shadow-lg shadow-ios-blue/25 transition-all active:scale-[0.97] flex items-center gap-1.5 text-glass-sm">
            <IconDownload class="w-4 h-4" /> 下载无水印视频
          </button>
        </div>
        <div class="flex items-center gap-2 px-4 py-3">
          <IconVideo class="w-4 h-4 text-ios-blue" />
          <span class="text-[0.8125rem] text-zinc-400 text-glass-sm">视频作品</span>
        </div>
      </div>

      <!-- 图片卡片 -->
      <div v-if="result.images?.length" class="liquid-glass overflow-hidden">
        <div class="grid gap-0.5" :class="result.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
          <div v-for="(imgUrl, idx) in result.images" :key="idx" class="relative bg-black/20">
            <img :src="proxyImage(imgUrl)" referrerpolicy="no-referrer"
              class="w-full max-h-56 object-contain mx-auto" loading="lazy" @error="onImgError($event)" />
            <button @click="downloadSingle(imgUrl)"
              class="absolute top-2 right-2 px-2.5 py-1 rounded-[12px] bg-black/50 text-white text-[0.6875rem] font-medium hover:bg-black/70 backdrop-blur-md transition active:scale-[0.96] flex items-center gap-1 text-glass-sm">
              <IconDownload class="w-3 h-3" /> 原图
            </button>
          </div>
        </div>
      </div>

      <!-- 文案卡片 -->
      <div class="liquid-glass p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <p v-if="result.author" class="text-[0.8125rem] text-ios-blue font-medium mb-1 text-glass-sm">@{{ result.author }}</p>
            <h3 class="text-lg font-bold text-white leading-snug tracking-[-0.022em] text-glass">{{ result.title }}</h3>
            <p v-if="result.description && result.description !== result.title"
              class="mt-2 text-[0.875rem] text-zinc-300 leading-relaxed whitespace-pre-line tracking-[-0.01em] text-glass-sm">{{ result.description }}</p>
          </div>
          <button @click="copyText(buildCopyText())"
            class="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[14px] liquid-glass-inset text-zinc-400 text-[0.75rem] hover:text-white active:scale-[0.96] transition-all text-glass-sm"
            :class="{ 'text-ios-green border-ios-green/30 bg-ios-green/10': copied }">
            <IconCheck v-if="copied" class="w-3.5 h-3.5" />
            <IconCopy v-else class="w-3.5 h-3.5" /> {{ copied ? '已复制' : '复制文案' }}
          </button>
        </div>
        <div v-if="allDownloads.length > 1" class="mt-4 flex flex-wrap gap-2">
          <button v-for="(d, idx) in allDownloads" :key="idx" @click="downloadSingle(d.url)"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full liquid-glass-inset text-[0.75rem] text-zinc-300 hover:text-white hover:border-white/30 transition-all active:scale-[0.97] text-glass-sm">
            <IconPhoto v-if="d.type === 'image'" class="w-3 h-3" />
            <IconVideo v-else class="w-3 h-3" /> {{ d.label }}
          </button>
        </div>
      </div>

      <p class="text-center text-[0.75rem] text-zinc-500 tracking-[-0.01em] text-glass-sm">
        来自{{ platformLabel }} · 数据由 proHub 解析提供 · 仅供学习交流使用
      </p>
    </div>

    <div v-if="!result && !error && !loading" class="text-center py-16">
      <div class="w-14 h-14 mx-auto mb-3 rounded-[18px] liquid-glass flex items-center justify-center">
        <IconLink class="w-7 h-7 text-white/20" />
      </div>
      <p class="text-[0.875rem] text-zinc-500 text-glass-sm">粘贴小红书、抖音、微博分享链接，开始解析</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { useHead } from '@vueuse/head';
import { IconChevronRight, IconSearch, IconLoader2, IconDownload, IconPhoto, IconVideo, IconCopy, IconCheck, IconLink } from '@tabler/icons-vue';
import BreadcrumbNav from '../../components/BreadcrumbNav.vue';
import { apiConfig } from '../../config/api';

useHead({ title: '社交平台无水印解析下载 - proHub' });
const inputRef = ref(null), inputUrl = ref(''), loading = ref(false), error = ref(''), result = ref(null), copied = ref(false), downloading = ref(false), toast = ref('');
const platformLabel = computed(() => ({ xiaohongshu:'小红书', douyin:'抖音', weibo:'微博', unknown:'网页' }[result.value?.platform] || '网页'));
const allDownloads = computed(() => {
  const r = result.value; if (!r) return [];
  const l = [];
  if (r.video) l.push({ type:'video', url:r.video, label:'无水印视频' });
  (r.images||[]).forEach((u,i) => l.push({ type:'image', url:u, label:`图片${i+1}` }));
  (r.media||[]).forEach((m,i) => { if(!l.find(x=>x.url===m.url)) l.push({ type:m.type, url:m.url, label:`${m.type==='image'?'图片':'视频'}${i+1}` }); });
  return l;
});
const PROXY_DOMAINS = ['sinaimg.cn','weibocdn.com','xhscdn.com','pstatp.com','douyinpic.com','douyincdn.com','douyinvod.com','ixigua.com','bytedance.com','zjcdn.com','bytecdn.com','douyinstatic.com'];
function proxyImage(url) { if(!url) return ''; if(PROXY_DOMAINS.some(d=>url.includes(d))) return `${apiConfig.baseURL}/proxy-image?url=${encodeURIComponent(url)}`; return url; }
function proxyVideo(url) { if(!url) return ''; if(PROXY_DOMAINS.some(d=>url.includes(d))) return `${apiConfig.baseURL}/proxy-video?url=${encodeURIComponent(url)}`; return url; }
function buildCopyText() { if(!result.value) return ''; const p=[]; if(result.value.title) p.push(result.value.title); if(result.value.description&&result.value.description!==result.value.title) p.push(result.value.description); return p.join('\n\n'); }
async function copyText(t) { try { await navigator.clipboard.writeText(t); } catch { const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } copied.value=true; setTimeout(()=>{copied.value=false;},2000); }
function onImgError(e) { e.target.style.display='none'; }
function onVideoError(e) { e.target.style.display='none'; }

// 统一下载逻辑：走代理（防盗链域名）→ fetch blob → 触发浏览器下载
async function downloadSingle(rawUrl) {
  const url = proxyImage(rawUrl); // 对微博/小红书图片走代理
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ext = blob.type.includes('png') ? '.png' : blob.type.includes('webp') ? '.webp' : blob.type.includes('video') || blob.type.includes('mp4') ? '.mp4' : (rawUrl.includes('.mp4') ? '.mp4' : '.jpg');
    a.href = blobUrl;
    a.download = 'prohub_download_' + Date.now() + ext;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    // 降级：直接跳转原图
    window.open(rawUrl, '_blank');
  }
}
async function handleParse() {
  const u = inputUrl.value.trim(); if(!u) return;
  error.value=''; result.value=null; loading.value=true;
  try {
    const r = await fetch(`${apiConfig.baseURL}${apiConfig.endpoints.parse}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url:u}) });
    const d = await r.json();
    if(!d.success) throw new Error(d.error||'解析失败');
    result.value = d;
    await nextTick(); window.scrollTo({ top:300, behavior:'smooth' });
  } catch(e) { error.value = e.message||'网络请求失败'; }
  finally { loading.value=false; }
}
async function downloadAll() {
  const items = allDownloads.value;
  if (!items.length) return;
  downloading.value = true;
  toast.value = '';
  let done = 0;
  try {
    for (const item of items) {
      const url = proxyImage(item.url); // 走代理
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        const dlExt = item.type === 'video' ? '.mp4' : (item.url.includes('.webp') ? '.webp' : '.jpg');
        a.download = (item.label || 'download') + dlExt;
        a.click();
        URL.revokeObjectURL(blobUrl);
        done++;
      } catch {
        window.open(item.url, '_blank');
      }
    }
    toast.value = done > 0 ? `已下载 ${done} 个文件` : '下载失败，请逐个下载';
    setTimeout(() => { toast.value = ''; }, 3000);
  } catch (e) {
    toast.value = '下载中断，请重试';
  } finally {
    downloading.value = false;
  }
}
</script>






