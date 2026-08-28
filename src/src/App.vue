<template>
  <div class="app-background-layer fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <div class="app-ambient-glow app-ambient-glow-emerald animate-pulse"></div>
    <div class="app-ambient-glow app-ambient-glow-cyan animate-pulse"></div>
    <div class="app-ambient-glow app-ambient-glow-slate animate-pulse"></div>
  </div>
  <div class="min-h-screen flex flex-col relative z-10">
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
