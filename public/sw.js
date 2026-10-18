// VYRA service worker: keeps the app shell (especially /report) loadable offline.
// API calls are never cached; offline reports are queued in IndexedDB by the page.
const CACHE = 'vyra-shell-v1'
const PRECACHE = ['/', '/report']

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => Promise.all(PRECACHE.map(url => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    const cached = (await cache.match(request, { ignoreVary: true })) || (fallbackUrl && (await cache.match(fallbackUrl)))
    if (cached) return cached
    throw err
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/report'))
  } else {
    event.respondWith(networkFirst(request))
  }
})
