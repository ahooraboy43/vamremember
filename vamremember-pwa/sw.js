const CACHE_NAME = "aghsat-cache-v3"; // از v2 به v3
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
self.addEventListener('push', e => {
  self.registration.showNotification('یادآوری هزینه‌ها', {
    body: 'هزینه‌های امروز رو ثبت کردی؟',
    icon: 'assets/danger.png',
    badge: 'assets/danger.png',
    dir: 'rtl',
    lang: 'fa'
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('./'));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (!request.url.startsWith("http")) return;
  if (request.url.includes("supabase.co")) return;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request)) // فقط اگه آفلاین بود، از کش استفاده کن
  );
});