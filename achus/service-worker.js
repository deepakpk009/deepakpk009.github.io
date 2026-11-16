const CACHE_PREFIX = "my-apps-shell";
const CACHE_NAME = `${CACHE_PREFIX}-v1`;
const PRECACHE_URLS = [
  "./", "./index.html", "./manifest.webmanifest", "./src/styles.css?v=1", "./src/app.js?v=1",
  "./assets/app-menu-icon.svg", "./assets/icons/icon-192.png", "./assets/icons/icon-512.png", "./assets/icons/maskable-512.png",
  "./calendar/", "./calendar/index.html", "./calendar/manifest.webmanifest", "./calendar/service-worker.js",
  "./calendar/src/styles.css?v=4", "./calendar/src/app.js?v=4", "./calendar/src/storage.js?v=2",
  "./calendar/assets/favicon.svg", "./calendar/assets/images/calendar-background.jpeg?v=3",
  "./calendar/assets/icons/icon-192.png", "./calendar/assets/icons/icon-512.png", "./calendar/assets/icons/maskable-512.png",
  "./shoppinglist/", "./shoppinglist/index.html", "./shoppinglist/manifest.webmanifest", "./shoppinglist/service-worker.js",
  "./shoppinglist/src/styles.css", "./shoppinglist/src/app.js", "./shoppinglist/src/storage.js",
  "./shoppinglist/assets/favicon.svg", "./shoppinglist/assets/images/kitchen-background.jpg",
  "./shoppinglist/assets/icons/icon-192.png", "./shoppinglist/assets/icons/icon-512.png", "./shoppinglist/assets/icons/maskable-512.png"
].map((path) => new URL(path, self.location).href);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    })),
  );
});
