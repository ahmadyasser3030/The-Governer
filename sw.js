const RELEASE = '20261009-r4';
const CACHE = `governor-shell-${RELEASE}`;
const FILES = ['index.html', 'style.css', 'app.js', 'core.js', 'cloud.js', 'migration.js', 'profile.js', 'icon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest', 'construction-hero.webp'];
const urlFor = file => new URL(`./${file}?v=${RELEASE}`, self.registration.scope).href;
const shellFile = pathname => FILES.find(file => new URL(`./${file}`, self.registration.scope).pathname === pathname);
self.addEventListener('install', event => {
  // Publish one complete shell, fetched through HTTP caches, before taking control.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new Request(urlFor(file), {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('governor-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'GOVERNOR_VERSION') event.ports[0]?.postMessage({release: RELEASE});
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url), scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const file = url.pathname === scope.pathname ? 'index.html' : shellFile(url.pathname);
  // Recovery pages and cloud requests bypass the app shell cache.
  if (!file) return;
  // Explicitly versioned newer files must never receive an older cached release.
  if (url.searchParams.has('v') && url.searchParams.get('v') !== RELEASE) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(urlFor(file))) || fetch(event.request)));
});
