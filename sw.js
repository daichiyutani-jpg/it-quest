// オフライン用 Service Worker（tools/build-sw.mjs で自動生成。直接編集しない）
// 学習データは IndexedDB にあり、ここで扱うキャッシュとは別。キャッシュを入れ替えても学習データは消えない。
const CACHE = 'it-quest-efb93f84a8';
const FILES = [
  "./",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon.svg",
  "./index.html",
  "./manifest.webmanifest",
  "./src/core/audio.js",
  "./src/core/game.js",
  "./src/core/mastery.js",
  "./src/core/picker.js",
  "./src/core/planner.js",
  "./src/core/session.js",
  "./src/core/store.js",
  "./src/core/util.js",
  "./src/data/calendar.js",
  "./src/data/content/c1.js",
  "./src/data/content/c2.js",
  "./src/data/content/c3.js",
  "./src/data/content/c4.js",
  "./src/data/content/c5.js",
  "./src/data/content/index.js",
  "./src/data/syllabus.js",
  "./src/main.js",
  "./src/styles.css",
  "./src/ui/actions.js",
  "./src/ui/adventure.js",
  "./src/ui/art.js",
  "./src/ui/data.js",
  "./src/ui/dom.js",
  "./src/ui/home.js",
  "./src/ui/learn.js",
  "./src/ui/plan.js",
  "./src/ui/practice.js",
  "./src/ui/quiz.js",
  "./src/ui/sessionEnd.js",
  "./src/ui/setup.js",
  "./src/ui/stats.js"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('it-quest-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 先にキャッシュから返し（オフラインでもすぐ動く）、通信できれば裏で最新に入れ替える。
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // 外部サイトは扱わない
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true, ignoreVary: true }).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      }).catch(() => hit || (e.request.mode === 'navigate' ? caches.match('./index.html', { ignoreVary: true }) : Response.error()));
      return hit || net;
    }),
  );
});
