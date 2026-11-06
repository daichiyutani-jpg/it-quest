// 教材・問題データの形式チェック。使い方: node tools/validate.mjs [c1 c2 ...]
// 問題の正誤そのものは、作成とは別の担当が出典と照合する（src/data/verify/）。ここでは形・ID・出典ID・照合結果のつながりを機械的に調べる。
import { UNITS } from '../src/data/syllabus.js';
import { CONTENT_FILES } from '../src/data/content/index.js';
import { SOURCE_BY_ID } from '../src/data/sources.js';
import VERIFY from '../src/data/verify/all.js';

const names = process.argv.slice(2).length ? process.argv.slice(2) : CONTENT_FILES;
const FIG_TYPES = ['flow', 'cycle', 'layers', 'compare', 'steps', 'tree'];
const STATUSES = ['verified', 'needs_review', 'suspended'];
const TAGS = ['mix', 'calc', 'read', 'law', 'order', 'number'];
const perUnit = Object.fromEntries(UNITS.map((u) => [u.id, 0]));
const verifiedPerUnit = Object.fromEntries(UNITS.map((u) => [u.id, 0]));
const figPerUnit = Object.fromEntries(UNITS.map((u) => [u.id, 0]));
const allIds = new Set();
const st = (id, own) => VERIFY.items?.[id]?.status || own || 'needs_review';
const srcs = (id, own) => VERIFY.items?.[id]?.sourceIds || own || [];
function checkSources(w, ids) {
  if (!Array.isArray(ids) || !ids.length) errors.push(`${w}: sourceIds が無い`);
  for (const x of ids || []) if (!SOURCE_BY_ID[x]) errors.push(`${w}: 出典ID ${x} が sources.js に無い`);
}
const unitIds = new Set(UNITS.map((u) => u.id));
const itemIds = new Set(UNITS.flatMap((u) => u.items.map((i) => i.id)));
const errors = [];
const warns = [];
const seenQ = new Set();
const seenUnit = new Set();
const answerPos = [0, 0, 0, 0];
let qCount = 0;
const coveredItems = new Set();

for (const n of names) {
  let mod;
  try { mod = await import(`../src/data/content/${n}.js`); } catch (e) { errors.push(`${n}: 読み込めない ${e.message}`); continue; }
  for (const u of mod.default) {
    const where = `${n}/${u.unit}`;
    if (!unitIds.has(u.unit)) errors.push(`${where}: 不明な単元ID`);
    // 教材なし（questions だけ）の項目は、既に教材がある単元への追加問題として扱う
    const supplement = !u.lesson;
    if (supplement && !seenUnit.has(u.unit)) errors.push(`${where}: 追加問題だけで、先に教材のある単元がない`);
    if (!supplement && seenUnit.has(u.unit)) errors.push(`${where}: 単元が重複`);
    seenUnit.add(u.unit);
    if (u.lesson) { allIds.add(`lesson:${u.unit}`); if (VERIFY.items?.[`lesson:${u.unit}`]?.status === 'verified') checkSources(`${where}/lesson`, srcs(`lesson:${u.unit}`)); }
    for (const f of u.figures || []) {
      const w = `${where}/${f.id}`;
      if (allIds.has(f.id)) errors.push(`${w}: 図のIDが重複`);
      allIds.add(f.id);
      figPerUnit[u.unit]++;
      if (!f.id?.startsWith(u.unit + '-f')) errors.push(`${w}: 図のIDが「単元ID-f」で始まらない`);
      if (!FIG_TYPES.includes(f.type)) errors.push(`${w}: type が不正`);
      if (!f.title) errors.push(`${w}: title が無い`);
      if (f.item && (!itemIds.has(f.item) || !f.item.startsWith(u.unit + '-'))) errors.push(`${w}: item ${f.item} がこの単元の項目でない`);
      if (!STATUSES.includes(st(f.id, f.status))) errors.push(`${w}: status が不正`);
      checkSources(w, srcs(f.id, f.sourceIds));
      const len = (a, lo, hi, nm) => { if (!Array.isArray(a) || a.length < lo || a.length > hi) errors.push(`${w}: ${nm} の数が${lo}〜${hi}でない`); };
      if (f.type === 'flow' || f.type === 'cycle') { len(f.nodes, f.type === 'flow' ? 2 : 3, f.type === 'flow' ? 7 : 6, 'nodes'); (f.nodes || []).forEach((x) => { if (!x.label) errors.push(`${w}: label が無い`); }); }
      if (f.type === 'layers') len(f.rows, 2, 8, 'rows');
      if (f.type === 'compare') { len(f.cols, 2, 4, 'cols'); len(f.rows, 2, 6, 'rows'); (f.rows || []).forEach((r) => { if (r.length !== (f.cols || []).length) errors.push(`${w}: 行の列数が cols と違う`); }); }
      if (f.type === 'steps') len(f.steps, 2, 7, 'steps');
      if (f.type === 'tree') { if (!f.root) errors.push(`${w}: root が無い`); len(f.children, 2, 5, 'children'); }
    }
    const L = u.lesson || {};
    if (!supplement) {
    if (!Array.isArray(L.pages) || L.pages.length < 1) errors.push(`${where}: lesson.pages が無い`);
    for (const p of L.pages || []) {
      if (!p.title || !p.body) errors.push(`${where}: ページに title/body が無い`);
      if ((p.body || '').length > 420) warns.push(`${where}: ページ「${p.title}」が長い(${p.body.length}字)`);
    }
    if (!Array.isArray(L.terms) || L.terms.length < 3) errors.push(`${where}: terms が3語未満`);
    for (const t of L.terms || []) {
      if (!t.term || !t.desc) errors.push(`${where}: 用語に term/desc が無い`);
      if (t.item && !itemIds.has(t.item)) errors.push(`${where}: 用語 ${t.term} の item ${t.item} が不明`);
    }
    if (!L.example) errors.push(`${where}: example が無い`);
    if (!L.beginner) errors.push(`${where}: beginner が無い`);
    }
    if (!Array.isArray(u.questions) || u.questions.length < (supplement ? 1 : 4)) errors.push(`${where}: 問題が足りない`);
    for (const q of u.questions || []) {
      const w = `${where}/${q.id}`;
      qCount++;
      if (seenQ.has(q.id)) errors.push(`${w}: 問題IDが重複`);
      seenQ.add(q.id); allIds.add(q.id);
      perUnit[u.unit]++;
      const status = st(q.id, q.status);
      if (!STATUSES.includes(status)) errors.push(`${w}: status が不正`);
      if (status === 'verified') verifiedPerUnit[u.unit]++;
      if (status === 'verified' || (q.sourceIds || []).length) checkSources(w, srcs(q.id, q.sourceIds)); // 照合前は出典なしでもよい（照合で付ける）
      for (const t of q.tags || []) if (!TAGS.includes(t)) warns.push(`${w}: 不明な tag ${t}`);
      if (!q.id?.startsWith(u.unit + '-')) errors.push(`${w}: IDが単元IDで始まらない`);
      if (!itemIds.has(q.item) || !q.item.startsWith(u.unit + '-')) errors.push(`${w}: item ${q.item} がこの単元の項目でない`);
      else coveredItems.add(q.item);
      if (!['original', 'applied', 'mock', 'official'].includes(q.type)) errors.push(`${w}: type が不正`);
      if (q.type === 'official' && !(q.source && q.source.year && q.source.number && q.source.url)) errors.push(`${w}: 公式問題なのに出典が無い`);
      if (!['term', 'calc', 'case'].includes(q.format)) errors.push(`${w}: format が不正`);
      if (![1, 2, 3].includes(q.level)) errors.push(`${w}: level が不正`);
      if (!q.q) errors.push(`${w}: 問題文が無い`);
      if (!Array.isArray(q.choices) || q.choices.length !== 4) errors.push(`${w}: 選択肢が4つでない`);
      else {
        if (new Set(q.choices).size !== 4) errors.push(`${w}: 同じ選択肢がある`);
        if (q.choices.some((c) => /^[アイウエ][\s．.：:、]/.test(c))) warns.push(`${w}: 選択肢に記号が付いている`);
      }
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(`${w}: answer が0〜3でない`);
      else answerPos[q.answer]++;
      if (!q.explain) errors.push(`${w}: explain が無い`);
      if (!Array.isArray(q.why) || q.why.length !== 4) errors.push(`${w}: why が4つでない`);
      else if (/誤り|間違/.test(q.why[q.answer]) && !/正し|正解|適切/.test(q.why[q.answer])) warns.push(`${w}: 正解の選択肢の説明が「誤り」になっている可能性`);
    }
  }
}

for (const k of Object.keys(VERIFY.items || {})) if (!allIds.has(k)) errors.push(`照合結果 ${k}: 対応する教材・問題・図が無い`);
for (const [k, v] of Object.entries(VERIFY.items || {})) {
  if (!STATUSES.includes(v.status)) errors.push(`照合結果 ${k}: status が不正`);
  if (v.patch && 'answer' in v.patch && !(v.patch.answer >= 0 && v.patch.answer <= 3)) errors.push(`照合結果 ${k}: patch.answer が0〜3でない`);
}
const few = UNITS.filter((u) => perUnit[u.id] < 20).map((u) => `${u.id}(${perUnit[u.id]})`);
const fewV = UNITS.filter((u) => verifiedPerUnit[u.id] < 20).map((u) => `${u.id}(${verifiedPerUnit[u.id]})`);
const noFig = UNITS.filter((u) => !figPerUnit[u.id]).map((u) => u.id);
const missingUnits = UNITS.filter((u) => !seenUnit.has(u.id)).map((u) => u.id);
const allItems = UNITS.flatMap((u) => u.items.map((i) => i.id));
const missingItems = allItems.filter((i) => !coveredItems.has(i));
console.log(`単元 ${seenUnit.size}/${UNITS.length}、問題 ${qCount}問、正解位置の分布 ${answerPos.join('/')}`);
console.log(`問題でカバーしたシラバス項目 ${coveredItems.size}/${allItems.length}`);
console.log(`照合済み ${Object.values(verifiedPerUnit).reduce((a, b) => a + b, 0)}問／図 ${Object.values(figPerUnit).reduce((a, b) => a + b, 0)}個`);
if (few.length) console.log('問題が20問未満の単元:', few.join(' '));
if (fewV.length && fewV.length < UNITS.length) console.log('照合済みが20問未満の単元:', fewV.join(' '));
if (noFig.length) console.log('図が無い単元:', noFig.join(' '));
if (missingUnits.length) console.log('未作成の単元:', missingUnits.join(' '));
if (missingItems.length) console.log('問題が無い項目:', missingItems.join(' '));
for (const w of warns) console.log('注意:', w);
for (const e of errors) console.log('エラー:', e);
process.exitCode = errors.length ? 1 : 0;
