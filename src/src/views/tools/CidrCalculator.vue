<template>
  <div class="theme-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
    <BreadcrumbNav label="CIDR 子网划分与重叠校验" />

    <div class="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
      <!-- 左侧：输入与控制 -->
      <section class="space-y-4">
        <div class="liquid-glass p-5 space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-inset text-[0.75rem] text-zinc-300 text-glass-sm mb-3">
                <IconNetwork class="w-4 h-4 text-ios-blue" />
                纯前端 · IPv4 · 位运算
              </div>
              <h1 class="text-2xl font-bold text-white tracking-[-0.03em] text-glass">CIDR 子网划分与重叠校验器</h1>
              <p class="mt-2 text-[0.875rem] text-zinc-400 leading-relaxed text-glass-sm">
                支持动态多网段输入、网段重叠检测、可视化区间条与 ACL 脚本导出。
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button type="button" @click="applyPreset('overlap')" class="px-3 py-2.5 rounded-[16px] liquid-glass-inset text-left transition-all hover:bg-white/10">
              <p class="text-[0.8125rem] font-medium text-white text-glass">网工经典重叠测试</p>
              <p class="text-[0.6875rem] text-zinc-500 mt-0.5 text-glass-sm">10.10.1.0/24 · 10.10.0.0/23</p>
            </button>
            <button type="button" @click="applyPreset('classful')" class="px-3 py-2.5 rounded-[16px] liquid-glass-inset text-left transition-all hover:bg-white/10">
              <p class="text-[0.8125rem] font-medium text-white text-glass">A/B/C 类标准子网</p>
              <p class="text-[0.6875rem] text-zinc-500 mt-0.5 text-glass-sm">10.0.0.0/8 · 172.16.0.0/12 · 192.168.0.0/16</p>
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button type="button" @click="addRow('')" class="btn-ios btn-ios-primary inline-flex items-center gap-2">
              <span class="text-base leading-none">+</span>
              添加网段
            </button>
            <button type="button" @click="resetAll" class="btn-ios btn-ios-glass inline-flex items-center gap-2">
              重置
            </button>
          </div>
        </div>

        <div class="liquid-glass p-5 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-white text-glass">网段输入</h2>
              <p class="text-[0.75rem] text-zinc-500 text-glass-sm">支持直接输入 CIDR，如 10.10.1.0/24</p>
            </div>
            <span class="text-[0.75rem] px-2.5 py-1 rounded-full liquid-glass-inset text-zinc-400 text-glass-sm">{{ analysis.valid.length }} 个有效</span>
          </div>

          <div class="space-y-3">
            <div v-for="row in rows" :key="row.id" class="flex gap-2 items-start">
              <div class="flex-1 min-w-0">
                <input
                  v-model="row.value"
                  type="text"
                  inputmode="text"
                  spellcheck="false"
                  placeholder="10.10.1.0/24"
                  class="w-full px-4 py-3 rounded-[16px] liquid-glass-inset text-white placeholder:text-zinc-500 text-[0.9375rem] tracking-[-0.01em] outline-none transition-all"
                  :class="rowClass(row.id)"
                />
                <p v-if="rowError(row.id)" class="mt-1.5 text-[0.75rem] text-ios-red text-glass-sm">{{ rowError(row.id) }}</p>
              </div>
              <button
                type="button"
                @click="removeRow(row.id)"
                class="shrink-0 px-3 py-3 rounded-[16px] liquid-glass-inset text-[0.75rem] text-zinc-400 hover:text-white transition-colors"
                :disabled="rows.length === 1"
                :class="rows.length === 1 ? 'opacity-45 cursor-not-allowed' : ''"
              >
                删除
              </button>
            </div>
          </div>

          <p class="text-[0.75rem] text-zinc-500 leading-relaxed text-glass-sm">
            可输入任意主机地址加掩码，系统会自动换算网络地址、广播地址、掩码、反掩码、可用范围与主机数。
          </p>
        </div>

        <div class="liquid-glass p-5 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-white text-glass">ACL 脚本导出</h2>
              <p class="text-[0.75rem] text-zinc-500 text-glass-sm">一键生成华为 / 思科可直接复制的规则</p>
            </div>
            <button type="button" @click="copyAclScript" class="btn-ios btn-ios-glass inline-flex items-center gap-2">
              <IconCopy v-if="!copyHint" class="w-4 h-4" />
              <IconCheck v-else class="w-4 h-4 text-ios-green" />
              {{ copyHint || '复制 ACL' }}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-for="vendor in aclVendors"
              :key="vendor.key"
              type="button"
              @click="aclVendor = vendor.key"
              class="px-3 py-2 rounded-full text-[0.8125rem] font-medium transition-all text-glass-sm"
              :class="aclVendor === vendor.key ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/20' : 'liquid-glass-inset text-zinc-300 hover:text-white'"
            >
              {{ vendor.label }}
            </button>
          </div>

          <pre class="rounded-[20px] p-4 bg-black/30 border border-white/10 text-[0.8125rem] text-zinc-200 overflow-auto whitespace-pre-wrap leading-relaxed text-glass-sm min-h-40">{{ aclScript }}</pre>
        </div>
      </section>

      <!-- 右侧：结果与可视化 -->
      <section class="space-y-4">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="liquid-glass p-4">
            <p class="text-[0.75rem] text-zinc-500 text-glass-sm">总输入</p>
            <p class="mt-1 text-2xl font-bold text-white text-glass">{{ analysis.parsed.length }}</p>
          </div>
          <div class="liquid-glass p-4">
            <p class="text-[0.75rem] text-zinc-500 text-glass-sm">有效网段</p>
            <p class="mt-1 text-2xl font-bold text-white text-glass">{{ analysis.valid.length }}</p>
          </div>
          <div class="liquid-glass p-4">
            <p class="text-[0.75rem] text-zinc-500 text-glass-sm">重叠冲突</p>
            <p class="mt-1 text-2xl font-bold text-ios-red text-glass">{{ analysis.overlapPairs.length }}</p>
          </div>
          <div class="liquid-glass p-4">
            <p class="text-[0.75rem] text-zinc-500 text-glass-sm">已导出规则</p>
            <p class="mt-1 text-2xl font-bold text-white text-glass">{{ analysis.valid.length }}</p>
          </div>
        </div>

        <div v-if="analysis.overlapPairs.length" class="liquid-glass border border-ios-red/30 bg-ios-red/10 p-4">
          <div class="flex items-start gap-3">
            <IconAlertTriangle class="w-5 h-5 text-ios-red shrink-0 mt-0.5" />
            <div>
              <p class="text-[0.9375rem] font-semibold text-ios-red text-glass">检测到 {{ analysis.overlapPairs.length }} 组重叠冲突</p>
              <p class="text-[0.8125rem] text-ios-red/80 mt-1 text-glass-sm">网段 A 与网段 B 存在重叠冲突，请先消除冲突再下发配置。</p>
            </div>
          </div>
        </div>

        <div v-else class="liquid-glass border border-ios-green/20 bg-ios-green/10 p-4">
          <div class="flex items-start gap-3">
            <IconCheck class="w-5 h-5 text-ios-green shrink-0 mt-0.5" />
            <div>
              <p class="text-[0.9375rem] font-semibold text-ios-green text-glass">当前网段无重叠冲突</p>
              <p class="text-[0.8125rem] text-ios-green/80 mt-1 text-glass-sm">所有有效 CIDR 都能独立计算，ACL 脚本可直接导出。</p>
            </div>
          </div>
        </div>

        <div class="liquid-glass p-5 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-white text-glass">IPv4 空间区间图</h2>
              <p class="text-[0.75rem] text-zinc-500 text-glass-sm">左侧为 0.0.0.0，右侧为 255.255.255.255</p>
            </div>
            <span class="text-[0.75rem] px-2.5 py-1 rounded-full liquid-glass-inset text-zinc-400 text-glass-sm">32 位映射</span>
          </div>

          <div class="relative h-20 rounded-[20px] overflow-hidden border border-white/10 bg-slate-950/60">
            <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.10)_1px,transparent_1px)] bg-[length:12.5%_100%]"></div>
            <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]"></div>

            <div
              v-for="tick in barTicks"
              :key="tick.label"
              class="absolute top-0 bottom-0 border-l border-white/10"
              :style="{ left: `${tick.left}%` }"
            >
              <span class="absolute top-2 -translate-x-1/2 text-[0.625rem] text-zinc-500 whitespace-nowrap">{{ tick.label }}</span>
            </div>

            <div
              v-for="segment in visualSegments"
              :key="segment.id"
              class="absolute top-8 bottom-3 rounded-[14px] border shadow-lg overflow-hidden"
              :class="segment.segmentClass"
              :style="segmentStyle(segment)"
              :title="segment.title"
            >
              <div class="absolute inset-0 opacity-85" :class="segment.fillClass"></div>
              <div v-if="segment.showLabel" class="relative z-10 px-2.5 py-1 text-[0.7rem] font-medium truncate">{{ segment.label }}</div>
            </div>

            <div
              v-for="span in mergedOverlapSpans"
              :key="`${span.start}-${span.end}`"
              class="absolute top-8 bottom-3 rounded-[14px] border border-ios-red/60 shadow-lg overflow-hidden z-20"
              :style="overlapStyle(span)"
              title="重叠区间"
            >
              <div class="absolute inset-0" :style="overlapPatternStyle"></div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            <div
              v-for="segment in visualSegments"
              :key="`legend-${segment.id}`"
              class="flex items-center gap-2 px-3 py-2 rounded-[16px] liquid-glass-inset"
            >
              <span class="w-3 h-3 rounded-full shrink-0" :class="segment.legendDotClass"></span>
              <div class="min-w-0 flex-1">
                <p class="text-[0.8125rem] text-white truncate text-glass">{{ segment.label }}</p>
                <p class="text-[0.6875rem] text-zinc-500 text-glass-sm">{{ formatPercent(segment.widthPct) }} · {{ segment.networkAddress }} - {{ segment.broadcastAddress }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-white text-glass">计算结果</h2>
            <span class="text-[0.75rem] text-zinc-500 text-glass-sm">按输入顺序展示</span>
          </div>

          <div v-for="item in analysis.parsed" :key="item.id" class="liquid-glass p-4" :class="item.valid ? (item.conflictCount ? 'border border-ios-red/20' : '') : 'border border-ios-red/30'">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-2">
                  <p class="text-[0.9375rem] font-semibold text-white tracking-[-0.02em] text-glass">{{ item.input || `网段 ${item.index + 1}` }}</p>
                  <span v-if="item.valid" class="px-2.5 py-0.5 rounded-full text-[0.6875rem] font-medium bg-ios-green/20 text-ios-green">有效</span>
                  <span v-else class="px-2.5 py-0.5 rounded-full text-[0.6875rem] font-medium bg-ios-red/20 text-ios-red">无效</span>
                  <span v-if="item.valid && item.conflictCount" class="px-2.5 py-0.5 rounded-full text-[0.6875rem] font-medium bg-ios-red/20 text-ios-red">冲突 {{ item.conflictCount }} 组</span>
                </div>
                <p v-if="!item.valid" class="text-[0.8125rem] text-ios-red text-glass-sm">{{ item.error }}</p>
              </div>
              <span v-if="item.valid" class="text-[0.75rem] text-zinc-500 text-glass-sm">#{{ item.index + 1 }}</span>
            </div>

            <div v-if="item.valid" class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[0.8125rem]">
              <div class="rounded-[16px] liquid-glass-inset p-3">
                <p class="text-zinc-500 text-[0.6875rem] text-glass-sm">网络地址 / 广播地址</p>
                <p class="mt-1 text-white text-glass">{{ item.networkAddress }}</p>
                <p class="text-zinc-400 text-glass-sm">{{ item.broadcastAddress }}</p>
              </div>
              <div class="rounded-[16px] liquid-glass-inset p-3">
                <p class="text-zinc-500 text-[0.6875rem] text-glass-sm">子网掩码 / 反掩码</p>
                <p class="mt-1 text-white text-glass">{{ item.maskAddress }}</p>
                <p class="text-zinc-400 text-glass-sm">{{ item.wildcardAddress }}</p>
              </div>
              <div class="rounded-[16px] liquid-glass-inset p-3">
                <p class="text-zinc-500 text-[0.6875rem] text-glass-sm">可用 IP 范围</p>
                <p class="mt-1 text-white text-glass">{{ item.usableRangeText }}</p>
              </div>
              <div class="rounded-[16px] liquid-glass-inset p-3">
                <p class="text-zinc-500 text-[0.6875rem] text-glass-sm">总主机数 / 可用主机</p>
                <p class="mt-1 text-white text-glass">{{ formatBigInt(item.hostCount) }} / {{ formatBigInt(item.usableHosts) }}</p>
              </div>
            </div>

            <div v-if="item.valid && item.conflicts.length" class="mt-4 space-y-2">
              <p class="text-[0.75rem] text-ios-red font-medium text-glass-sm">冲突明细</p>
              <div v-for="conflict in item.conflicts" :key="conflict.key" class="px-3 py-2 rounded-[14px] bg-ios-red/10 border border-ios-red/20 text-[0.8125rem] text-ios-red text-glass-sm">
                {{ conflict.text }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useHead } from '@vueuse/head';
import { IconNetwork, IconCopy, IconCheck, IconAlertTriangle } from '@tabler/icons-vue';
import BreadcrumbNav from '../../components/BreadcrumbNav.vue';

useHead({
  title: 'CIDR 子网划分与重叠校验器 - proHub',
  meta: [
    {
      name: 'description',
      content: '纯前端 CIDR 子网划分工具，支持多网段输入、重叠检测、可视化区间条和华为/Cisco ACL 脚本导出。',
    },
    {
      name: 'keywords',
      content: 'CIDR,子网划分,重叠检测,IPv4,ACL,华为,思科,网络工具',
    },
  ],
});

const IPV4_MAX = 4294967295n;
const IPV4_SPACE = 4294967296n;
const BAR_MIN_WIDTH = 0.18;

const presets = {
  overlap: ['10.10.1.0/24', '10.10.0.0/23', '10.10.1.128/25', '10.10.2.0/24'],
  classful: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
};

const aclVendors = [
  { key: 'huawei', label: '华为 HUAWEI' },
  { key: 'cisco', label: '思科 Cisco' },
];

const segmentPalette = [
  { fillClass: 'bg-cyan-500/45', borderClass: 'border-cyan-300/60', legendDotClass: 'bg-cyan-400' },
  { fillClass: 'bg-emerald-500/45', borderClass: 'border-emerald-300/60', legendDotClass: 'bg-emerald-400' },
  { fillClass: 'bg-amber-500/45', borderClass: 'border-amber-300/60', legendDotClass: 'bg-amber-400' },
  { fillClass: 'bg-violet-500/45', borderClass: 'border-violet-300/60', legendDotClass: 'bg-violet-400' },
  { fillClass: 'bg-sky-500/45', borderClass: 'border-sky-300/60', legendDotClass: 'bg-sky-400' },
  { fillClass: 'bg-fuchsia-500/45', borderClass: 'border-fuchsia-300/60', legendDotClass: 'bg-fuchsia-400' },
];

const barTicks = [
  { left: 0, label: '0.0.0.0' },
  { left: 25, label: '25%' },
  { left: 50, label: '50%' },
  { left: 75, label: '75%' },
  { left: 100, label: '255.255.255.255' },
];

let rowSeed = 1;
function createRow(value = '') {
  return { id: rowSeed++, value };
}

const rows = ref([createRow('10.10.1.0/24'), createRow('10.10.0.0/23')]);
const aclVendor = ref('huawei');
const copyHint = ref('');

function addRow(value = '') {
  rows.value.push(createRow(value));
}

function removeRow(id) {
  if (rows.value.length === 1) {
    rows.value[0].value = '';
    return;
  }
  rows.value = rows.value.filter((row) => row.id !== id);
}

function applyPreset(key) {
  const preset = presets[key] || [];
  rows.value = preset.map((value) => createRow(value));
}

function resetAll() {
  rows.value = [createRow('10.10.1.0/24'), createRow('10.10.0.0/23')];
  aclVendor.value = 'huawei';
  copyHint.value = '';
}

function parseIpv4(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let result = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    result = (result << 8n) + BigInt(value);
  }
  return result;
}

function intToIpv4(value) {
  return [
    Number((value >> 24n) & 255n),
    Number((value >> 16n) & 255n),
    Number((value >> 8n) & 255n),
    Number(value & 255n),
  ].join('.');
}

function maskFromPrefix(prefix) {
  if (prefix === 0) return 0n;
  return IPV4_MAX ^ ((1n << BigInt(32 - prefix)) - 1n);
}

function bigToPercent(value, denominator) {
  return Number((value * 1000000n) / denominator) / 10000;
}

function formatBigInt(value) {
  return value == null ? '—' : value.toLocaleString('en-US');
}

function formatPercent(value) {
  return `${value.toFixed(6)}%`;
}

function formatRange(start, end) {
  return start === end ? intToIpv4(start) : `${intToIpv4(start)} - ${intToIpv4(end)}`;
}

function compareBigInt(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function classifyRelation(a, b) {
  if (a.network === b.network && a.broadcast === b.broadcast) return 'identical';
  if (a.network <= b.network && a.broadcast >= b.broadcast) return 'contains';
  if (b.network <= a.network && b.broadcast >= a.broadcast) return 'inside';
  return 'partial';
}

function relationText(relation) {
  return {
    identical: '完全重合',
    contains: '完全包含',
    inside: '被包含',
    partial: '部分相交',
  }[relation] || '相交';
}

function overlapText(relation, a, b, start, end) {
  return `${a.input} 与 ${b.input} 存在${relationText(relation)}，重叠区间 ${formatRange(start, end)}`;
}

function parseCidr(rawValue, index, id) {
  const normalized = String(rawValue || '').trim().replace(/\s+/g, '');
  if (!normalized) {
    return { id, index, input: '', valid: false, error: '请输入 CIDR 网段' };
  }

  const match = normalized.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(3[0-2]|[12]?\d)$/);
  if (!match) {
    return { id, index, input: normalized, valid: false, error: '格式应为 10.10.1.0/24' };
  }

  const ip = parseIpv4(match[1]);
  if (ip === null) {
    return { id, index, input: normalized, valid: false, error: 'IP 地址段必须是 0-255 的四段数字' };
  }

  const prefix = Number(match[2]);
  const mask = maskFromPrefix(prefix);
  const wildcard = IPV4_MAX ^ mask;
  const network = ip & mask;
  const broadcast = network | wildcard;
  const hostCount = 1n << BigInt(32 - prefix);
  const usableHosts = prefix >= 31 ? hostCount : hostCount - 2n;
  const usableStart = prefix >= 31 ? network : network + 1n;
  const usableEnd = prefix >= 31 ? broadcast : broadcast - 1n;

  return {
    id,
    index,
    input: normalized,
    prefix,
    valid: true,
    ip,
    mask,
    wildcard,
    network,
    broadcast,
    hostCount,
    usableHosts,
    usableStart,
    usableEnd,
    networkAddress: intToIpv4(network),
    broadcastAddress: intToIpv4(broadcast),
    maskAddress: intToIpv4(mask),
    wildcardAddress: intToIpv4(wildcard),
    usableRangeText: formatRange(usableStart, usableEnd),
    networkPct: bigToPercent(network, IPV4_SPACE),
    widthPct: bigToPercent(hostCount, IPV4_SPACE),
  };
}

function mergeRanges(ranges) {
  if (!ranges.length) return [];

  const sorted = [...ranges].sort((a, b) => compareBigInt(a.start, b.start) || compareBigInt(a.end, b.end));
  const merged = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end + 1n) {
      if (current.end > last.end) last.end = current.end;
      continue;
    }
    merged.push({ ...current });
  }

  return merged.map((item) => ({
    ...item,
    leftPct: bigToPercent(item.start, IPV4_MAX),
    widthPct: bigToPercent(item.end - item.start + 1n, IPV4_SPACE),
  }));
}

const analysis = computed(() => {
  const parsed = rows.value.map((row, index) => parseCidr(row.value, index, row.id));
  const valid = parsed.filter((item) => item.valid);
  const sortedValid = [...valid].sort((a, b) => compareBigInt(a.network, b.network) || compareBigInt(a.broadcast, b.broadcast));

  const overlapPairs = [];
  const conflictMap = {};

  for (let i = 0; i < sortedValid.length; i += 1) {
    for (let j = i + 1; j < sortedValid.length; j += 1) {
      const a = sortedValid[i];
      const b = sortedValid[j];
      const start = a.network > b.network ? a.network : b.network;
      const end = a.broadcast < b.broadcast ? a.broadcast : b.broadcast;
      if (start > end) continue;

      const relation = classifyRelation(a, b);
      const conflict = {
        key: `${a.id}-${b.id}`,
        aId: a.id,
        bId: b.id,
        relation,
        start,
        end,
        leftPct: bigToPercent(start, IPV4_SPACE),
        widthPct: bigToPercent(end - start + 1n, IPV4_SPACE),
        text: overlapText(relation, a, b, start, end),
      };
      overlapPairs.push(conflict);
      conflictMap[a.id] = conflictMap[a.id] || [];
      conflictMap[b.id] = conflictMap[b.id] || [];
      conflictMap[a.id].push(conflict);
      conflictMap[b.id].push(conflict);
    }
  }

  const visualSegments = sortedValid.map((item, index) => {
    const palette = segmentPalette[index % segmentPalette.length];
    const visualWidthPct = Math.max(item.widthPct, BAR_MIN_WIDTH);
    const visualLeftPct = Math.min(item.networkPct, Math.max(0, 100 - visualWidthPct));
    return {
      ...item,
      segmentClass: `${palette.borderClass} ${conflictMap[item.id]?.length ? 'ring-1 ring-ios-red/60' : ''}`,
      fillClass: conflictMap[item.id]?.length ? 'bg-ios-red/65' : palette.fillClass,
      legendDotClass: conflictMap[item.id]?.length ? 'bg-ios-red' : palette.legendDotClass,
      showLabel: visualWidthPct >= 7,
      visualLeftPct,
      visualWidthPct,
      title: `${item.input} | ${item.networkAddress} - ${item.broadcastAddress}`,
      conflicts: conflictMap[item.id] || [],
      conflictCount: (conflictMap[item.id] || []).length,
    };
  });

  return {
    parsed: parsed.map((item) => ({
      ...item,
      conflicts: item.valid ? (conflictMap[item.id] || []) : [],
      conflictCount: item.valid ? ((conflictMap[item.id] || []).length) : 0,
    })),
    valid,
    sortedValid,
    overlapPairs,
    mergedOverlapSpans: mergeRanges(overlapPairs.map((item) => ({ start: item.start, end: item.end }))),
    visualSegments,
    conflictMap,
  };
});

const aclScript = computed(() => {
  const lines = analysis.value.sortedValid.map((item, index) => {
    const ruleNo = (index + 1) * 5;
    if (aclVendor.value === 'cisco') {
      return `access-list 100 permit ip ${item.networkAddress} ${item.wildcardAddress} any`;
    }
    return `rule ${ruleNo} permit ip source ${item.networkAddress} ${item.wildcardAddress}`;
  });

  if (!lines.length) return '请先输入至少一个有效 CIDR 网段。';
  return lines.join('\n');
});

function rowError(id) {
  return analysis.value.parsed.find((item) => item.id === id)?.error || '';
}

function rowClass(id) {
  const item = analysis.value.parsed.find((entry) => entry.id === id);
  if (!item) return 'border-transparent';
  if (!item.valid) return 'border-ios-red/40 focus:ring-2 focus:ring-ios-red/20';
  if (item.conflictCount) return 'border-ios-red/30 focus:ring-2 focus:ring-ios-red/20';
  return 'border-transparent focus:ring-2 focus:ring-ios-blue/20';
}

function segmentStyle(segment) {
  return {
    left: `${segment.visualLeftPct}%`,
    width: `${segment.visualWidthPct}%`,
  };
}

function overlapStyle(span) {
  return {
    left: `${span.leftPct}%`,
    width: `${Math.max(span.widthPct, BAR_MIN_WIDTH)}%`,
  };
}

const overlapPatternStyle = {
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.88) 0, rgba(239, 68, 68, 0.88) 8px, rgba(127, 29, 29, 0.95) 8px, rgba(127, 29, 29, 0.95) 16px)',
};

async function copyText(text, doneHint) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  copyHint.value = doneHint;
  setTimeout(() => {
    copyHint.value = '';
  }, 1800);
}

function copyAclScript() {
  copyText(aclScript.value, `${aclVendors.find((item) => item.key === aclVendor.value)?.label || 'ACL'} 已复制`);
}
</script>
