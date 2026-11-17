/* E-TEC PWA service worker — cache shell for installable standalone app */
const CACHE = "etec-shell-v1";
const PRECACHE = [
  "/",
  "/login",
  "/dashboard",
  "/brand/icon-192.png",
  "/brand/icon-512.png",
  "/brand/maskable-192.png",
  "/brand/maskable-512.png",
  "/brand/e-tec-wordmark.svg",
  "/brand/e-tec-mark.svg",
  "/images/hero-solar-v2.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache auth/API — always network
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname.includes("auth")
  ) {
    return;
  }

  // HTML navigations: network first, cache fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/login"))),
    );
    return;
  }

  // Static assets: cache first
  if (
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            void caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
