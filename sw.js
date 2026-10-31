const CACHE_NAME = "muhaimin-v5";
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./muhaimin-logo.png", "./assets/milk-collection-3d.svg", "./data/bangladesh-address.json"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await cache.addAll(APP_SHELL);
        try { await cache.add(SUPABASE_JS); } catch (_) { /* CDN may be unavailable during install; do not fail the app shell. */ }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("muhaimin-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.href === SUPABASE_JS || (url.origin === "https://cdn.jsdelivr.net" && url.pathname.startsWith("/npm/@supabase/supabase-js@2"))) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    })));
    return;
  }
  if (url.origin !== self.location.origin) return;

  const isAppDocument = request.mode === "navigate" || url.pathname.endsWith("/index.html");
  if (isAppDocument) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request) || await caches.match("./index.html");
          return cached || Response.error();
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});
