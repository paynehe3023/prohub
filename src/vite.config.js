import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [vue()],
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
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'heic2any': ['heic2any'],
            'piexif': ['piexifjs'],
            'vendor': ['vue', 'vue-router'],
          },
        },
      },
      chunkSizeWarningLimit: 1500,
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
