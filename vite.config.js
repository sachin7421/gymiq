import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/gymiq/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Custom service worker (src/sw.js) so we can handle Web Push.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
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
      // Runtime caching + navigation fallback live in src/sw.js. Supabase,
      // Anthropic and Oura calls intentionally bypass cache.
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173 },
})
