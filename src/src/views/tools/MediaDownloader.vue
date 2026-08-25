<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- 面包屑 -->
    <nav class="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-6">
      <router-link to="/" class="hover:text-brand-600 dark:hover:text-brand-400">首页</router-link>
      <IconChevronRight class="w-4 h-4" />
      <span class="text-gray-600 dark:text-gray-300">无水印解析下载</span>
    </nav>

    <!-- 输入区 -->
    <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
      <div class="flex gap-3">
        <input
          ref="inputRef"
          v-model="inputUrl"
          @keyup.enter="handleParse"
          placeholder="粘贴小红书/抖音/微博分享链接..."
          class="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition text-sm"
        />
        <button
          @click="handleParse"
          :disabled="loading || !inputUrl.trim()"
          class="shrink-0 px-5 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <IconLoader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <IconSearch v-else class="w-4 h-4" />
          {{ loading ? '解析中' : '解析' }}
        </button>
      </div>
      <div class="flex items-center gap-2 mt-3">
        <span class="text-xs text-gray-400">支持：</span>
        <span class="text-xs px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">小红书</span>
        <span class="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">抖音</span>
        <span class="text-xs px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium">微博</span>
      </div>
    </div>

    <!-- 错误 -->
    <div v-if="error" class="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-sm text-red-700 dark:text-red-300">
      {{ error }}
    </div>

    <!-- ====== 解析结果 - 这才是用户关心的 ====== -->
    <div v-if="result" class="space-y-5">

      <!-- ====== 视频卡片 (Douyin/Kuaishou) ====== -->
      <div v-if="result.type === 'video' && (result.cover || result.video)" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <!-- 封面预览 -->
        <div class="relative bg-gray-100 dark:bg-gray-900">
          <img v-if="result.cover" :src="result.cover" class="w-full max-h-80 object-contain mx-auto" @error="onImgError($event)" />
          <div v-else class="flex items-center justify-center h-48 text-gray-400 text-sm">封面加载中...</div>
          <a v-if="result.video" :href="result.video" target="_blank" rel="noopener"
            class="absolute bottom-3 right-3 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 shadow-lg transition flex items-center gap-2">
            <IconDownload class="w-4 h-4" /> 下载无水印视频
          </a>
        </div>
        <!-- 视频标签 -->
        <div class="flex items-center gap-2 px-5 py-3">
          <IconVideo class="w-4 h-4 text-brand-500" />
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ result.type === 'video' ? '视频作品' : '图文作品' }}</span>
          <span class="text-xs text-gray-400">{{ result.platform === 'douyin' ? '抖音' : result.platform }}</span>
        </div>
      </div>

      <!-- ====== 图片卡片 (Xiaohongshu / Weibo / Douyin 图集) ====== -->
      <div v-if="result.images?.length" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="grid gap-1" :class="result.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
          <div v-for="(imgUrl, idx) in result.images.slice(0, 9)" :key="idx" class="relative bg-gray-100 dark:bg-gray-900">
            <img :src="imgUrl" class="w-full max-h-64 object-contain mx-auto" loading="lazy" @error="onImgError($event)" />
            <a :href="imgUrl" target="_blank" rel="noopener"
              class="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-medium hover:bg-black/80 transition flex items-center gap-1">
              <IconDownload class="w-3 h-3" /> 原图
            </a>
          </div>
        </div>
      </div>

      <!-- ====== 通用媒体列表 (向后兼容) ====== -->
      <div v-if="!result.images?.length && !(result.type === 'video' && (result.cover || result.video)) && result.media?.length" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <template v-for="(item, idx) in result.media" :key="idx">
          <div v-if="item.type === 'image'" class="relative bg-gray-100 dark:bg-gray-900">
            <img :src="item.url" class="w-full max-h-80 object-contain mx-auto" loading="lazy" @error="onImgError($event)" />
            <a :href="item.url" target="_blank" rel="noopener"
              class="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs font-medium hover:bg-black/80 backdrop-blur-sm transition flex items-center gap-1">
              <IconDownload class="w-3.5 h-3.5" /> 原图
            </a>
          </div>
          <div v-else-if="item.type === 'video'" class="relative bg-black">
            <video v-if="item.url" :src="item.url" :poster="item.thumb" controls playsinline
              class="w-full max-h-80 object-contain" preload="metadata" @error="onVideoError($event, idx)">
            </video>
            <div v-else class="flex items-center justify-center h-48 text-gray-400 text-sm">视频加载中...</div>
            <a v-if="item.url" :href="item.url" target="_blank" rel="noopener"
              class="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 shadow-lg transition flex items-center gap-1">
              <IconDownload class="w-3.5 h-3.5" /> 下载
            </a>
          </div>
        </template>
      </div>

      <!-- ====== 文案卡片 ====== -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <p v-if="result.author" class="text-xs text-brand-600 dark:text-brand-400 font-medium mb-1">
              @{{ result.author }}
            </p>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-snug">
              {{ result.title }}
            </h3>
            <p v-if="result.description && result.description !== result.title"
              class="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
              {{ result.description }}
            </p>
          </div>
          <button
            @click="copyText(buildCopyText())"
            class="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all"
            :class="{ 'text-green-600 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-700 dark:bg-green-900/20': copied }"
          >
            <IconCheck v-if="copied" class="w-3.5 h-3.5" />
            <IconCopy v-else class="w-3.5 h-3.5" />
            {{ copied ? '已复制' : '复制文案' }}
          </button>
        </div>

        <!-- 全部下载链接 -->
        <div v-if="allDownloads.length > 1" class="mt-4 flex flex-wrap gap-2">
          <a v-for="(d, idx) in allDownloads" :key="idx"
            :href="d.url" target="_blank" :download="result.title + '_' + (idx + 1)"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 dark:hover:text-brand-400 transition">
            <IconPhoto v-if="d.type === 'image'" class="w-3 h-3" />
            <IconVideo v-else class="w-3 h-3" />
            {{ d.label }}
          </a>
        </div>
      </div>

      <!-- 平台信息 -->
      <p class="text-center text-xs text-gray-400 dark:text-gray-500">
        来自{{ platformLabel }} · 数据由 proHub 解析提供 · 仅供学习交流使用
      </p>
    </div>

    <!-- 空状态引导 -->
    <div v-if="!result && !error && !loading" class="text-center py-16">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <IconLink class="w-8 h-8 text-gray-300 dark:text-gray-600" />
      </div>
      <p class="text-sm text-gray-400 dark:text-gray-500">粘贴小红书、抖音、微博分享链接，开始解析</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { useHead } from '@vueuse/head';
import {
  IconChevronRight,
  IconSearch,
  IconLoader2,
  IconDownload,
  IconPhoto,
  IconVideo,
  IconCopy,
  IconCheck,
  IconLink,
} from '@tabler/icons-vue';
import { apiConfig } from '../../config/api';

useHead({
  title: '社交平台无水印解析下载 - proHub',
  meta: [
    { name: 'description', content: '免费在线社交媒体无水印解析下载工具，支持小红书、抖音、微博链接解析，提取无水印原图/视频与文案' },
    { name: 'keywords', content: '无水印下载,抖音去水印,小红书去水印,微博去水印,视频解析,图片下载' },
  ],
});

const inputRef = ref(null);
const inputUrl = ref('');
const loading = ref(false);
const error = ref('');
const result