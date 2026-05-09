const CACHE_NAME = "arc-privus-v1";

const urlsToCache = [
  "/",
  "/messenger/v2",
  "/messenger/v2/index.html",
  "/messenger/v2/style.css",
  "/messenger/v2/app.js",
  "/assets/logo.png"
];

self.addEventListener("install", (event) => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );

});

self.addEventListener("fetch", (event) => {

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );

});