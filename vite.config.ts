import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import mdx from '@mdx-js/rollup';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    mdx({
      providerImportSource: '@mdx-js/react',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    hmr: {
      overlay: false, // Отключает всплывающее окно с ошибками, если они не критичны
    },
  },
  // ДОБАВЛЯЕМ ВОТ ЭТОТ БЛОК:
  css: {
    preprocessorOptions: {
      scss: {
        // Указываем компилятору молчать про эти устаревшие фичи
        silenceDeprecations: [
          'import',
          'global-builtin',
          'color-functions',
          'if-function',
          'legacy-js-api',
        ],
        // quietDeps отключает ворнинги из папки node_modules (включая Bootstrap)
        quietDeps: true,
      },
    },
  },
});
