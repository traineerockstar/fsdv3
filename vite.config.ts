import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, path.resolve('.'), '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        headers: {
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
        }
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json,wasm}'],
            maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/huggingface\.co\/.*\/resolve\/main\/.*$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'llm-models',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              {
                urlPattern: /^https:\/\/raw\.githubusercontent\.com\/mlc-ai\/binary-mlc-llm-libs\/main\/.*$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'llm-wasm',
                  expiration: {
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              }
            ],
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});