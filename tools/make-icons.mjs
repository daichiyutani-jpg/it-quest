// アプリアイコンを独自に生成する（外部素材・外部ライブラリなし）。
// デザイン：青紫のグラデーション（全面＝マスカブル対応）に、相棒「ピコ」の顔と金色のアンテナ。
// 使い方: node tools/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const A = [91, 108, 255]; const B = [255, 122, 182];
const BODY = [127, 220, 255]; const EDGE = [43, 143, 214]; const EYE = [43, 47, 92]; const GOLD = [255, 209, 102]; const CHEEK = [255, 159, 180];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

function pixel(u, v) {
  const dx = u - 0.5; const dy = v - 0.56;
  const r = Math.hypot(dx / 0.3, dy / 0.31);
  if (Math.hypot(u - 0.5, v - 0.2) < 0.06) return GOLD; // アンテナの玉
  if (Math.abs(u - 0.5) < 0.012 && v > 0.2 && v < 0.27) return EDGE; // アンテナ
  if (r < 1) {
    if (r > 0.94) return EDGE;
    if (Math.hypot((u - 0.39) / 0.04, (v - 0.55) / 0.055) < 1 || Math.hypot((u - 0.61) / 0.04, (v - 0.55) / 0.055) < 1) return EYE;
    if (Math.hypot((u - 0.31) / 0.05, (v - 0.64) / 0.025) < 1 || Math.hypot((u - 0.69) / 0.05, (v - 0.64) / 0.025) < 1) return CHEEK;
    if (Math.abs(Math.hypot(u - 0.5, v - 0.63) - 0.06) < 0.012 && v > 0.65) return EYE; // 口
    return mix([233, 251, 255], BODY, Math.min(1, r * 1.1));
  }
  return mix(A, B, (u + v) / 2);
}

function crc32(buf) { let c, crc = 0xffffffff; for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const p = pixel((x + 0.5) / size, (y + 0.5) / size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = p[0]; raw[o + 1] = p[1]; raw[o + 2] = p[2]; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b6cff"/><stop offset="1" stop-color="#ff7ab6"/></linearGradient></defs>
<rect width="100" height="100" rx="20" fill="url(#g)"/><line x1="50" y1="20" x2="50" y2="27" stroke="#2b8fd6" stroke-width="2.4"/><circle cx="50" cy="20" r="6" fill="#ffd166"/>
<ellipse cx="50" cy="56" rx="30" ry="31" fill="#7fdcff" stroke="#2b8fd6" stroke-width="3"/><ellipse cx="39" cy="55" rx="4" ry="5.5" fill="#2b2f5c"/><ellipse cx="61" cy="55" rx="4" ry="5.5" fill="#2b2f5c"/>
<path d="M44 67 q6 6 12 0" stroke="#2b2f5c" stroke-width="2.4" fill="none"/></svg>
`;
const dir = new URL('../icons/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('icon-192.png', dir), png(192));
writeFileSync(new URL('icon-512.png', dir), png(512));
writeFileSync(new URL('icon.svg', dir), svg);
console.log('icons/ に icon-192.png, icon-512.png, icon.svg を生成しました');
