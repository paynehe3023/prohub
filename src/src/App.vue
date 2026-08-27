<template>
  <div class="min-h-screen flex flex-col relative">
    <AppHeader />
    <main class="flex-1 relative z-[1]">
      <router-view />
    </main>
    <AppFooter />
    <DonateButton />
    <BgSwitcher />
    <BackToTop />
  </div>
</template>

<script setup>
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import DonateButton from './components/DonateButton.vue';
import BgSwitcher from './components/BgSwitcher.vue';
import BackToTop from './components/BackToTop.vue';
</script>
