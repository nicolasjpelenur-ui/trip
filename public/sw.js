// Trip Coordinator service worker.
// Two jobs:
//  1. Receive web-push notifications and surface them
//  2. Cache the app shell for fast cold loads (very minimal — Next handles the rest)

const SHELL_CACHE = 'trip-shell-v1'
const SHELL_PATHS = ['/manifest.json', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_PATHS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  // Network-first for navigations; cache fallback for shell assets only.
  const url = new URL(event.request.url)
  if (url.origin === self.location.origin && SHELL_PATHS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((r) => r || fetch(event.request)))
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* non-fatal */ }
  const title = data.title || 'Trip Coordinator'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/dashboard' },
    tag: data.tag || undefined,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of all) {
      if (client.url.includes(self.location.origin)) {
        client.focus()
        return client.navigate(url)
      }
    }
    return clients.openWindow(url)
  })())
})
