const CACHE_NAME = "blendergl-v2";
const STATIC_ASSETS = [
  "/",
  "/editor",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.svg",
];

// Install - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip API/external requests
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // For navigation requests, show offline page
        if (event.request.mode === "navigate") {
          return caches.match("/offline.html");
        }
        // Fallback to cache for other requests
        return caches.match(event.request);
      })
  );
});
