/* Serves extracted SCORM package files for the preview player.
   Registered by scorm-player.html with scope ./scorm-content/ — it never handles Admin requests. */
const CACHE = 'lu-scorm-preview';
const SCOPE = new URL('./scorm-content/', self.location).pathname;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(url.origin + url.pathname);
    return hit || new Response(`Not found in package: ${decodeURIComponent(url.pathname.slice(SCOPE.length).split('/').slice(1).join('/'))}`,
      { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
