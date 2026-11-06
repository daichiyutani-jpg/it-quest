// IPA公開問題（過去問）を、利用者が自分でダウンロードしたPDFから取り込んで解く画面
// ・PDFは利用者がIPAのサイトから自分でダウンロードし、この端末の中だけで読み込む（どこにも送信しない）
// ・問題は画像として切り出して、この端末（IndexedDB「it-quest-past」）にだけ保存する。アプリ本体・公開リポジトリには問題文を入れていない
// ・正答はIPA公開の解答例、分類と解説は本アプリ独自（問題文の転載なし）
// ・回答は単元の正答率にも反映する（学習記録の answers に mode:'past' で入る。問題の画像は端末内の別のDBに置く）
import { PAST_YEARS, PAST_INFO } from '../data/past.js';
import { UNITS, FIELDS } from '../data/syllabus.js';
import { EXAM } from '../data/calendar.js';
import { layoutYear, inkLines, guessYear, scorePast, pastQid } from '../core/pastimport.js';
import { recordAnswer, setWrongReason } from '../core/mastery.js';
import { XP } from '../core/game.js';
import { fmtMin, pct } from '../core/util.js';
import { esc, rich, bar, toast, confirmDialog } from './dom.js';

const KANA = ['ア', 'イ', 'ウ', 'エ'];
const SCALE_SCAN = 1, SCALE_IMG = 2.2;
const REASONS = [['know', '知識不足'], ['confuse', '用語の混同'], ['misread', '問題文の読み違い'], ['calc', '計算ミス'], ['guess', '勘で選んだ']];
const unitName = (id) => UNITS.find((u) => u.id === id)?.name || id;
const fieldName = (f) => FIELDS.find((x) => x.id === f)?.name || f;
const yearOf = (id) => PAST_YEARS.find((y) => y.id === id);
export const citation = (y, no) => `出典：${y.label} ITパスポート試験 公開問題 問${no}`;

// ---------- 端末内の保存（問題の画像） ----------
const DBN = 'it-quest-past', ST = 'kv';
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DBN, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idb(mode, fn) {
  const d = await idbOpen();
  return new Promise((res, rej) => {
    const tx = d.transaction(ST, mode);
    const out = fn(tx.objectStore(ST));
    tx.oncomplete = () => { d.close(); res(out && 'result' in out ? out.result : out); };
    tx.onerror = () => { d.close(); rej(tx.error); };
    tx.onabort = () => { d.close(); rej(tx.error || new Error('保存できませんでした（端末の空き容量を確かめてください）')); };
  });
}
const idbGet = (k) => idb('readonly', (s) => s.get(k));
async function idbPutAll(entries) { await idb('readwrite', (s) => { for (const [k, v] of entries) s.put(v, k); }); }
async function idbDeletePrefix(prefix) {
  await idb('readwrite', (s) => {
    const r = s.openCursor();
    r.onsuccess = () => { const c = r.result; if (!c) return; if (String(c.key).startsWith(prefix)) c.delete(); c.continue(); };
  });
}

let imported = null; // { yearId: meta }
const urlCache = new Map();
async function loadImported(force = false) {
  if (imported && !force) return imported;
  imported = {};
  try { for (const y of PAST_YEARS) { const m = await idbGet('meta:' + y.id); if (m) imported[y.id] = m; } } catch { /* IndexedDBが使えない */ }
  return imported;
}
async function imgUrl(key) {
  if (urlCache.has(key)) return urlCache.get(key);
  const blob = await idbGet(key);
  const u = blob ? URL.createObjectURL(blob) : null;
  urlCache.set(key, u);
  return u;
}
function resetUrls() { for (const u of urlCache.values()) if (u) URL.revokeObjectURL(u); urlCache.clear(); }
/** 画像の差し込み（描画後に非同期で読み込む） */
function fillImages(root) {
  root.querySelectorAll('img[data-key]').forEach(async (img) => {
    const u = await imgUrl(img.dataset.key);
    if (u) img.src = u; else img.replaceWith(Object.assign(document.createElement('p'), { className: 'small muted', textContent: '画像が見つかりません。取り込み直してください。' }));
  });
  root.querySelectorAll('.past-zoom').forEach((b) => b.addEventListener('click', () => b.classList.toggle('on')));
}
const imgTag = (key, alt) => `<div class="past-zoom" title="タップで拡大・縮小"><img class="past-img" data-key="${esc(key)}" alt="${esc(alt)}"></div>`;

// ---------- 取り込み（すべて端末内で処理） ----------
let pdfjsP = null;
function loadPdfjs() {
  if (!pdfjsP) {
    pdfjsP = import(new URL('../vendor/pdfjs/pdf.min.mjs', import.meta.url).href).then((m) => {
      m.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
      return m;
    });
  }
  return pdfjsP;
}
async function renderPage(doc, pageNo, scale) {
  const page = await doc.getPage(pageNo);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
  const c2 = canvas.getContext('2d', { willReadFrequently: true });
  c2.fillStyle = '#fff'; c2.fillRect(0, 0, canvas.width, canvas.height);
  // intent 'print'：画面描画用（requestAnimationFrame 待ち）にしない。画面が隠れていても取り込みが止まらないように
  await page.render({ canvas, canvasContext: c2, viewport: vp, intent: 'print' }).promise;
  page.cleanup();
  return canvas;
}
const toBlob = (canvas) => new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
function cropTo(parts, pages, pad = 0.01) {
  const rects = parts.map((pt) => {
    const cv = pages.get(pt.page); const W = cv.width, H = cv.height;
    const sx = Math.max(0, Math.floor((Math.min(pt.x0, 0.08) - pad) * W)), sy = Math.max(0, Math.floor((pt.y0 - pad) * H));
    const ex = Math.min(W, Math.ceil((Math.max(pt.x1, 0.92) + pad) * W)), ey = Math.min(H, Math.ceil((pt.y1 + pad) * H));
    return { cv, sx, sy, w: ex - sx, h: ey - sy };
  });
  const out = document.createElement('canvas');
  out.width = Math.max(...rects.map((r) => r.w)); out.height = rects.reduce((a, r) => a + r.h, 0);
  const c = out.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, out.width, out.height);
  let y = 0;
  for (const r of rects) { c.drawImage(r.cv, r.sx, r.sy, r.w, r.h, 0, y, r.w, r.h); y += r.h; }
  return out;
}

export async function importPastPdf(file, yearId, onStep = () => {}) {
  const pdfjs = await loadPdfjs();
  onStep('PDFを開いています…', 0);
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, isEvalSupported: false, enableXfa: false });
  let doc;
  try { doc = await task.promise; } catch (e) {
    throw new Error('PDFを開けませんでした。IPAのサイトからダウンロードした「問題冊子」のPDFか確かめてください。' + (e?.name === 'PasswordException' ? '（パスワード付きのPDFには対応していません）' : ''));
  }
  try {
    const N = doc.numPages;
    const cands = guessYear(N, PAST_YEARS);
    const year = yearOf(yearId);
    if (!cands.includes(yearId)) {
      const hint = cands.length ? `ページ数からは${cands.map((id) => yearOf(id).label).join('・')}のPDFのようです。` : '';
      throw new Error(`${year.label}の問題冊子ではないようです（${N}ページ、想定は${year.pdfPages}ページ）。${hint}解答例のPDFではなく問題冊子（…_ip_qs.pdf）を選んでください。`);
    }
    const lastPage = Math.max(...year.questions.map((q) => q.page));
    const pages = [];
    for (let p = 1; p <= N; p++) {
      if (p > lastPage) { pages.push({ lines: [] }); continue; }
      onStep(`ページを調べています（${p}/${lastPage}）`, p / lastPage * 0.45);
      const cv = await renderPage(doc, p, SCALE_SCAN);
      pages.push({ lines: inkLines(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height)) });
      cv.width = 0;
    }
    const lay = layoutYear(pages, year);
    if (lay.bx == null) throw new Error('問題の位置を見つけられませんでした。PDFの形式が想定と違います。');
    if (lay.mismatched.length > 4) throw new Error(`問題の並びが${year.label}と合いません（${lay.mismatched.length}ページで不一致）。別の年度の問題冊子ではないか確かめてください（令和5年度と令和6年度は同じページ数です）。`);
    // 切り出し（必要なページだけ高い解像度で、使い終わったら解放）
    const hi = new Map();
    const entries = [];
    const items = lay.items.filter((it) => it.parts.length);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      for (const pt of it.parts) if (!hi.has(pt.page)) hi.set(pt.page, await renderPage(doc, pt.page + 1, SCALE_IMG));
      onStep(`問題を切り出しています（${i + 1}/${items.length}）`, 0.45 + 0.5 * (i + 1) / items.length);
      const key = it.kind === 'stem' ? `img:${yearId}:s${it.first}` : `img:${yearId}:${it.no}`;
      entries.push([key, await toBlob(cropTo(it.parts, hi))]);
      const later = new Set(items.slice(i + 1).flatMap((x) => x.parts.map((p2) => p2.page)));
      for (const p of [...hi.keys()]) if (!later.has(p)) { hi.get(p).width = 0; hi.delete(p); }
    }
    const missing = year.questions.filter((q) => !entries.some(([k]) => k === `img:${yearId}:${q.no}`)).map((q) => q.no);
    if (missing.length) throw new Error(`切り出せなかった問題があります（問${missing.join('・')}）。`);
    const inexact = lay.items.filter((it) => it.kind === 'q' && !it.exact).map((it) => it.no);
    const meta = { yearId, importedAt: Date.now(), pdfPages: N, fingerprint: doc.fingerprints?.[0] || null, inexact, mismatchedPages: lay.mismatched };
    onStep('この端末に保存しています…', 0.97);
    await idbDeletePrefix(`img:${yearId}:`);
    await idbPutAll([...entries, ['meta:' + yearId, meta]]);
    resetUrls();
    imported = null;
    onStep('完了', 1);
    return meta;
  } finally {
    try { await task.destroy(); } catch { /* 無視 */ }
  }
}

// ---------- 記録 ----------
function ensure(s) {
  if (!s.past || typeof s.past !== 'object') s.past = { sessions: [], active: null };
  s.past.sessions ||= []; if (!('active' in s.past)) s.past.active = null;
  return s.past;
}
const qOf = (y, no) => y.questions.find((q) => q.no === no);
const stemOf = (y, no) => (y.stems || []).find((st) => no >= st.first && no <= st.last);
/** 学習記録に入れる形（mastery.recordAnswer が使う項目だけ） */
const asQ = (y, q) => ({ id: pastQid(y.id, q.no), unit: q.unit, field: q.field });

// ---------- 画面 ----------
export function renderPast(view, app, r) {
  view.innerHTML = '<div class="loading">読み込み中…</div>';
  loadImported().then((imp) => {
    const [a0, a1, a2] = r.args;
    if (a0 && yearOf(a0)) {
      const y = yearOf(a0);
      if (!imp[y.id]) return importView(view, app, y);
      if (a1 === 'run') return runView(view, app, y);
      if (a1 === 'result') return resultView(view, app, y, a2);
      return yearView(view, app, y, imp[y.id]);
    }
    return topView(view, app, imp);
  });
}

function termsBox() {
  return `<section class="card notice"><h3>利用条件と、このアプリでの扱い</h3>
    <p class="small">公開問題の著作権はIPA（独立行政法人情報処理推進機構）にあります。IPAのFAQでは、教育目的で問題集・テキストに使う場合は許諾不要で、出典の明記が必要とされています（${esc(PAST_INFO.faqChecked)}確認）。</p>
    <p class="small">このアプリには問題文を入れていません。あなたがIPAのサイトからダウンロードしたPDFを、この端末の中だけで読み込みます。読み込んだ問題の画像はどこにも送信しません。<b>取り込んだ画像をほかの人に渡したり公開したりしないでください。</b></p>
    <p class="tiny muted">問題の画像は公開PDFのページを問題ごとに切り出したもの（内容の改変なし）。正答はIPA公開の解答例。単元の分類・解説・ポイントは本アプリ独自のもので、IPAの見解ではありません。</p>
    <p class="tiny"><a href="${esc(PAST_INFO.faqUrl)}" target="_blank" rel="noopener">IPA よくある質問（過去問題の利用について）</a></p>
  </section>`;
}

function topView(view, app, imp) {
  const s = app.s; const P = ensure(s);
  const act = P.active;
  view.innerHTML = `
  <section class="card"><h2>📜 公式の過去問（IPA公開問題）</h2>
    <p class="small">IPAが公開している本物の試験問題を、本番と同じ4択で解きます。1年度100問（ストラテジ35・マネジメント20・テクノロジ45）。正答はIPAの解答例、解説と単元の分類は本アプリ独自です。</p>
    <p class="small">解いた結果は<b>単元の正答率にも反映</b>され、学習計画（優先順位・補強）に使われます。</p>
    ${act ? `<a class="btn primary wide" href="#/past/${act.year}/run">▶ 続きから解く（${esc(act.label)}）</a>` : ''}
  </section>
  ${PAST_YEARS.map((y) => {
    const m = imp[y.id];
    const done = P.sessions.filter((x) => x.year === y.id && x.kind === 'full').slice(-1)[0];
    return `<section class="card"><div class="row between"><h3>${esc(y.label)}</h3><span class="badge ${m ? 'ok' : ''}">${m ? '取り込み済み' : '未取り込み'}</span></div>
      ${done ? `<p class="small">前回の本番形式：${done.c}/${done.n}問（${pct(done.c / done.n)}）</p>` : ''}
      <a class="btn ${m ? 'primary' : 'ghost'} wide" href="#/past/${y.id}">${m ? '解く' : '取り込む'}</a></section>`;
  }).join('')}
  ${termsBox()}`;
}

function importView(view, app, y) {
  view.innerHTML = `
  <section class="card"><h2>${esc(y.label)}の公開問題を取り込む</h2>
    <ol class="small">
      <li>下のリンクから<b>問題冊子</b>のPDFをダウンロードします（iPhoneは「ファイル」に保存）。<br><a href="${esc(y.qsUrl)}" target="_blank" rel="noopener">${esc(y.label)} 問題冊子（IPA・PDF）</a></li>
      <li>「PDFを選んで取り込む」を押し、保存したPDFを選びます（${y.pdfPages}ページのPDF）。</li>
      <li>この端末の中で問題を1問ずつ画像に切り出して保存します（1〜3分ほど。通信はしません）。</li>
    </ol>
    <input type="file" id="pdf" accept="application/pdf,.pdf" hidden>
    <button class="btn primary wide" id="pick">PDFを選んで取り込む</button>
    <div id="prog" hidden><p class="small" id="plabel"></p>${bar(0, 'var(--accent)', '取り込みの進み具合')}</div>
    <div id="err"></div>
    <p class="tiny muted">正答はIPAの解答例（<a href="${esc(y.ansUrl)}" target="_blank" rel="noopener">PDF</a>）をアプリに入れてあります。PDFの形式が想定と違うと取り込めないことがあります。</p>
  </section>
  ${termsBox()}
  <a class="btn ghost wide" href="#/past">‹ 過去問のトップへ</a>`;
  const input = view.querySelector('#pdf');
  const pick = view.querySelector('#pick');
  pick.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const f = input.files?.[0]; if (!f) return;
    pick.disabled = true;
    const prog = view.querySelector('#prog'); prog.hidden = false; view.querySelector('#err').innerHTML = '';
    try {
      const meta = await importPastPdf(f, y.id, (msg, v) => { view.querySelector('#plabel').textContent = msg; prog.querySelector('.bar i').style.width = `${Math.round(v * 100)}%`; });
      toast(`${y.label}の${y.questions.length}問を取り込みました`);
      if (meta.inexact.length) setTimeout(() => toast(`${meta.inexact.length}問はページ全体を表示します（区切りを読み取れなかったため）`, 3500), 2500);
      app.go('#/past/' + y.id);
    } catch (e) {
      console.error(e);
      prog.hidden = true;
      view.querySelector('#err').innerHTML = `<div class="warn"><b>取り込めませんでした</b><br>${esc(e?.message || String(e))}</div>`;
    } finally { pick.disabled = false; input.value = ''; }
  });
}

function startRun(app, y, kind, nos, opts = {}) {
  const P = ensure(app.s);
  P.active = { id: 'p' + Date.now().toString(36), year: y.id, kind, nos, answers: {}, results: {}, cur: 0, started: Date.now(), limitSec: opts.limitSec || null, instant: kind !== 'full', label: opts.label || '' };
  app.store.touch('past');
  app.saveResume({ type: 'unit', hash: `#/past/${y.id}/run`, title: `過去問：${P.active.label}` });
  app.go(`#/past/${y.id}/run`);
}

function yearStats(s, y) {
  const st = {};
  for (const q of y.questions) {
    const qs = s.qstate[pastQid(y.id, q.no)];
    st[q.no] = qs ? { seen: qs.seen, last: qs.lastCorrect } : null;
  }
  return st;
}

function yearView(view, app, y, meta) {
  const s = app.s; const P = ensure(s);
  const st = yearStats(s, y);
  const nos = (f) => y.questions.filter((q) => !f || q.field === f).map((q) => q.no);
  const wrong = y.questions.filter((q) => st[q.no] && st[q.no].last === false).map((q) => q.no);
  const unseen = y.questions.filter((q) => !st[q.no]).map((q) => q.no);
  const studiedUnits = new Set(Object.entries(app.A.units).filter(([, u]) => u.status !== 'new').map(([id]) => id));
  const learned = y.questions.filter((q) => studiedUnits.has(q.unit)).map((q) => q.no);
  const hist = P.sessions.filter((x) => x.year === y.id).slice(-5).reverse();
  view.innerHTML = `
  <section class="card"><h2>${esc(y.label)} 公開問題</h2>
    ${P.active && P.active.year === y.id ? `<a class="btn primary wide" href="#/past/${y.id}/run">▶ 続きから解く（${esc(P.active.label)}）</a>` : ''}
    <h3>本番形式</h3>
    <p class="small muted">100問・${EXAM.minutes}分。最後にまとめて採点します（途中で中断・再開できます）。</p>
    <button class="btn primary wide" data-run="full">100問・${EXAM.minutes}分で解く</button>
    <h3>1問ずつ（すぐ答え合わせ・解説つき）</h3>
    <div class="menu">
      ${FIELDS.map((f) => `<button class="mi" data-run="f:${f.id}"><b>${esc(f.name)}</b><small>${nos(f.id).length}問</small></button>`).join('')}
      <button class="mi" data-run="learned" ${learned.length ? '' : 'disabled'}><b>学習済みの単元だけ</b><small>${learned.length}問</small></button>
      <button class="mi" data-run="wrong" ${wrong.length ? '' : 'disabled'}><b>間違えた問題</b><small>${wrong.length}問</small></button>
      <button class="mi" data-run="unseen" ${unseen.length ? '' : 'disabled'}><b>まだ解いていない問題</b><small>${unseen.length}問</small></button>
    </div>
  </section>
  ${hist.length ? `<section class="card"><h3>結果の履歴</h3><ul class="small">${hist.map((h) => `<li><a href="#/past/${y.id}/result/${h.id}">${new Date(h.t).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}　${esc(h.label)}　${h.c}/${h.n}（${pct(h.c / h.n)}）</a></li>`).join('')}</ul></section>` : ''}
  <section class="card"><h3>この年度の出題（本アプリの分類）</h3>
    ${FIELDS.map((f) => {
      const qs = y.questions.filter((q) => q.field === f.id);
      const by = {};
      for (const q of qs) by[q.unit] = (by[q.unit] || 0) + 1;
      return `<details><summary>${esc(f.name)}（${qs.length}問）</summary><ul class="small">${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([u, n]) => `<li><a href="#/unit/${u}">${esc(unitName(u))}</a> ${n}問</li>`).join('')}</ul></details>`;
    }).join('')}
    <p class="tiny muted">取り込み：${new Date(meta.importedAt).toLocaleString('ja-JP')}${meta.inexact.length ? `　ページ全体を表示する問題：問${meta.inexact.join('・')}` : ''}</p>
    <button class="btn ghost small" id="del">取り込んだ画像を削除</button>
  </section>
  ${termsBox()}
  <a class="btn ghost wide" href="#/past">‹ 過去問のトップへ</a>`;
  view.querySelectorAll('[data-run]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.run;
    if (k === 'full') return startRun(app, y, 'full', nos(), { limitSec: EXAM.minutes * 60, label: `${y.label} 本番形式` });
    if (k.startsWith('f:')) return startRun(app, y, 'drill', nos(k.slice(2)), { label: `${y.label} ${fieldName(k.slice(2))}` });
    if (k === 'learned') return startRun(app, y, 'drill', learned, { label: `${y.label} 学習済みの単元` });
    if (k === 'wrong') return startRun(app, y, 'drill', wrong, { label: `${y.label} 間違えた問題` });
    if (k === 'unseen') return startRun(app, y, 'drill', unseen, { label: `${y.label} 未回答` });
  }));
  view.querySelector('#del').addEventListener('click', async () => {
    if (!(await confirmDialog({ title: '取り込んだ画像を削除', body: `<p>${esc(y.label)}の問題の画像をこの端末から削除します。回答の記録は残ります。</p>`, ok: '削除する', danger: true }))) return;
    await idbDeletePrefix(`img:${y.id}:`); await idbDeletePrefix(`meta:${y.id}`);
    resetUrls(); imported = null; toast('削除しました'); app.go('#/past');
  });
}

function runView(view, app, y) {
  const s = app.s; const P = ensure(s);
  const act = P.active;
  if (!act || act.year !== y.id) { app.go('#/past/' + y.id); return; }
  let cur = Math.min(act.cur || 0, act.nos.length - 1);
  let shownAt = Date.now();
  let timer = null;
  const save = () => { act.cur = cur; app.store.touch('past'); };
  const left = () => Math.max(0, act.limitSec - Math.floor((Date.now() - act.started) / 1000));
  const draw = () => {
    clearInterval(timer);
    const no = act.nos[cur];
    const q = qOf(y, no);
    const stem = stemOf(y, no);
    const chosen = act.answers[no];
    const showRes = act.instant && chosen != null;
    view.innerHTML = `
    <section class="card quiz">
      <div class="row between"><span class="small">${cur + 1} / ${act.nos.length}　問${no}（${esc(fieldName(q.field))}）</span>${act.limitSec ? '<span class="badge" id="timer"></span>' : ''}</div>
      <div class="badges"><span class="badge official">公式公開問題</span><span class="badge">${esc(y.label)}</span></div>
      ${stem ? `<details class="past-stem" ${cur === 0 || act.nos[cur - 1] !== no - 1 ? 'open' : ''}><summary>中問の文章（問${stem.first}〜${stem.last}で共通）</summary>${imgTag(`img:${y.id}:s${stem.first}`, `問${stem.first}〜${stem.last}の文章`)}</details>` : ''}
      ${imgTag(`img:${y.id}:${no}`, `問${no}の問題（IPA公開PDFの画像）`)}
      <p class="tiny muted">${esc(citation(y, no))}</p>
      <div class="past-choices" role="group" aria-label="答えを選ぶ">
        ${KANA.map((k, i) => `<button class="choice past-choice ${chosen === i ? 'picked' : ''} ${showRes && i === q.answer ? 'right' : ''} ${showRes && i === chosen && i !== q.answer ? 'wrong' : ''}" data-k="${i}" ${showRes ? 'disabled' : ''}><span class="kana">${k}</span></button>`).join('')}
      </div>
      ${showRes ? feedback(y, q, act.results[no]) : ''}
      <div class="row gap" style="margin-top:12px">
        <button class="btn ghost" id="prev" ${cur === 0 ? 'disabled' : ''}>‹ 前へ</button>
        ${cur < act.nos.length - 1 ? '<button class="btn primary" id="next">次へ ›</button>' : `<button class="btn primary" id="fin">${act.instant ? '終わる' : '採点する'}</button>`}
      </div>
      ${!act.instant ? `<details class="small" style="margin-top:10px"><summary>解答の一覧（${Object.keys(act.answers).length}/${act.nos.length}問回答）</summary><div class="past-sheet">${act.nos.map((n2, i) => `<button class="chip ${i === cur ? 'on' : ''}" data-j="${i}">${n2}${act.answers[n2] != null ? ':' + KANA[act.answers[n2]] : ''}</button>`).join('')}</div></details>` : ''}
      <button class="btn ghost wide" id="quit">中断する</button>
    </section>`;
    fillImages(view);
    shownAt = Date.now();
    if (act.limitSec) {
      const tick = () => {
        const l = left(); const el = view.querySelector('#timer');
        if (el) el.textContent = `残り ${Math.floor(l / 60)}:${String(l % 60).padStart(2, '0')}`;
        if (l <= 0) { clearInterval(timer); toast('時間になりました。採点します'); finish(); }
      };
      tick(); timer = setInterval(tick, 1000);
    }
    view.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => choose(Number(b.dataset.k))));
    view.querySelector('#prev')?.addEventListener('click', () => { cur--; save(); draw(); window.scrollTo(0, 0); });
    view.querySelector('#next')?.addEventListener('click', () => { cur++; save(); draw(); window.scrollTo(0, 0); });
    view.querySelector('#fin')?.addEventListener('click', finishAsk);
    view.querySelector('#quit').addEventListener('click', quit);
    view.querySelectorAll('[data-j]').forEach((b) => b.addEventListener('click', () => { cur = Number(b.dataset.j); save(); draw(); }));
    view.querySelectorAll('#reasons [data-r]').forEach((b) => b.addEventListener('click', () => {
      const r = act.results[no]; const firstTime = !r.reason;
      r.reason = b.dataset.r; setWrongReason(s, pastQid(y.id, no), r.reason);
      app.store.touch('answers', 'past');
      if (firstTime) app.reward(XP.reason, '間違いの振り返り');
      view.querySelectorAll('#reasons .chip').forEach((c) => c.classList.toggle('on', c === b));
    }));
  };
  const choose = (k) => {
    const no = act.nos[cur]; const q = qOf(y, no);
    const ms = Date.now() - shownAt;
    if (!act.instant) {
      act.answers[no] = k; save();
      if (cur < act.nos.length - 1) { cur++; save(); draw(); window.scrollTo(0, 0); } else draw();
      return;
    }
    if (act.answers[no] != null) return;
    const correct = k === q.answer;
    act.answers[no] = k;
    const { first } = recordAnswer(s, asQ(y, q), { correct, mode: 'past', ms });
    act.results[no] = { correct, first };
    app.tracker.countAnswer(correct);
    app.store.touch('answers', 'qstate', 'units', 'days', 'past');
    app.reward(correct ? (first ? XP.firstCorrect : 3) : (first ? XP.firstWrong : XP.reviewWrong), correct ? '正解（過去問）' : '挑戦（過去問）');
    save(); draw();
  };
  const finishAsk = async () => {
    const un = act.nos.filter((n2) => act.answers[n2] == null).length;
    if (!act.instant && un && !(await confirmDialog({ title: '採点しますか？', body: `<p>未回答が${un}問あります。</p>`, ok: '採点する', cancel: '続ける' }))) return;
    finish();
  };
  const finish = () => {
    clearInterval(timer);
    if (!P.active) return;
    const key = {}, fieldOf = {};
    for (const q of y.questions) { key[q.no] = q.answer; fieldOf[q.no] = q.field; }
    if (!act.instant) {
      for (const no of act.nos) {
        if (act.answers[no] == null) continue; // 未回答は記録しない（理解度の判定をゆがめないため）
        const q = qOf(y, no); const correct = act.answers[no] === q.answer;
        const { first } = recordAnswer(s, asQ(y, q), { correct, mode: 'past' });
        act.results[no] = { correct, first };
      }
    }
    const per = scorePast(act.nos, act.answers, key, fieldOf);
    const c = Object.values(per).reduce((a, x) => a + x.c, 0);
    const res = { id: act.id, year: y.id, t: Date.now(), kind: act.kind, label: act.label, nos: act.nos, answers: act.answers, per, n: act.nos.length, c, sec: Math.round((Date.now() - act.started) / 1000), limitSec: act.limitSec };
    P.sessions.push(res); P.active = null;
    app.clearResume();
    app.store.touch('answers', 'qstate', 'units', 'days', 'past');
    if (!act.instant) app.reward(XP.mock, '過去問の本番形式');
    app.replan('過去問の結果を反映');
    app.go(`#/past/${y.id}/result/${res.id}`);
  };
  const quit = async () => {
    const ok = await confirmDialog({ title: '中断しますか？', body: '<p>ここまでの回答は保存されています。「続きから解く」で再開できます。</p>', ok: '中断する', cancel: '続ける' });
    if (!ok) return;
    clearInterval(timer); save(); app.go('#/past/' + y.id);
  };
  // 画面を離れたらタイマーを止める
  window.addEventListener('hashchange', () => clearInterval(timer), { once: true });
  draw();
}

function feedback(y, q, r) {
  if (!r) return '';
  return `<div class="feedback ${r.correct ? 'ok' : 'ng'}">
    <div class="verdict">${r.correct ? '⭕ 正解！' : '❌ 不正解'}　正解は <b>${KANA[q.answer]}</b>（IPA解答例）</div>
    <h4>解説（本アプリ独自）</h4><p>${rich(q.explain)}</p>
    ${q.point ? `<h4>覚えるポイント</h4><p>${rich(q.point)}</p>` : ''}
    ${q.dated ? `<p class="tiny warn">⚠ ${esc(q.datedNote || '出題当時の制度・数値にもとづく問題です。最新の情報も確認してください。')}</p>` : ''}
    <p class="small">関連する単元：<a href="#/unit/${q.unit}">${esc(unitName(q.unit))}</a></p>
    ${r.correct ? '' : `<h4>間違えた理由は？</h4><div class="chips" id="reasons">${REASONS.map(([v, l]) => `<button class="chip ${r.reason === v ? 'on' : ''}" data-r="${v}">${l}</button>`).join('')}</div>`}
  </div>`;
}

function resultView(view, app, y, id) {
  const s = app.s; const P = ensure(s);
  const r = P.sessions.find((x) => x.id === id);
  if (!r) { view.innerHTML = '<section class="card"><p>結果が見つかりません。</p><a class="btn" href="#/past">戻る</a></section>'; return; }
  const unNos = r.nos.filter((no) => r.answers[no] == null);
  const un = unNos.length;
  const wrong = r.nos.filter((no) => r.answers[no] != null && r.answers[no] !== qOf(y, no).answer);
  const full = r.kind === 'full';
  // 単元ごとの誤答
  const byUnit = {};
  for (const no of wrong) { const u = qOf(y, no).unit; byUnit[u] = (byUnit[u] || 0) + 1; }
  view.innerHTML = `
  <section class="card"><h2>${esc(r.label)}</h2>
    <p class="big">${r.c} / ${r.n}問 正解（${pct(r.c / r.n)}）</p>
    <p class="small muted">${new Date(r.t).toLocaleString('ja-JP')}　所要 ${fmtMin(Math.round(r.sec / 60))}${un ? `　未回答 ${un}問` : ''}</p>
    ${FIELDS.filter((f) => r.per[f.id]?.n).map((f) => { const v = r.per[f.id].c / r.per[f.id].n; return `<div class="small"><b>${esc(f.name)}</b> ${r.per[f.id].c}/${r.per[f.id].n}（${pct(v)}）${bar(v, v >= 0.6 ? 'var(--ok)' : 'var(--ng)', f.name)}</div>`; }).join('')}
    ${full ? `<p class="small">本番は総合評価点${EXAM.passTotal}点以上（1,000点満点）かつ各分野${EXAM.passField}点以上で合格です。<b>本番の点数はIRT（項目応答理論）で計算され、正答数からは正確に出せません</b>。目安として、各分野6割を確実に超え、全体で7割以上を安定して取れるようにしましょう。</p>` : ''}
    <p class="tiny muted">公開問題1回分の結果です。合格を保証するものではありません。</p>
    ${wrong.length ? `<button class="btn primary wide" id="redo">間違えた${wrong.length}問を解き直す（解説つき）</button>` : ''}
    ${un ? `<button class="btn ghost wide" id="redoUn">未回答の${un}問を解く（解説つき）</button>` : ''}
  </section>
  ${Object.keys(byUnit).length ? `<section class="card"><h3>間違えた単元（復習する所）</h3><ul class="small">${Object.entries(byUnit).sort((a, b) => b[1] - a[1]).map(([u, n]) => `<li><a href="#/unit/${u}">${esc(unitName(u))}</a> ${n}問</li>`).join('')}</ul></section>` : ''}
  <section class="card"><h3>1問ずつ確認</h3>
    <div class="past-sheet">${r.nos.map((no) => { const ok = r.answers[no] === qOf(y, no).answer; const na = r.answers[no] == null; return `<button class="chip ${ok ? 'ok' : na ? '' : 'ng'}" data-no="${no}">${no} ${ok ? '○' : na ? '－' : '×'}</button>`; }).join('')}</div>
    <div id="detail"></div>
  </section>
  <a class="btn ghost wide" href="#/past/${y.id}">‹ ${esc(y.label)}へ</a>`;
  view.querySelector('#redo')?.addEventListener('click', () => startRun(app, y, 'drill', wrong, { label: `${y.label} 間違えた問題の解き直し` }));
  view.querySelector('#redoUn')?.addEventListener('click', () => startRun(app, y, 'drill', unNos, { label: `${y.label} 未回答だった問題` }));
  view.querySelectorAll('[data-no]').forEach((b) => b.addEventListener('click', () => {
    const no = Number(b.dataset.no); const q = qOf(y, no); const a = r.answers[no];
    const stem = stemOf(y, no);
    const d = view.querySelector('#detail');
    d.innerHTML = `<h4>問${no}　${a === q.answer ? '⭕ 正解' : a == null ? '－ 未回答' : '❌ 不正解'}</h4>
      <p class="small">あなたの答え：${a == null ? '未回答' : KANA[a]}　正解：${KANA[q.answer]}</p>
      ${stem ? `<details><summary>中問の文章</summary>${imgTag(`img:${y.id}:s${stem.first}`, '中問の文章')}</details>` : ''}
      ${imgTag(`img:${y.id}:${no}`, `問${no}の問題`)}
      <p class="tiny muted">${esc(citation(y, no))}</p>
      ${feedback(y, q, { correct: a === q.answer, reason: 'x' }).replace(/<h4>間違えた理由は？<\/h4>[\s\S]*?<\/div>\s*<\/div>$/, '</div>')}`;
    fillImages(d);
    d.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}
