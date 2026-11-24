const CACHE_NAME = "jomajatra-static-v1";
const STATIC_ASSETS = [
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/joma-jatra.png",
  "/joma-jatra-icononly.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept or cache financial API calls so balances & approvals stay 100% live
  if (url.pathname.startsWith("/api/")) return;

  // Serve cached static icons/logos fast, falling back to network
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
    return;
  }

  // Network-first for navigation with a clean offline message if the device loses internet
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Offline — JomaJatra</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6faf7;color:#072a1f;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center}.card{max-width:360px;background:#fff;border:1px solid #d7e5dd;border-radius:8px;padding:28px 24px}h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#4f6b61;margin:0 0 18px;line-height:1.5}button{background:#046c4e;color:#fff;border:0;border-radius:6px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer}</style></head><body><div class="card"><h1>You're Offline</h1><p>JomaJatra needs an active internet connection to show live group balances and transactions.</p><button onclick="location.reload()">Try Again</button></div></body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          ),
      ),
    );
  }
});
