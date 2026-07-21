//const CACHE="vamremember-v1";const FILES=["./","./index.html","./style.css","./app.js","./manifest.json"];self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
const CACHE_NAME = "aghsat-cache-v1";
const OFFLINE_URLS = [
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./manifest.json",
  "assets/book.png",
  "assets/danger.png",
  "assets/home.png",
  "assets/vam.png",
  "assets/fin.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // درخواست‌های به Supabase همیشه از شبکه بروند (داده زنده)
  if (request.url.includes("supabase.co")) {
    return;
  }

  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
