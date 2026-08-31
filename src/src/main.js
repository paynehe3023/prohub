import { createApp } from 'vue';
import { createHead } from '@vueuse/head';
import App from './App.vue';
import router from './router';
import './style.css';
import { initializeTheme } from './composables/useTheme';

initializeTheme();
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
const app = createApp(App);
const head = createHead();

app.use(router);
app.use(head);
app.mount('#app');
