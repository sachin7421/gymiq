import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/gymiq/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'GymIQ',
        short_name: 'GymIQ',
        description: 'Your gym, your data, your plan.',
        start_url: '/gymiq/',
        scope: '/gymiq/',
        display: 'standalone',
        background_color: '#f5f5f0',
        theme_color: '#f5f5f0',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Precache app shell + assets, then serve cached on next load
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        // Runtime caching for fonts (Google Fonts) so the app shell renders
        // even on a flaky gym network. Anthropic, Supabase, and Oura calls
        // intentionally bypass cache — those require a live connection.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: '/gymiq/index.html',
        // Don't try to cache hashed dynamic chunks larger than 4MB
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173 },
})
