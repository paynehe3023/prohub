<template>
  <div class="fixed bottom-6 left-6 z-40 flex flex-col gap-2">
    <button @click="open = !open"
      class="w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-white/70 hover:text-white hover:shadow-lg active:scale-95 transition-all text-[0.625rem] font-bold"
      title="换背景">
      <IconPhoto class="w-4 h-4" />
    </button>
    <Transition name="switcher">
      <div v-if="open" class="liquid-glass p-3 flex flex-col gap-2 w-44" @click.stop>
        <p class="text-[0.625rem] text-zinc-400 text-glass-sm">测试背景</p>
        <button v-for="bg in presets" :key="bg.label"
          @click.stop="applyBg(bg)"
          class="w-full h-8 rounded-xl border border-white/20 hover:border-white/50 transition-all active:scale-95 text-[0.625rem] text-white text-glass-sm flex items-center justify-center"
          :style="bg.style">
          {{ bg.label }}
        </button>
        <label class="w-full h-8 rounded-xl liquid-glass-inset flex items-center justify-center text-[0.625rem] text-zinc-400 hover:text-white cursor-pointer transition-all text-glass-sm">
          自定义...
          <input type="file" accept="image/*" class="hidden" @change="onCustom" />
        </label>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { IconPhoto } from '@tabler/icons-vue';

const emit = defineEmits(['change']);
const open = ref(false);

const presets = [
  { label: '太空壁纸', style: { backgroundImage: 'url(/wallpaper.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' } },
  { label: '纯白',     style: { backgroundColor: '#FFFFFF', color: '#333' } },
  { label: '纯深灰',   style: { backgroundColor: '#1C1C1E' } },
  { label: '纯浅灰',   style: { backgroundColor: '#F2F2F7', color: '#333' } },
];

function applyBg(bg) {
  if (bg.style.backgroundImage) {
    document.body.style.backgroundImage = bg.style.backgroundImage;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundColor = '';
  } else {
    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundAttachment = '';
    document.body.style.backgroundColor = bg.style.backgroundColor || '#F2F2F7';
  }
  emit('change', bg.style.backgroundImage ? '/wallpaper.jpg' : '');
}

function onCustom(e) {
  const file = e.target.files?.[0];
  if (file) {
    const url = URL.createObjectURL(file);
    document.body.style.backgroundImage = `url(${url})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    emit('change', url);
  }
}

// Click outside → close
function onClickOutside(e) {
  if (open.value) {
    const el = document.querySelector('.fixed.bottom-6.left-6');
    if (el && !el.contains(e.target)) open.value = false;
  }
}
onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));
</script>

<style scoped>
.switcher-enter-active { transition: all 0.2s ease-out; }
.switcher-leave-active { transition: all 0.15s ease-in; }
.switcher-enter-from, .switcher-leave-to { opacity: 0; transform: translateY(8px); }
</style>
