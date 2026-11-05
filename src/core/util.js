// 日付・小道具。日付はすべて端末のローカル時刻の 'YYYY-MM-DD' で扱う。
let fixedNow = null;
/** テスト用：現在時刻を固定する（null で解除） */
export function setNow(d) { fixedNow = d ? new Date(d) : null; }
export function now() { return fixedNow ? new Date(fixedNow) : new Date(); }

export function ymd(d = now()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
export function today() { return ymd(now()); }
export function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
/** b - a（日数） */
export function diffDays(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }
export function fmtDate(s) { const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`; }
export function fmtMin(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}分`;
  return `${Math.floor(m / 60)}時間${m % 60 ? (m % 60) + '分' : ''}`;
}
export function pct(x) { return `${Math.round(x * 100)}%`; }
export function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
