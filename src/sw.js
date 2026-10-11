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
    data: { url: data.url || '/gymiq/', notice: { title, body: options.body, tag: options.tag, ts: Date.now() } },
  }
  event.waitUntil((async () => {
    await self.registration.showNotification(title, options)
    // If the app is already open, surface the text in-app immediately too.
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) c.postMessage({ type: 'gymiq-notice', notice: options.data.notice })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // iOS removes the notification on tap, so carry its text into the app via
  // ?notice=... — the NoticeBanner shows it until dismissed.
  let target = event.notification.data?.url || '/gymiq/'
  try {
    const u = new URL(target, self.location.origin)
    const n = event.notification.data?.notice || { title: event.notification.title, body: event.notification.body, ts: Date.now() }
    u.searchParams.set('notice', JSON.stringify(n))
    target = u.href
  } catch { /* leave target as-is */ }
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
