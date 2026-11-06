// sw.js を作り直す（キャッシュするファイル一覧と版を自動で更新）。
// アプリのファイルを変えたら公開前に必ず実行: node tools/build-sw.mjs
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const INCLUDE = ['index.html', 'manifest.webmanifest', 'icons', 'src'];
const files = [];
// 照合担当の生の報告（src/data/verify/raw/）はアプリが読まないのでキャッシュしない（反映済みの all.js だけを使う）
const SKIP = [join(ROOT, 'src', 'data', 'verify', 'raw')];
const walk = (p) => { if (SKIP.includes(p)) return; if (statSync(p).isDirectory()) readdirSync(p).forEach((f) => walk(join(p, f))); else files.push(p); };
INCLUDE.forEach((x) => walk(join(ROOT, x)));
const list = files.map((f) => './' + relative(ROOT, f).split(sep).join('/')).sort();
const hash = createHash('sha256');
for (const f of files.sort()) hash.update(readFileSync(f));
const version = hash.digest('hex').slice(0, 10);

const sw = `// オフライン用 Service Worker（tools/build-sw.mjs で自動生成。直接編集しない）
// 学習データは IndexedDB にあり、ここで扱うキャッシュとは別。キャッシュを入れ替えても学習データは消えない。
const CACHE = 'it-quest-${version}';
const FILES = ${JSON.stringify(['./', ...list], null, 2)};

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
`;
writeFileSync(join(ROOT, 'sw.js'), sw);
console.log(`sw.js を生成：${list.length + 1}ファイル、版 ${version}`);
