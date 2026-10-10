// GymIQ service worker (vite-plugin-pwa injectManifest).
// Precaches the app shell, caches Google Fonts at runtime, and handles
// Web Push for the morning workout + night walk reminders.

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// SPA navigation fallback (matches the previous generateSW config).
registerRoute(new NavigationRoute(createHandlerBoundToURL('/gymiq/index.html')))

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' }),
)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
)

// ---- Web Push ----------------------------------------------------------
self.addEventListener('push', (event) => {
  let data
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data?.text() } }
  const title = data.title || 'GymIQ'
  const options = {
    body: data.body || '',
    icon: '/gymiq/icon-192.png',
    badge: '/gymiq/icon-192.png',
    tag: data.tag || 'gymiq',
    renotify: true,
    data: { url: data.url || '/gymiq/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/gymiq/'
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if ('focus' in c) {
        try { if (c.navigate) await c.navigate(target) } catch { /* cross-origin or unsupported */ }
        return c.focus()
      }
    }
    return self.clients.openWindow(target)
  })())
})
