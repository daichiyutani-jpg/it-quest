// 教材・問題データの形式チェック。使い方: node tools/validate.mjs [c1 c2 ...]
// 問題の正誤そのものは人（またはレビュー）が確かめる。ここでは形・ID・矛盾しやすい箇所を機械的に調べる。
import { UNITS } from '../src/data/syllabus.js';

const names = process.argv.slice(2).length ? process.argv.slice(2) : ['c1', 'c2', 'c3', 'c4', 'c5', 'c6a', 'c6b', 'c6c'];
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
      seenQ.add(q.id);
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

const missingUnits = UNITS.filter((u) => !seenUnit.has(u.id)).map((u) => u.id);
const allItems = UNITS.flatMap((u) => u.items.map((i) => i.id));
const missingItems = allItems.filter((i) => !coveredItems.has(i));
console.log(`単元 ${seenUnit.size}/${UNITS.length}、問題 ${qCount}問、正解位置の分布 ${answerPos.join('/')}`);
console.log(`問題でカバーしたシラバス項目 ${coveredItems.size}/${allItems.length}`);
if (missingUnits.length) console.log('未作成の単元:', missingUnits.join(' '));
if (missingItems.length) console.log('問題が無い項目:', missingItems.join(' '));
for (const w of warns) console.log('注意:', w);
for (const e of errors) console.log('エラー:', e);
process.exitCode = errors.length ? 1 : 0;
