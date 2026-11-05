// 開発用の静的ファイルサーバー（Node.js 標準機能のみ）。
// 使い方: node tools/serve.mjs [port]   → http://localhost:8795/
// 同じ Wi-Fi のスマホから試すときは HOST=0.0.0.0 を指定（Service Worker は localhost 以外の http では動かない）。
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.argv[2] || process.env.PORT || 8795);
const HOST = process.env.HOST || '127.0.0.1';
// 第2引数でサブパスを指定すると GitHub Pages と同じ形（例 /it-quest/）で配信する
const BASE = process.argv[3] || '/';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown; charset=utf-8',
};

http.createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (!path.startsWith(BASE)) { res.writeHead(404).end(); return; }
    path = '/' + path.slice(BASE.length);
    let file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found');
  }
}).listen(PORT, HOST, () => console.log(`IT QUEST: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}${BASE}`));
