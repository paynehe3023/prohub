<template>
  <div class="theme-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
    <BreadcrumbNav label="全能单位换算" />

    <div class="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
      <section class="space-y-4">
        <div class="liquid-glass p-5 space-y-5">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-inset text-[0.75rem] text-zinc-300 text-glass-sm mb-3">
              <IconArrowsExchange class="w-4 h-4 text-ios-blue" />
              纯前端 · 即时换算
            </div>
            <h1 class="text-2xl font-bold text-white tracking-[-0.03em] text-glass">全能单位换算</h1>
            <p class="mt-2 text-[0.875rem] text-zinc-400 leading-relaxed text-glass-sm">长度、重量、温度、面积、体积、速度、时间、数据存储与汇率，一站完成常用换算。</p>
          </div>

          <div>
            <label class="block text-[0.8125rem] font-medium text-zinc-300 text-glass-sm mb-2">换算类型</label>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="item in categories" :key="item.key" type="button" @click="selectCategory(item.key)" class="px-3 py-2.5 rounded-[16px] text-left transition-all" :class="categoryKey === item.key ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/20' : 'liquid-glass-inset text-zinc-300 hover:text-white'">
                <span class="block text-[0.8125rem] font-medium">{{ item.label }}</span>
                <span class="block text-[0.6875rem] opacity-70 mt-0.5">{{ item.hint }}</span>
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-[0.8125rem] font-medium text-zinc-300 text-glass-sm mb-2">数值</label>
              <input v-model="amount" type="number" inputmode="decimal" step="any" class="w-full px-4 py-3 rounded-[16px] liquid-glass-inset text-white placeholder:text-zinc-500 outline-none" placeholder="输入数值" />
            </div>
            <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div><label class="block text-[0.75rem] text-zinc-500 text-glass-sm mb-2">从</label><select v-model="fromUnit" class="w-full px-3 py-3 rounded-[16px] liquid-glass-inset text-white outline-none"><option v-for="unit in activeUnits" :key="unit.key" :value="unit.key">{{ unit.label }}</option></select></div>
              <button type="button" @click="swapUnits" class="mb-0.5 p-3 rounded-full liquid-glass-inset text-ios-blue hover:text-white transition-colors" aria-label="交换单位"><IconArrowsExchange class="w-4 h-4" /></button>
              <div><label class="block text-[0.75rem] text-zinc-500 text-glass-sm mb-2">到</label><select v-model="toUnit" class="w-full px-3 py-3 rounded-[16px] liquid-glass-inset text-white outline-none"><option v-for="unit in unitList" :key="unit.key" :value="unit.key">{{ unit.label }}</option></select></div>
            </div>
          </div>
        </div>

        <div v-if="isCurrency" class="liquid-glass p-5 space-y-3">
          <div class="flex items-center justify-between gap-3"><div><h2 class="text-base font-semibold text-white text-glass">实时汇率</h2><p class="text-[0.75rem] text-zinc-500 text-glass-sm">数据来自公开汇率接口，可配置 API 地址</p></div><button type="button" @click="loadRates" :disabled="ratesLoading" class="btn-ios btn-ios-glass">{{ ratesLoading ? '更新中…' : '刷新' }}</button></div>
          <p v-if="ratesError" class="text-[0.8125rem] text-ios-red text-glass-sm">{{ ratesError }} 已使用本地缓存或内置汇率。</p>
          <p v-else class="text-[0.75rem] text-zinc-500 text-glass-sm">{{ ratesUpdated ? `更新时间：${ratesUpdated}` : '正在获取最新汇率…' }}</p>
        </div>
      </section>

      <section class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="liquid-glass p-4"><p class="text-[0.75rem] text-zinc-500 text-glass-sm">类型</p><p class="mt-1 text-lg font-bold text-white text-glass">{{ activeCategory.label }}</p></div>
          <div class="liquid-glass p-4"><p class="text-[0.75rem] text-zinc-500 text-glass-sm">输入</p><p class="mt-1 text-2xl font-bold text-white text-glass">{{ amount || '0' }}</p></div>
          <div class="liquid-glass p-4"><p class="text-[0.75rem] text-zinc-500 text-glass-sm">结果</p><p class="mt-1 text-2xl font-bold text-ios-blue text-glass">{{ formattedResult }}</p></div>
          <div class="liquid-glass p-4"><p class="text-[0.75rem] text-zinc-500 text-glass-sm">换算关系</p><p class="mt-1 text-sm font-semibold text-white text-glass">1 {{ fromUnitInfo.label }} = {{ formatNumber(conversionFactor) }} {{ toUnitInfo.label }}</p></div>
        </div>

        <div class="liquid-glass p-5 space-y-5">
          <div class="flex items-center justify-between gap-3"><div><h2 class="text-base font-semibold text-white text-glass">换算结果</h2><p class="text-[0.75rem] text-zinc-500 text-glass-sm">结果会随输入即时更新</p></div><button type="button" @click="copyResult" class="btn-ios btn-ios-glass inline-flex items-center gap-2"><IconCheck v-if="copyHint" class="w-4 h-4 text-ios-green" /><IconCopy v-else class="w-4 h-4" />{{ copyHint || '复制结果' }}</button></div>
          <div class="rounded-[24px] liquid-glass-inset p-6 sm:p-8 text-center"><p class="text-[0.8125rem] text-zinc-500 text-glass-sm">{{ amount || '0' }} {{ fromUnitInfo.label }}</p><p class="my-3 text-4xl sm:text-5xl font-bold text-white tracking-[-0.04em] text-glass">{{ formattedResult }}</p><p class="text-[0.9375rem] text-zinc-300 text-glass-sm">{{ toUnitInfo.label }}</p></div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div v-for="unit in unitList" :key="unit.key" class="flex items-center justify-between gap-3 px-4 py-3 rounded-[16px] liquid-glass-inset"><span class="text-[0.8125rem] text-zinc-300 text-glass-sm">{{ unit.label }}</span><span class="text-[0.875rem] font-semibold text-white text-glass">{{ formatNumber(convertTo(unit.key)) }}</span></div></div>
        </div>

        <div class="liquid-glass p-5"><h2 class="text-base font-semibold text-white text-glass">使用说明</h2><p class="mt-2 text-[0.8125rem] text-zinc-400 leading-relaxed text-glass-sm">选择换算类型后输入数值，支持小数和负数。温度按摄氏度、华氏度和开尔文精确换算；汇率默认以 USD 为基准，并在浏览器中缓存最近一次成功数据。</p></div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { IconArrowsExchange, IconCopy, IconCheck } from '@tabler/icons-vue';
import BreadcrumbNav from '../../components/BreadcrumbNav.vue';

useHead({ title: '全能单位换算 - proHub', meta: [{ name: 'description', content: '支持长度、重量、温度、面积、体积、速度、时间、数据存储和实时汇率的在线单位换算工具。' }, { name: 'keywords', content: '单位换算,汇率,长度,重量,温度,面积,体积,速度,时间,数据存储' }] });

const categories = [
  { key: 'length', label: '长度', hint: '米 / 英尺' }, { key: 'mass', label: '重量', hint: '千克 / 磅' }, { key: 'temperature', label: '温度', hint: '摄氏 / 华氏' }, { key: 'area', label: '面积', hint: '平方米 / 公顷' },
  { key: 'volume', label: '体积', hint: '升 / 加仑' }, { key: 'speed', label: '速度', hint: '公里 / 英里' }, { key: 'time', label: '时间', hint: '秒 / 小时' }, { key: 'data', label: '数据存储', hint: '字节 / GiB' }, { key: 'currency', label: '汇率', hint: 'USD / CNY' },
];
const definitions = {
  length: [['mm', '毫米', 0.001], ['cm', '厘米', 0.01], ['m', '米', 1], ['km', '千米', 1000], ['in', '英寸', 0.0254], ['ft', '英尺', 0.3048], ['mi', '英里', 1609.344]],
  mass: [['mg', '毫克', 0.000001], ['g', '克', 0.001], ['kg', '千克', 1], ['t', '吨', 1000], ['oz', '盎司', 0.028349523125], ['lb', '磅', 0.45359237]],
  area: [['cm2', '平方厘米', 0.0001], ['m2', '平方米', 1], ['km2', '平方千米', 1000000], ['ha', '公顷', 10000], ['ft2', '平方英尺', 0.09290304], ['acre', '英亩', 4046.8564224]],
  volume: [['ml', '毫升', 0.001], ['l', '升', 1], ['m3', '立方米', 1000], ['cm3', '立方厘米', 0.001], ['gal', '美制加仑', 3.785411784], ['cup', '杯', 0.2365882365]],
  speed: [['mps', '米/秒', 1], ['kph', '千米/小时', 0.2777777778], ['mph', '英里/小时', 0.44704], ['knot', '节', 0.5144444444]],
  time: [['ms', '毫秒', 0.001], ['s', '秒', 1], ['min', '分钟', 60], ['h', '小时', 3600], ['day', '天', 86400], ['week', '周', 604800]],
  data: [['bit', '比特', 0.125], ['byte', '字节', 1], ['kb', 'KB', 1024], ['mb', 'MB', 1048576], ['gb', 'GB', 1073741824], ['tb', 'TB', 1099511627776]],
};
const temperatureUnits = [['c', '摄氏度'], ['f', '华氏度'], ['k', '开尔文']];
const fallbackRates = { USD: 1, CNY: 7.2, EUR: 0.92, JPY: 150, GBP: 0.79, HKD: 7.8, KRW: 1350, AUD: 1.52, CAD: 1.36 };
const rateCacheKey = 'prohub-unit-converter-rates-v1';
const categoryKey = ref('length'); const amount = ref(1); const fromUnit = ref('m'); const toUnit = ref('km'); const rates = ref(fallbackRates); const ratesUpdated = ref(''); const ratesError = ref(''); const ratesLoading = ref(false); const copyHint = ref('');
const isCurrency = computed(() => categoryKey.value === 'currency');
const activeCategory = computed(() => categories.find((item) => item.key === categoryKey.value) || categories[0]);
const activeUnits = computed(() => isCurrency.value ? Object.keys(rates.value).map((key) => [key, key]) : categoryKey.value === 'temperature' ? temperatureUnits : definitions[categoryKey.value].map((item) => item.slice(0, 2)));
const unitList = computed(() => activeUnits.value.map(([key, label]) => ({ key, label })));
const fromUnitInfo = computed(() => unitList.value.find((item) => item.key === fromUnit.value) || unitList.value[0]); const toUnitInfo = computed(() => unitList.value.find((item) => item.key === toUnit.value) || unitList.value[1] || unitList.value[0]);
const conversionFactor = computed(() => isCurrency.value ? rates.value[toUnit.value] / rates.value[fromUnit.value] : convertValue(1, fromUnit.value, toUnit.value));
const result = computed(() => convertValue(Number(amount.value) || 0, fromUnit.value, toUnit.value));
const formattedResult = computed(() => formatNumber(result.value));

function formatNumber(value) { if (!Number.isFinite(value)) return '—'; return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 8 }).format(value); }
function convertValue(value, from, to) {
  if (isCurrency.value) return value * (rates.value[to] / rates.value[from]);
  if (categoryKey.value === 'temperature') { const c = from === 'c' ? value : from === 'f' ? (value - 32) * 5 / 9 : value - 273.15; return to === 'c' ? c : to === 'f' ? c * 9 / 5 + 32 : c + 273.15; }
  const list = definitions[categoryKey.value]; return value * list.find((item) => item[0] === from)[2] / list.find((item) => item[0] === to)[2];
}
function convertTo(unit) { return convertValue(Number(amount.value) || 0, fromUnit.value, unit); }
function selectCategory(key) { categoryKey.value = key; }
function swapUnits() { const old = fromUnit.value; fromUnit.value = toUnit.value; toUnit.value = old; }
async function loadRates() {
  ratesLoading.value = true; ratesError.value = '';
  const url = import.meta.env.VITE_EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest/USD';
  try { const response = await fetch(url); if (!response.ok) throw new Error('网络请求失败'); const data = await response.json(); if (!data.rates || typeof data.rates.USD !== 'number') throw new Error('接口返回数据无效'); rates.value = data.rates; ratesUpdated.value = data.time_last_update_utc || new Date().toLocaleString('zh-CN'); localStorage.setItem(rateCacheKey, JSON.stringify({ rates: data.rates, updated: ratesUpdated.value })); } catch (error) { ratesError.value = '汇率更新失败'; try { const cached = JSON.parse(localStorage.getItem(rateCacheKey)); if (cached?.rates) { rates.value = cached.rates; ratesUpdated.value = cached.updated || '本地缓存'; } } catch { /* ignore invalid cache */ } } finally { ratesLoading.value = false; }
}
async function copyResult() { try { await navigator.clipboard.writeText(`${amount.value} ${fromUnitInfo.value.label} = ${formattedResult.value} ${toUnitInfo.value.label}`); copyHint.value = '已复制'; window.setTimeout(() => { copyHint.value = ''; }, 1800); } catch { copyHint.value = '复制失败'; } }
watch(unitList, (units) => { if (!units.some((item) => item.key === fromUnit.value)) fromUnit.value = units[0]?.key; if (!units.some((item) => item.key === toUnit.value)) toUnit.value = units[1]?.key || units[0]?.key; }, { immediate: true });
onMounted(() => { try { const cached = JSON.parse(localStorage.getItem(rateCacheKey)); if (cached?.rates) { rates.value = cached.rates; ratesUpdated.value = cached.updated || '本地缓存'; } } catch { /* ignore invalid cache */ } loadRates(); });
</script>
