import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'masked-icon.svg'],
      manifest: {
        name: 'Шахматы для Гоши',
        short_name: 'Шахматы Гоши',
        description: 'Детская шахматная игра с весёлыми персонажами',
        theme_color: '#4A90D9',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});
