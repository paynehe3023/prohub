<template>
  <div class="theme-page min-h-dvh flex items-center justify-center py-10 px-4">
    <div class="w-full max-w-sm liquid-glass p-6 text-center">
      <template v-if="invalid">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ios-red/20 text-ios-red mb-4">
          <IconAlertTriangle size="28" />
        </div>
        <h1 class="text-lg font-bold text-white text-glass">链接无效</h1>
        <p class="mt-2 text-sm text-zinc-400 text-glass-sm">{{ invalidReason }}</p>
      </template>

      <template v-else-if="loading">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ios-blue/20 text-ios-blue mb-4 animate-pulse">
          <IconQrcode size="28" />
        </div>
        <h1 class="text-lg font-bold text-white text-glass">正在加载…</h1>
        <p class="mt-2 text-sm text-zinc-400 text-glass-sm">{{ hint }}</p>
      </template>

      <template v-else>
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ios-blue/20 text-ios-blue mb-4">
          <IconQrcode size="28" />
        </div>
        <h1 class="text-lg font-bold text-white text-glass">聚合收款码</h1>
        <p class="mt-2 text-sm text-zinc-400 text-glass-sm">{{ hint }}</p>

        <div class="mt-5 grid grid-cols-1 gap-2">
          <button
            v-if="wechatUrl"
            type="button"
            class="w-full rounded-xl bg-[#07C160] text-white font-medium py-3 text-sm transition active:scale-95"
            @click="go(wechatUrl)"
          >微信付款</button>
          <button
            v-if="alipayUrl"
            type="button"
            class="w-full rounded-xl bg-[#1677FF] text-white font-medium py-3 text-sm transition active:scale-95"
            @click="go(alipayUrl)"
          >支付宝付款</button>
          <button
            v-if="otherUrl"
            type="button"
            class="w-full rounded-xl bg-slate-800 text-white font-medium py-3 text-sm transition active:scale-95 dark:bg-slate-700"
            @click="go(otherUrl)"
          >打开链接</button>
        </div>
        <p v-if="autoTried" class="mt-4 text-[0.6875rem] text-zinc-500 text-glass-sm">若未自动跳转，请点击上方按钮</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
import { IconAlertTriangle, IconQrcode } from '@tabler/icons-vue';

useHead({ title: '聚合收款码 - proHub' });

const route = useRoute();
const loading = ref(false);
const invalid = ref(false);
const invalidReason = ref('该聚合码内容不完整或已被篡改，请联系码主重新生成。');
const autoTried = ref(false);
const hint = ref('正在识别扫码环境…');
const wechatUrl = ref('');
const alipayUrl = ref('');
// 其他非微信/支付宝类内容（QQ、银联、其他聚合、HTTPS 直链等），统一为兜底按钮
const otherUrl = ref('');

// 宽松校验：允许支付相关协议 + 任意 HTTPS/HTTP 链接 + 纯 token 字符串
// —— 但协议型必须落在白名单内，避免任意 scheme 被触发
const SAFE_PROTOCOL = /^(wxp:\/\/|weixin:\/\/|wx:\/\/|alipays:\/\/|alipayqr:\/\/|alipay:\/\/|qqpay:\/\/|uppay:\/\/|tenpay:\/\/|https?:\/\/|market:\/\/|qr:\/\/|ftp:\/\/)/i;

function safeValue(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return '';
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    /* 未编码的原始值 */
  }
  value = value.trim();
  if (!value) return '';
  // 看起来像 URL / 支付协议
  if (SAFE_PROTOCOL.test(value)) return value;
  // 纯标识符/短码：长度 6-2048 字符
  if (/^[A-Za-z0-9\-_=+.~@#/:?&%]{6,2048}$/.test(value)) return value;
  return '';
}

function classify(raw: string): 'wechat' | 'alipay' | 'other' | null {
  if (!raw) return null;
  if (/MicroMessenger|wxp:\/\/|weixin:\/\/|wx:\/\/|wx\.qq\.com/i.test(raw)) return 'wechat';
  if (/alipay|alipays:\/\/|alipayqr:\/\/|qr\.alipay/i.test(raw)) return 'alipay';
  // 兜底：左为微信，右为支付宝。当二者都不匹配时，右侧归 other
  return 'other';
}

function go(url: string): void {
  window.location.replace(url);
}

async function expandFromShortId(id: string): Promise<{ w: string; a: string } | null> {
  try {
    const resp = await fetch(`/api/qr/expand?id=${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data || typeof data !== 'object') return null;
    return { w: safeValue(data.w), a: safeValue(data.a) };
  } catch {
    return null;
  }
}

async function resolveParams() {
  const shortId = typeof route.query.s === 'string' ? route.query.s : '';
  let w = safeValue(route.query.w);
  let a = safeValue(route.query.a);

  if (shortId && (!w || !a)) {
    loading.value = true;
    hint.value = '正在展开短链…';
    const expanded = await expandFromShortId(shortId);
    if (expanded) {
      w = expanded.w || w;
      a = expanded.a || a;
    } else {
      invalid.value = true;
      invalidReason.value = '短链不存在或已过期，请让码主重新生成二维码。';
      loading.value = false;
      return;
    }
    loading.value = false;
  }

  if (!w && !a) {
    invalid.value = true;
    invalidReason.value = '该聚合码内容为空，请联系码主重新生成。';
    return;
  }

  // 将 w / a 按内容特征归类到对应按钮
  const wClass = classify(w);
  const aClass = classify(a);
  const assigned: Record<'wechat' | 'alipay' | 'other', string[]> = { wechat: [], alipay: [], other: [] };

  function assign(cls: 'wechat' | 'alipay' | 'other' | null, val: string) {
    if (!val) return;
    if (!cls) cls = 'other';
    assigned[cls].push(val);
  }
  assign(wClass, w);
  assign(aClass, a);

  wechatUrl.value = assigned.wechat[0] || '';
  alipayUrl.value = assigned.alipay[0] || '';
  // 当某端为空且另一端仍有剩余，放到兜底按钮
  const rest = [...assigned.wechat.slice(1), ...assigned.alipay.slice(1), ...assigned.other];
  otherUrl.value = rest[0] || '';

  if (!wechatUrl.value && !alipayUrl.value && !otherUrl.value) {
    invalid.value = true;
    invalidReason.value = '未解析到有效的付款链接或跳转地址，请重新生成二维码。';
    return;
  }

  const ua = navigator.userAgent;
  if (/MicroMessenger/i.test(ua) && wechatUrl.value) {
    hint.value = '微信环境中，正在为你打开付款…';
    autoTried.value = true;
    window.setTimeout(() => go(wechatUrl.value), 400);
  } else if (/AlipayClient/i.test(ua) && alipayUrl.value) {
    hint.value = '支付宝环境中，正在为你打开付款…';
    autoTried.value = true;
    window.setTimeout(() => go(alipayUrl.value), 400);
  } else if (/QQ\//i.test(ua) && otherUrl.value) {
    hint.value = 'QQ 环境中，正在为你跳转…';
    autoTried.value = true;
    window.setTimeout(() => go(otherUrl.value), 400);
  } else {
    hint.value = '请选择付款方式';
  }
}

onMounted(() => {
  void resolveParams();
});
</script>
