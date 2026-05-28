import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import mdx from '@mdx-js/rollup';
import { qrcode } from 'vite-plugin-qrcode';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    mdx({
      providerImportSource: '@mdx-js/react',
    }),
    tailwindcss(),
    react(),
    qrcode(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    hmr: {
      overlay: false,
    },
    host: true,
  },
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
