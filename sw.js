const CACHE_NAME = "smart-alarm-v3";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];


// ================================
// INSTALL
// ================================
self.addEventListener("install", (event) => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
  );

  self.skipWaiting();
});


// ================================
// ACTIVATE
// ================================
self.addEventListener("activate", (event) => {

  event.waitUntil(
    caches.keys().then((cacheNames) => {

      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );

    })
  );

  self.clients.claim();
});


// ================================
// FETCH
// ================================
self.addEventListener("fetch", (event) => {

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(

    caches.match(event.request)
      .then((cachedResponse) => {

        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {

            if (
              !networkResponse ||
              networkResponse.status !== 200
            ) {
              return networkResponse;
            }

            const responseClone =
              networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(
                  event.request,
                  responseClone
                );
              });

            return networkResponse;

          })
          .catch(() => {
            return caches.match("./index.html");
          });

      })

  );
});