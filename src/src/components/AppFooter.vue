<template>
  <footer class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- 品牌 -->
        <div>
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <IconBox class="w-4 h-4 text-white" />
            </div>
            <span class="font-bold text-lg text-gray-900 dark:text-white">proHub</span>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            一站式全能在线工具箱，提供社交媒体解析下载、文本处理、实用计算等免费工具服务。
          </p>
        </div>

        <!-- 快速链接 -->
        <div>
          <h4 class="font-semibold text-sm text-gray-900 dark:text-white mb-3">快速链接</h4>
          <ul class="space-y-2">
            <li><router-link to="/" class="text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400">首页</router-link></li>
            <li><router-link to="/tools/media-downloader" class="text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400">无水印解析下载</router-link></li>
          </ul>
        </div>

        <!-- 声明 -->
        <div>
          <h4 class="font-semibold text-sm text-gray-900 dark:text-white mb-3">免责声明</h4>
          <p class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            本站工具仅供学习交流使用，请勿用于商业或侵权用途。用户自行承担使用风险，本站不对任何后果负责。
          </p>
        </div>
      </div>

      <div class="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-xs text-gray-400 dark:text-gray-500">
          &copy; {{ year }} proHub. All rights reserved. Built with Vue 3 + Tailwind CSS.
        </p>
        <div class="flex items-center gap-4">
          <a href="/sitemap.xml" class="text-xs text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400">Sitemap</a>
          <a href="/robots.txt" class="text-xs text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400">robots.txt</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { IconBox } from '@tabler/icons-vue';
const year = new Date().getFullYear();
</script>
