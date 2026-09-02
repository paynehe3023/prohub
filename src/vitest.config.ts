import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tabler/icons-vue': fileURLToPath(
        new URL('./node_modules/@tabler/icons-vue/dist/cjs/tabler-icons-vue.cjs', import.meta.url),
      ),
      'socket.io-client': fileURLToPath(new URL('./src/lib/clipboard-socket.js', import.meta.url)),
      qrcode: fileURLToPath(new URL('./src/lib/qrcode-shim.js', import.meta.url)),
    },
  },
});