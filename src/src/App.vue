<template>
  <div class="app-root relative isolate min-h-dvh">
    <div class="app-fixed-bg fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div class="app-ambient-glow app-ambient-glow-emerald animate-pulse"></div>
      <div class="app-ambient-glow app-ambient-glow-cyan animate-pulse"></div>
      <div class="app-ambient-glow app-ambient-glow-slate animate-pulse"></div>
    </div>
    <div class="min-h-dvh flex flex-col relative z-10">
      <AppHeader />
      <main class="flex-1 relative z-[1]">
        <router-view />
      </main>
      <AppFooter />
      <FloatingToolbar />
      <BgSwitcher />
      <BackToTop />
    </div>
  </div>
</template>

<script setup>
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import FloatingToolbar from './components/FloatingToolbar.vue';
import BgSwitcher from './components/BgSwitcher.vue';
import BackToTop from './components/BackToTop.vue';
</script>
