import { createApp } from 'vue';
import { createHead } from '@vueuse/head';
import App from './App.vue';
import router from './router';
import './style.css';
import { initializeTheme } from './composables/useTheme';

initializeTheme();
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
if (window.performance?.getEntriesByType('navigation')?.[0]?.type === 'reload') {
  window.addEventListener('load', () => window.scrollTo(0, 0), { once: true });
  window.setTimeout(() => window.scrollTo(0, 0), 0);
}
const app = createApp(App);
const head = createHead();

app.use(router);
app.use(head);
app.mount('#app');
