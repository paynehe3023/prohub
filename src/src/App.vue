<template>
  <div class="min-h-screen flex flex-col relative">
    <AppHeader />
    <main class="flex-1 relative z-[1]">
      <router-view />
    </main>
    <AppFooter />
    <DonateButton />
    <BgSwitcher @change="onBgChange" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import DonateButton from './components/DonateButton.vue';
import BgSwitcher from './components/BgSwitcher.vue';

function onBgChange(url) {
  if (url) {
    document.body.style.backgroundImage = `url(${url})`;
  } else {
    document.body.style.backgroundImage = '';
  }
}
</script>
