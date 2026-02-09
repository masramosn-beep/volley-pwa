const CACHE_NAME = "volley-pwa-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./service-worker.js",
  "./assets/css/app.css",
  "./assets/js/app.js",
  "./assets/js/storage.js",
  "./assets/js/ui.js",
  "./assets/js/calendar.js",
  "./assets/js/availability.js",
  "./assets/js/rotations.js",
  "./assets/js/standings.js",
  "./assets/icons/icon-192.svg",
  "./assets/icons/icon-512.svg",
  "./data/standings.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo manejamos same-origin (GitHub Pages)
  if (url.origin !== self.location.origin) return;

  // App shell: cache-first
  if (APP_SHELL.includes(url.pathname.replace(self.location.pathname.replace(/\/[^/]*$/, "/"), "./"))) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // standings.json: stale-while-revalidate
  if (url.pathname.endsWith("/data/standings.json") || url.pathname.endsWith("data/standings.json")) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // default: network-first (para navegar)
  event.respondWith(networkFirst(req));
});

async function cacheFirst(req){
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(req);
  return hit || fetch(req);
}

async function networkFirst(req){
  const cache = await caches.open(CACHE_NAME);
  try{
    const fresh = await fetch(req);
    cache.put(req, fresh.clone());
    return fresh;
  }catch(e){
    const hit = await cache.match(req);
    return hit || new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(req){
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(req);
  const fetchPromise = fetch(req).then(res => {
    cache.put(req, res.clone());
    return res;
  }).catch(() => null);

  return hit || (await fetchPromise) || new Response("Offline", { status: 503 });
}
