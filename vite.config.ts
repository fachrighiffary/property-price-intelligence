import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isHmrEnabled = process.env.DISABLE_HMR !== 'true';
  const hmrPort = Number(process.env.HMR_PORT) || 0;
  const crawlerApiBaseUrl =
    process.env.VITE_SERVICE_CRAWLER_URL ||
    process.env.SERVICE_CRAWLER_URL ||
    process.env.CRAWLER_API_BASE_URL ||
    'http://localhost:3002';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: isHmrEnabled
        ? {
            host: 'localhost',
            port: hmrPort,
          }
        : false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: isHmrEnabled ? {} : null,
      proxy: {
        '/api': {
          target: crawlerApiBaseUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
