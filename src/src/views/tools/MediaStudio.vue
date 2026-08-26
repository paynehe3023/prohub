<template>
  <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
    <BreadcrumbNav label="自媒体全流程创作与安全工作台" />

    <section class="liquid-glass p-5 sm:p-6 mb-5">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-inset text-[0.75rem] text-zinc-300 text-glass-sm mb-3">
            <IconSparkles class="w-4 h-4 text-ios-blue" />
            全链路 · 灵感 → AI → 合规 → 预览 → 分发
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-[-0.03em] text-glass">自媒体全流程创作与安全工作台</h1>
          <p class="mt-2 text-sm text-zinc-400 text-glass-sm">素材收集、DeepSeek 创作、违禁词清洗、防折叠实机预览与多平台分发，全部在浏览器完成。</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="btn-ios btn-ios-glass" @click="clearAll">清空全部</button>
        </div>
      </div>
    </section>

    <section class="liquid-glass p-3 mb-5">
      <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="min-h-14 rounded-[14px] px-2 py-2 text-[0.6875rem] font-medium transition-all"
          :class="activeTab === tab.id ? 'bg-ios-blue text-white shadow-lg shadow-ios-blue/20' : 'liquid-glass-inset text-zinc-400 hover:text-white'"
          @click="activeTab = tab.id"
        >
          <span class="block text-sm mb-1">{{ tab.symbol }}</span>
          {{ tab.label }}
        </button>
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-5">
      <!-- 左侧：共享创作区 -->
      <aside class="space-y-5">
        <section class="liquid-glass p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-white text-glass">共享创作区</h2>
            <span class="text-[0.6875rem] text-zinc-500">{{ draft.length }} 字</span>
          </div>
          <textarea
            v-model="draft"
            rows="12"
            placeholder="在这里输入或粘贴初稿，AI 润色、违禁词扫描、预览与导出都基于此内容…"
            class="w-full rounded-[16px] liquid-glass-inset px-3 py-3 text-sm text-white outline-none resize-y min-h-[260px] leading-relaxed"
          />
          <div class="flex flex-wrap gap-2">
            <button type="button" class="rounded-xl liquid-glass-inset px-3 py-2 text-xs text-zinc-300 hover:text-white" @click="insertFromNotes">插入素材</button>
            <button type="button" class="rounded-xl liquid-glass-inset px-3 py-2 text-xs text-zinc-300 hover:text-white" @click="insertInvisibleChar">防折叠符</button>
            <button type="button" class="rounded-xl liquid-glass-inset px-3 py-2 text-xs text-zinc-300 hover:text-white" @click="copyDraft"><IconCopy class="w-3.5 h-3.5 inline mr-1" />复制</button>
          </div>
        </section>

        <section class="liquid-glass p-4 space-y-3">
          <h2 class="text-sm font-semibold text-white text-glass">违禁词速览</h2>
          <div v-if="!complianceHits.length" class="text-[0.75rem] text-zinc-500 py-3 text-center">当前草稿未发现违禁/限流词 ✓</div>
          <div v-else class="space-y-2 max-h-64 overflow-y-auto pr-1">
            <div v-for="(hit, index) in complianceHits" :key="index" class="flex items-center gap-2 rounded-xl liquid-glass-inset px-3 py-2 text-xs">
              <span class="text-ios-red font-medium shrink-0">「{{ hit.word }}」</span>
              <span class="text-zinc-500 truncate flex-1">→ {{ hit.replacement }}</span>
              <button type="button" class="shrink-0 rounded-lg bg-ios-blue/20 text-ios-blue px-2 py-1 hover:bg-ios-blue/30" @click="replaceAll(hit.word, hit.replacement)">替换</button>
            </div>
          </div>
          <p class="text-[0.6875rem] text-zinc-500">词库 {{ forbiddenWords.length }} 条 · 命中 {{ complianceHits.length }} 处</p>
        </section>
      </aside>

      <!-- 右侧：各功能面板 -->
      <main class="min-w-0 space-y-5">
        <!-- Tab 1: 灵感与素材中转站 -->
        <section v-if="activeTab === 'inspire'" class="liquid-glass p-4 sm:p-5 space-y-4">
          <div>
            <h2 class="text-base font-semibold text-white text-glass">灵感与素材中转站</h2>
            <p class="text-[0.75rem] text-zinc-500 mt-1">粘贴文本 / 链接 / 剪贴板图片，随手打标签，后续创作时可一键引用。</p>
          </div>
          <div class="rounded-[16px] liquid-glass-inset p-3">
            <textarea v-model="noteInput" rows="3" placeholder="随手记：金句、爆款开头、选题灵感…" class="w-full bg-transparent text-sm text-white outline-none resize-none" />
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <button v-for="tag in fireTags" :key="tag" type="button" class="rounded-full px-3 py-1 text-xs transition-colors" :class="selectedTags.includes(tag) ? 'bg-ios-blue text-white' : 'liquid-glass-inset text-zinc-400 hover:text-white'" @click="toggleTag(tag)">{{ tag }}</button>
              <button type="button" class="btn-ios btn-ios-primary ml-auto inline-flex items-center gap-1 py-2 px-3 text-xs" @click="addNote"><IconPlus class="w-3.5 h-3.5" />存为素材</button>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="rounded-xl liquid-glass-inset px-3 py-2 text-xs text-zinc-300 hover:text-white" @click="pasteFromClipboard"><IconClipboard class="w-3.5 h-3.5 inline mr-1" />从剪贴板粘贴</button>
          </div>
          <div v-if="!notes.length" class="rounded-[16px] border border-dashed border-white/15 p-8 text-center text-xs text-zinc-500">还没有素材，先记一条吧</div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="note in notes" :key="note.id" class="rounded-[16px] liquid-glass-inset p-3 space-y-2">
              <p class="text-sm text-zinc-200 whitespace-pre-wrap break-words leading-relaxed">{{ note.text }}</p>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span v-for="tag in note.tags" :key="tag" class="rounded-full bg-ios-blue/15 text-ios-blue px-2 py-0.5 text-[0.6875rem]">{{ tag }}</span>
                <span class="text-[0.6875rem] text-zinc-500 ml-auto">{{ formatTime(note.createdAt) }}</span>
              </div>
              <div v-if="note.images.length" class="flex gap-2">
                <img v-for="(image, imageIndex) in note.images" :key="imageIndex" :src="image" class="w-16 h-16 rounded-xl object-cover bg-black/20" />
              </div>
              <div class="flex gap-2">
                <button type="button" class="rounded-lg bg-ios-blue/20 text-ios-blue px-2 py-1 text-xs hover:bg-ios-blue/30" @click="insertNoteIntoDraft(note)">引用到创作区</button>
                <button type="button" class="rounded-lg bg-ios-red/15 text-ios-red px-2 py-1 text-xs hover:bg-ios-red/25 ml-auto" @click="removeNote(note.id)">删除</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Tab 2: DeepSeek AI 润色 -->
        <section v-if="activeTab === 'ai'" class="liquid-glass p-4 sm:p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-white text-glass">DeepSeek AI 润色与脚本创作</h2>
              <p class="text-[0.75rem] text-zinc-500 mt-1">Key 仅存本地 LocalStorage，前端直连 DeepSeek，流式输出。</p>
            </div>
            <label class="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              已配置
              <button type="button" class="rounded-lg liquid-glass-inset px-2 py-1 text-xs" :class="hasApiKey ? 'text-ios-green' : 'text-ios-red'" @click="configureKey">{{ hasApiKey ? '是' : '否' }}</button>
            </label>
          </div>

          <div class="rounded-[16px] liquid-glass-inset p-3">
            <div class="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span>API Key</span>
              <button type="button" class="text-ios-blue hover:underline" @click="configureKey">{{ apiKey ? '修改' : '配置' }}</button>
            </div>
            <input v-if="editingKey" v-model="apiKeyInput" type="password" placeholder="sk-..." class="w-full rounded-xl liquid-glass-inset px-3 py-2 text-sm text-white outline-none" @keyup.enter="saveKey" />
            <p v-else class="text-sm text-zinc-500">{{ apiKey ? apiKey.slice(0, 6) + '••••••' : '未配置，点击右侧按钮配置' }}</p>
            <div v-if="editingKey" class="flex gap-2 mt-2">
              <button type="button" class="btn-ios btn-ios-primary py-1.5 px-3 text-xs" @click="saveKey">保存</button>
              <button type="button" class="rounded-xl liquid-glass-inset px-3 py-1.5 text-xs text-zinc-300" @click="editingKey = false">取消</button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button v-for="mode in aiModes" :key="mode.id" type="button" class="rounded-[16px] p-3 text-left transition-all" :class="activeAiMode === mode.id ? 'bg-ios-blue text-white shadow-lg shadow-ios-blue/20' : 'liquid-glass-inset text-zinc-300 hover:bg-white/10'" @click="activeAiMode = mode.id">
              <p class="text-sm font-medium">{{ mode.label }}</p>
              <p class="text-[0.6875rem] mt-1 opacity-70">{{ mode.desc }}</p>
            </button>
          </div>

          <div v-if="aiModeNeedSecondary()" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="rounded-[16px] liquid-glass-inset p-3">
              <p class="text-xs text-zinc-400 mb-2">对标文案（粘贴要查重/降重的原文）</p>
              <textarea v-model="comparisonText" rows="8" placeholder="粘贴对标文案…" class="w-full bg-transparent text-sm text-white outline-none resize-none" />
            </div>
            <div class="rounded-[16px] liquid-glass-inset p-3">
              <p class="text-xs text-zinc-400 mb-2">我的草稿（来自共享创作区）</p>
              <textarea :value="draft" readonly rows="8" placeholder="共享创作区的内容" class="w-full bg-transparent text-sm text-zinc-300 outline-none resize-none" />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="btn-ios btn-ios-primary" :disabled="!canRunAi || aiStreaming" @click="runAi">
              <IconLoader2 v-if="aiStreaming" class="w-4 h-4 animate-spin" />
              <IconSparkles v-else class="w-4 h-4" />
              {{ aiStreaming ? 'AI 生成中…' : '开始 AI 创作' }}
            </button>
            <button type="button" class="btn-ios btn-ios-glass" :disabled="!aiResult" @click="useAiResult">应用到创作区</button>
            <button type="button" class="btn-ios btn-ios-glass" :disabled="!aiResult" @click="copyAiResult"><IconCopy class="w-3.5 h-3.5 mr-1 inline" />复制</button>
          </div>

          <div class="rounded-[16px] liquid-glass-inset p-4">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-zinc-400">AI 输出</p>
              <span v-if="aiStreaming" class="inline-flex items-center gap-1.5 text-ios-blue text-xs"><span class="w-3 h-3 rounded-full bg-ios-blue animate-pulse" />流式生成中</span>
            </div>
            <pre class="text-sm text-zinc-100 whitespace-pre-wrap break-words leading-relaxed min-h-[120px]">{{ aiResult || 'AI 输出会显示在这里…' }}</pre>
          </div>

          <div v-if="activeAiMode === 'rewrite'" class="rounded-[16px] liquid-glass-inset p-3 text-xs text-zinc-400">
            文本相似度：<span class="text-white font-medium">{{ similarityText }}</span>
            <span class="text-zinc-500">（基于字符 N-Gram，仅供参考）</span>
          </div>
        </section>

        <!-- Tab 3: 违禁词合规清洗 -->
        <section v-if="activeTab === 'compliance'" class="liquid-glass p-4 sm:p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-white text-glass">违禁词与合规安全清洗</h2>
              <p class="text-[0.75rem] text-zinc-500 mt-1">实时扫描草稿中的违禁/限流词，悬停查看一键平替，直接替换。</p>
            </div>
            <span class="text-[0.6875rem] px-2.5 py-1 rounded-full liquid-glass-inset text-zinc-400">词库 {{ forbiddenWords.length }} 条</span>
          </div>
          <div class="rounded-[16px] liquid-glass-inset p-3">
            <div class="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span>实时扫描（逐字高亮）</span>
              <button type="button" class="text-ios-blue hover:underline" @click="refreshWordList"><IconRefresh class="w-3.5 h-3.5 inline mr-1" />热更新词库</button>
            </div>
            <div class="rounded-[14px] bg-black/20 border border-white/10 p-3 text-sm text-white whitespace-pre-wrap break-words leading-relaxed min-h-[180px] max-h-[320px] overflow-y-auto" v-html="highlightedDraft"></div>
          </div>
          <div class="rounded-[16px] liquid-glass-inset p-3">
            <p class="text-xs text-zinc-400 mb-2">一键清洗</p>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="rounded-xl bg-ios-blue/20 text-ios-blue px-3 py-2 text-xs hover:bg-ios-blue/30" :disabled="!complianceHits.length" @click="replaceAllHits">一键替换所有命中词</button>
              <button type="button" class="rounded-xl liquid-glass-inset px-3 py-2 text-xs text-zinc-300 hover:text-white" :disabled="!complianceHits.length" @click="clearHits">忽略并清空提示</button>
            </div>
          </div>
          <div v-if="missingWord" class="rounded-[16px] liquid-glass-inset p-3 space-y-2">
            <p class="text-xs text-zinc-400 mb-1">补充自定义违禁词</p>
            <div class="flex gap-2">
              <input v-model="customWord" type="text" placeholder="输入词（可选加平替：词|平替）" class="flex-1 rounded-xl liquid-glass-inset px-3 py-2 text-sm text-white outline-none" />
              <button type="button" class="btn-ios btn-ios-primary py-2 px-3 text-xs" @click="addCustomWord">添加</button>
            </div>
            <p class="text-[0.6875rem] text-zinc-500">支持格式：限流词 或 限流词|平替词</p>
          </div>
        </section>

        <!-- Tab 4: 防折叠与实机预览 -->
        <section v-if="activeTab === 'preview'" class="liquid-glass p-4 sm:p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-white text-glass">防折叠排版与 1:1 实机预览</h2>
              <p class="text-[0.75rem] text-zinc-500 mt-1">插入隐形字符防长文折叠，切换平台样式直观检测标题截断。</p>
            </div>
            <button type="button" class="btn-ios btn-ios-primary" @click="insertInvisibleChar"><IconZodiacPisces class="w-4 h-4 mr-1 inline" />一键防折叠</button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button v-for="platform in previewPlatforms" :key="platform.id" type="button" class="rounded-[16px] p-3 text-center transition-all" :class="previewPlatform === platform.id ? 'bg-ios-blue text-white shadow-lg shadow-ios-blue/20' : 'liquid-glass-inset text-zinc-400 hover:text-white'" @click="previewPlatform = platform.id">
              <p class="text-lg">{{ platform.symbol }}</p>
              <p class="text-xs mt-1">{{ platform.label }}</p>
            </button>
          </div>

          <div class="rounded-[16px] liquid-glass-inset p-4 sm:p-6 flex justify-center bg-black/20">
            <!-- 小红书双列卡片 -->
            <div v-if="previewPlatform === 'xiaohongshu'" class="w-full max-w-[340px]">
              <div class="text-xs text-zinc-500 mb-3">小红书 · 双列卡片流</div>
              <div class="grid grid-cols-2 gap-3">
                <div v-for="cardIndex in 2" :key="cardIndex" class="rounded-[14px] overflow-hidden bg-white/5 border border-white/10">
                  <div class="aspect-[3/4] bg-gradient-to-br from-ios-blue/40 to-ios-purple/40 flex items-center justify-center text-4xl text-white/40">{{ cardIndex === 1 ? '📌' : '✨' }}</div>
                  <div class="p-2.5">
                    <p class="text-[0.8125rem] text-white leading-snug line-clamp-2">{{ cardIndex === 1 ? firstLine : lastLine }}</p>
                    <div class="flex items-center gap-3 mt-2 text-[0.6875rem] text-zinc-500">
                      <span>♥ 1.2k</span><span>💬 86</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 微信公众号消息列表 -->
            <div v-if="previewPlatform === 'wechat'" class="w-full max-w-[360px]">
              <div class="text-xs text-zinc-500 mb-3">微信公众号 · 消息列表</div>
              <div class="rounded-[14px] overflow-hidden border border-white/10 bg-white/5">
                <div class="px-3 py-2.5 border-b border-white/10 flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-ios-green/40 flex items-center justify-center text-lg">📖</div>
                  <div class="min-w-0 flex-1">
                    <p class="text-[0.8125rem] text-white truncate">你的公众号</p>
                    <p class="text-[0.6875rem] text-zinc-500 truncate mt-0.5">{{ truncatedTitle }}</p>
                  </div>
                  <span class="text-[0.625rem] text-zinc-500 shrink-0">09:30</span>
                </div>
                <div v-for="rowIndex in 3" :key="rowIndex" class="px-3 py-2.5 border-b border-white/10 flex items-center gap-3" :class="rowIndex > 1 ? 'bg-black/10' : ''">
                  <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-ios-purple/40 to-ios-pink/40 flex items-center justify-center text-lg">🖼</div>
                  <div class="min-w-0 flex-1">
                    <p class="text-[0.75rem] text-white truncate">{{ rowIndex === 1 ? firstLine : lastLine }}</p>
                    <p class="text-[0.625rem] text-zinc-500 truncate mt-0.5">{{ rowIndex === 1 ? '刚刚' : '1 小时前' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 抖音推荐页 -->
            <div v-if="previewPlatform === 'douyin'" class="w-full max-w-[320px]">
              <div class="text-xs text-zinc-500 mb-3">抖音 · 推荐页</div>
              <div class="aspect-[9/16] rounded-[14px] overflow-hidden border border-white/10 bg-gradient-to-b from-ios-blue/30 via-ios-purple/30 to-black/40 relative">
                <div class="absolute inset-0 flex items-center justify-center text-6xl text-white/30">🎬</div>
                <div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                  <p class="text-sm text-white font-medium line-clamp-2">{{ firstLine }}</p>
                  <p class="text-[0.6875rem] text-zinc-400 mt-1 flex items-center gap-1">@作者昵称 · #话题 #热点</p>
                  <div class="flex gap-4 mt-2 text-[0.6875rem] text-zinc-300">
                    <span>♥ 2.4w</span><span>💬 356</span><span>↗ 分享</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p class="text-[0.6875rem] text-zinc-500">预览基于共享创作区当前内容实时渲染。隐形字符为 Unicode 零宽空格（U+200B），不占位但可打断长文折叠。</p>
        </section>

        <!-- Tab 5: 多平台分发导出 -->
        <section v-if="activeTab === 'export'" class="liquid-glass p-4 sm:p-5 space-y-4">
          <div>
            <h2 class="text-base font-semibold text-white text-glass">一键多平台格式适配导出</h2>
            <p class="text-[0.75rem] text-zinc-500 mt-1">基于共享创作区终稿，生成并复制各平台适配格式。</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div v-for="platform in exportTargets" :key="platform.id" class="rounded-[16px] liquid-glass-inset p-4 flex flex-col gap-3">
              <div>
                <p class="text-sm font-semibold text-white">{{ platform.label }}</p>
                <p class="text-[0.6875rem] text-zinc-500 mt-1">{{ platform.desc }}</p>
              </div>
              <div class="rounded-[12px] bg-black/20 border border-white/10 p-3 text-[0.6875rem] text-zinc-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {{ exportPreview(platform.id) }}
              </div>
              <button type="button" class="btn-ios btn-ios-primary justify-center mt-auto" :disabled="!draft" @click="copyExport(platform.id)">
                <IconCopy class="w-4 h-4 mr-1 inline" />复制{{ platform.label }}版
              </button>
            </div>
          </div>
          <p v-if="toast" class="rounded-[16px] border border-ios-green/30 bg-ios-green/10 px-4 py-3 text-sm text-ios-green">{{ toast }}</p>
        </section>
      </main>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useHead } from '@vueuse/head';
import {
  IconCopy, IconPlus, IconRefresh, IconClipboard, IconSparkles, IconLoader2, IconZodiacPisces,
} from '@tabler/icons-vue';
import BreadcrumbNav from '../../components/BreadcrumbNav.vue';

type StudioTab = 'inspire' | 'ai' | 'compliance' | 'preview' | 'export';
type AiMode = 'xiaohongshu' | 'golden3s' | 'titles5' | 'rewrite';

interface FireNote {
  id: string;
  text: string;
  tags: string[];
  images: string[];
  createdAt: number;
}
interface ForbiddenWord {
  word: string;
  replacement: string;
  platforms?: string[];
  source?: string;
}
interface ComplianceHit {
  word: string;
  replacement: string;
  count: number;
}

const API_KEY_STORAGE = 'prohub-deepseek-key';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-chat';

const tabs: Array<{ id: StudioTab; label: string; symbol: string }> = [
  { id: 'inspire', label: '灵感素材', symbol: '📥' },
  { id: 'ai', label: 'AI 润色', symbol: '✨' },
  { id: 'compliance', label: '合规清洗', symbol: '🛡️' },
  { id: 'preview', label: '实机预览', symbol: '📱' },
  { id: 'export', label: '多平台分发', symbol: '🚀' },
];
const fireTags = ['#选题', '#爆款开头', '#对标案例', '#金句'];
const aiModes: Array<{ id: AiMode; label: string; desc: string }> = [
  { id: 'xiaohongshu', label: '小红书种草风', desc: '加 Emoji、活泼口吻、分段留白与热门标签' },
  { id: 'golden3s', label: '短视频黄金 3 秒脚本', desc: '吸睛开头 + 痛点 + 方案 + 互动' },
  { id: 'titles5', label: '爆款标题 5 连发', desc: '悬念 / 数据 / 避坑 / 清单 / 情绪 5 组标题' },
  { id: 'rewrite', label: '查重与对标重写', desc: '双栏相似度计算 + AI 二次原创降重' },
];
const previewPlatforms = [
  { id: 'xiaohongshu', label: '小红书双列卡片', symbol: '📕' },
  { id: 'wechat', label: '公众号消息列表', symbol: '💬' },
  { id: 'douyin', label: '抖音推荐页', symbol: '🎵' },
];
const exportTargets = [
  { id: 'xiaohongshu', label: '小红书版', desc: '纯文本 + Emoji + 底部标签' },
  { id: 'wechat', label: '公众号版', desc: '带排版样式的富文本 HTML' },
  { id: 'zhihu', label: '知乎/头条版', desc: '标准 Markdown 格式' },
];

const activeTab = ref<StudioTab>('inspire');
const draft = ref('');
const toast = ref('');

// ---- 灵感素材 ----
const noteInput = ref('');
const noteImages: string[] = [];
const selectedTags = ref<string[]>([]);
const notes = ref<FireNote[]>([]);

// ---- AI ----
const apiKey = ref(localStorage.getItem(API_KEY_STORAGE) || '');
const apiKeyInput = ref(apiKey.value);
const editingKey = ref(!apiKey.value);
const activeAiMode = ref<AiMode>('xiaohongshu');
const comparisonText = ref('');
const aiResult = ref('');
const aiStreaming = ref(false);
const hasApiKey = computed(() => Boolean(apiKey.value));

// ---- 违禁词 ----
const customWord = ref('');
const missingWord = ref(true);
const forbiddenWords = ref<ForbiddenWord[]>([]);
const complianceHits = computed<ComplianceHit[]>(() => {
  const map = new Map<string, ComplianceHit>();
  for (const fw of forbiddenWords.value) {
    const count = countOccurrences(draft.value, fw.word);
    if (count > 0) map.set(fw.word, { word: fw.word, replacement: fw.replacement, count });
  }
  return Array.from(map.values());
});
const highlightedDraft = computed(() => {
  if (!draft.value) return '';
  let result = escapeHtml(draft.value);
  for (const fw of forbiddenWords.value) {
    if (!fw.word) continue;
    result = result.split(escapeHtml(fw.word)).join(`<mark style="background:rgba(255,59,48,0.22);color:#ff6b62;border-radius:3px;padding:0 2px;border-bottom:2px solid rgba(255,59,48,0.5);" title="平替：${escapeHtml(fw.replacement)}">${escapeHtml(fw.word)}</mark>`);
  }
  return result;
});

// ---- 预览 ----
const previewPlatform = ref('xiaohongshu');
const firstLine = computed(() => firstLineOf(draft.value));
const lastLine = computed(() => lastLineOf(draft.value));
const truncatedTitle = computed(() => (firstLine.value.length > 18 ? firstLine.value.slice(0, 18) + '…' : firstLine.value));
const similarityText = computed(() => {
  if (!comparisonText.value || !draft.value) return '—';
  return `${Math.round(vectorSimilarity(comparisonText.value, draft.value) * 100)}%`;
});
const canRunAi = computed(() => Boolean(apiKey.value && (draft.value.trim() || comparisonText.value.trim())));

useHead({ title: '自媒体全流程创作与安全工作台 - proHub' });

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getMonth() + 1}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function setToast(message: string): void {
  toast.value = message;
  window.setTimeout(() => { if (toast.value === message) toast.value = ''; }, 2600);
}
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function countOccurrences(text: string, word: string): number {
  if (!word) return 0;
  let count = 0;
  let index = 0;
  const lowerText = text.toLowerCase();
  const lowerWord = word.toLowerCase();
  while ((index = lowerText.indexOf(lowerWord, index)) !== -1) {
    count += 1;
    index += word.length;
  }
  return count;
}
function firstLineOf(text: string): string {
  const line = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
  return line.length > 40 ? line.slice(0, 40) + '…' : line;
}
function lastLineOf(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const line = lines[lines.length - 1] || '';
  return line.length > 40 ? line.slice(0, 40) + '…' : line;
}
function vectorSimilarity(a: string, b: string): number {
  const nGram = (text: string, size: number): Map<string, number> => {
    const map = new Map<string, number>();
    for (let i = 0; i <= text.length - size; i += 1) {
      const gram = text.slice(i, i + size);
      map.set(gram, (map.get(gram) || 0) + 1);
    }
    return map;
  };
  const gramsA = nGram(a.replace(/\s+/g, ''), 2);
  const gramsB = nGram(b.replace(/\s+/g, ''), 2);
  let intersection = 0;
  let unionValues = 0;
  const allKeys = new Set<string>([...gramsA.keys(), ...gramsB.keys()]);
  allKeys.forEach((key) => {
    const vA = gramsA.get(key) || 0;
    const vB = gramsB.get(key) || 0;
    intersection += Math.min(vA, vB);
    unionValues += Math.max(vA, vB);
  });
  if (unionValues === 0) return 0;
  const jaccard = intersection / unionValues;
  const lenRatio = Math.min(a.length, b.length) / Math.max(1, Math.max(a.length, b.length));
  return jaccard * 0.7 + lenRatio * 0.3;
}
function aiModeNeedSecondary(): boolean {
  return activeAiMode.value === 'rewrite';
}function platformPrompt(mode: AiMode): string {
  const content = draft.value.trim();
  if (mode === 'xiaohongshu') {
    return `你是一位资深小红书博主。请把下面的文案润色成「小红书种草风」：精致 Emoji、活泼口吻、分段留白、结尾附 5 个热门标签（#开头）。只输出润色后的文案。\n\n原始文案：\n${content}`;
  }
  if (mode === 'golden3s') {
    return `你是一位短视频编导。请把下面的主题/文案改写为「黄金 3 秒」短视频脚本，结构：吸睛开头（0-3秒）→ 痛点制造 → 解决方案 → 互动引导。分镜式输出，标注镜头与时长。\n\n内容：\n${content}`;
  }
  if (mode === 'titles5') {
    return `根据下面的主题，一次性生成 5 个爆款标题，分别属于：悬念型、数据型、避坑型、清单型、情绪型。每个标题一行，直接输出，不要序号解释。\n\n主题：\n${content}`;
  }
  return `请基于下面的对标文案和我的草稿：1) 判断相似度与重复段落；2) 用你自己的表达二次原创改写我的草稿，保留原意但避免与对标文案雷同。\n\n对标文案：\n${comparisonText.value}\n\n我的草稿：\n${content}`;
}

// ---- 素材操作 ----
function toggleTag(tag: string): void {
  if (selectedTags.value.includes(tag)) selectedTags.value = selectedTags.value.filter((t) => t !== tag);
  else selectedTags.value.push(tag);
}
function addNote(): void {
  const text = noteInput.value.trim();
  if (!text) return;
  notes.value.unshift({ id: createId(), text, tags: [...selectedTags.value], images: [], createdAt: Date.now() });
  noteInput.value = '';
  selectedTags.value = [];
  setToast('已保存到素材库');
}
function removeNote(id: string): void {
  notes.value = notes.value.filter((note) => note.id !== id);
}
function insertNoteIntoDraft(note: FireNote): void {
  const insertText = note.text + '\n';
  draft.value = draft.value ? draft.value + '\n' + insertText : insertText;
  setToast('已引用素材到创作区');
}
function insertFromNotes(): void {
  if (!notes.value.length) { setToast('素材库为空'); return; }
  const insertText = notes.value.map((note) => note.text).join('\n');
  draft.value = draft.value ? draft.value + '\n' + insertText : insertText;
  setToast(`已批量引用 ${notes.value.length} 条素材`);
}
function clearAll(): void {
  draft.value = '';
  notes.value = [];
  aiResult.value = '';
  comparisonText.value = '';
  noteInput.value = '';
  setToast('已清空全部内容');
}

// ---- 剪贴板复制 ----
async function copyText(value: string, successMessage: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    setToast(successMessage);
  } catch {
    setToast('复制失败，请检查浏览器权限');
  }
}
function copyDraft(): void { void copyText(draft.value, '已复制草稿'); }
function copyAiResult(): void { void copyText(aiResult.value, '已复制 AI 输出'); }

// ---- AI 配置 ----
function configureKey(): void {
  editingKey.value = true;
  apiKeyInput.value = apiKey.value;
}
function saveKey(): void {
  const key = apiKeyInput.value.trim();
  if (!key) { setToast('请输入 API Key'); return; }
  apiKey.value = key;
  localStorage.setItem(API_KEY_STORAGE, key);
  editingKey.value = false;
  setToast('API Key 已保存到本地');
}
function useAiResult(): void {
  if (!aiResult.value) return;
  draft.value = aiResult.value;
  setToast('已应用 AI 结果到创作区');
}

// ---- DeepSeek 流式调用 ----
async function runAi(): Promise<void> {
  if (!apiKey.value) { setToast('请先配置 DeepSeek API Key'); return; }
  if (!draft.value.trim() && !comparisonText.value.trim()) { setToast('创作区或对标文案为空'); return; }
  aiResult.value = '';
  aiStreaming.value = true;
  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey.value}` },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        stream: true,
        messages: [
          { role: 'system', content: '你是一个专业的新媒体内容创作助手，输出要精炼、实用、可直接使用。' },
          { role: 'user', content: platformPrompt(activeAiMode.value) },
        ],
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败（${response.status}）：${errorText.slice(0, 200)}`);
    }
    if (!response.body) throw new Error('当前浏览器不支持流式读取');
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n');
      buffer = chunks.pop() || '';
      for (const line of chunks) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) aiResult.value += delta;
        } catch {
          // 跳过不完整分片
        }
      }
    }
    aiStreaming.value = false;
    if (!aiResult.value) setToast('AI 返回为空，请检查 Key 或网络');
    else setToast('AI 生成完成');
  } catch (error) {
    aiStreaming.value = false;
    setToast(error instanceof Error ? error.message : 'AI 调用失败');
  }
}

// ---- 违禁词 ----
function refreshWordList(): void {
  void fetch('/api/forbidden-words', { headers: { Accept: 'application/json' } })
    .then((response) => (response.ok ? response.json() : Promise.resolve(null)))
    .then((data) => {
      if (data && Array.isArray(data.words) && data.words.length) {
        const serverWords: ForbiddenWord[] = data.words.map((item: any) => ({
          word: String(item.word || ''),
          replacement: String(item.replacement || '平替'),
          platforms: item.platforms || [],
          source: data.source || 'server',
        })).filter((item: ForbiddenWord) => item.word);
        mergeForbiddenWords(serverWords);
        setToast(`热更新成功：词库现共 ${forbiddenWords.value.length} 条`);
      } else {
        setToast('后端词库不可用，继续使用内置词库');
      }
    })
    .catch(() => setToast('后端词库拉取失败，使用内置词库'));
}
function mergeForbiddenWords(extra: ForbiddenWord[]): void {
  const map = new Map<string, ForbiddenWord>();
  forbiddenWords.value.forEach((item) => map.set(item.word, item));
  extra.forEach((item) => map.set(item.word, item));
  forbiddenWords.value = Array.from(map.values());
}
function addCustomWord(): void {
  const input = customWord.value.trim();
  if (!input) return;
  const [word = '', replacement = '平替'] = input.split('|').map((s) => s.trim());
  if (!word) return;
  forbiddenWords.value.push({ word, replacement });
  customWord.value = '';
  setToast(`已添加违禁词：${word}`);
}
function replaceAll(word: string, replacement: string): void {
  if (!draft.value) return;
  const re = new RegExp(escapeRegExp(word), 'g');
  draft.value = draft.value.replace(re, replacement);
  setToast(`已替换「${word}」→「${replacement}」`);
}
function replaceAllHits(): void {
  complianceHits.value.forEach((hit) => replaceAll(hit.word, hit.replacement));
  setToast('一键清洗完成');
}
function clearHits(): void {
  setToast('当前命中提示已忽略');
}

// ---- 防折叠 ----
function insertInvisibleChar(): void {
  if (!draft.value) return;
  draft.value = draft.value.split('\n').map((line) => line + '\u200b').join('\n');
  setToast('已插入隐形字符，防折叠生效');
}// ---- 导出 ----
function xiaohongshuText(): string {
  const body = draft.value.trim();
  const tags = ['#好物分享', '#种草日记', '#真实测评', '#日常碎片', '#生活记录'];
  return `${body}\n\n${tags.join(' ')}`;
}
function wechatHtml(): string {
  const body = draft.value.trim().split('\n').map((line) => line.trim()).filter(Boolean)
    .map((line) => `<p style="margin:16px 0;line-height:1.9;font-size:15px;color:#333;letter-spacing:0.02em;">${escapeHtml(line)}</p>`)
    .join('\n');
  return `<!-- 公众号富文本，可直接粘贴进入公众号后台 -->\n<section style="max-width:677px;margin:0 auto;padding:24px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">\n${body}\n</section>`;
}
function zhihuMarkdown(): string {
  return draft.value.trim();
}
function exportPreview(targetId: string): string {
  if (!draft.value) return '（创作区为空，请先填写内容）';
  if (targetId === 'xiaohongshu') return xiaohongshuText();
  if (targetId === 'wechat') return '<section>… 富文本 HTML，复制后可粘贴公众号后台 …</section>';
  return zhihuMarkdown();
}
function copyExport(targetId: string): void {
  if (!draft.value) return;
  if (targetId === 'xiaohongshu') void copyText(xiaohongshuText(), '已复制小红书版（含 Emoji 与标签）');
  else if (targetId === 'wechat') void copyText(wechatHtml(), '已复制公众号富文本 HTML');
  else void copyText(zhihuMarkdown(), '已复制知乎/头条 Markdown');
}

// ---- 初始化 ----
const builtInWords: ForbiddenWord[] = [
  { word: '最便宜', replacement: '性价比高' },
  { word: '第一', replacement: '首选' },
  { word: '全网最低', replacement: '相对划算' },
  { word: '100%', replacement: '绝大多数' },
  { word: '绝对', replacement: '一定' },
  { word: '国家级', replacement: '专业级' },
  { word: '世界级', replacement: '行业领先' },
  { word: '加微信', replacement: '私信联系' },
  { word: '微信', replacement: '主页沟通' },
  { word: '点击链接', replacement: '查看主页' },
  { word: '免费领取', replacement: '限时体验' },
  { word: '保证不反弹', replacement: '坚持改善' },
  { word: '立即见效', replacement: '持续使用' },
  { word: '药到病除', replacement: '辅助改善' },
  { word: '包治百病', replacement: '针对性改善' },
  { word: '躺着赚', replacement: '轻松获得' },
  { word: '稳赚不赔', replacement: '相对稳健' },
  { word: '暴富', replacement: '增收' },
  { word: '内幕', replacement: '行业观察' },
  { word: '揭秘', replacement: '分享' },
  { word: '震惊', replacement: '没想到' },
  { word: '必看', replacement: '值得看' },
  { word: '不看后悔', replacement: '建议收藏' },
  { word: '抽奖', replacement: '互动活动' },
  { word: '转发抽奖', replacement: '参与互动' },
  { word: '刷单', replacement: '兼职合作' },
  { word: '转账', replacement: '资金往来' },
];
mergeForbiddenWords(builtInWords);

onMounted(() => {
  refreshWordList();
});
</script>