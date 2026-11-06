// docs/COVERAGE.md を作る（学習アプリ共通ルール §8：範囲表とアプリの単元の対応、漏れ0の確認）。
// 使い方: node tools/build-coverage.mjs   漏れがあれば終了コード1
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { UNITS, SYLLABUS_INFO } from '../src/data/syllabus.js';
import { loadContent, DB } from '../src/data/content/index.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
await loadContent(new URL('../src/data/content/', import.meta.url).href);
const all = Object.values(DB.allQuestions);
const ver = Object.values(DB.questions);
const cnt = (list, item) => list.filter((q) => q.item === item).length;
let gaps = 0; let gapsV = 0;
const rows = [];
for (const u of UNITS) {
  for (const it of u.items) {
    const a = cnt(all, it.id); const v = cnt(ver, it.id);
    if (!a) gaps++;
    if (!v) gapsV++;
    rows.push(`| ${u.daiName} | ${u.chuName} | ${u.no}. ${u.name} | (${it.no}) ${it.name} | ${u.id} | ${a} | ${v}${v ? '' : ' ⚠'} |`);
  }
}
const unitRows = UNITS.map((u) => `| ${u.id} | ${u.name} | ${DB.allLessons[u.id] ? (DB.lessons[u.id] ? '照合済み' : DB.allLessons[u.id].status) : '未作成'} | ${(DB.byUnit[u.id] || []).length}/${all.filter((q) => q.unit === u.id).length} | ${(DB.figures[u.id] || []).length}/${(DB.allFigures[u.id] || []).length} |`);
const md = `# 出題範囲とアプリの単元の対応（学習アプリ共通ルール §8）

自動生成：\`node tools/build-coverage.mjs\`（${new Date().toISOString().slice(0, 10)}）

- 範囲表：${SYLLABUS_INFO.name} ${SYLLABUS_INFO.version}（IPA、${SYLLABUS_INFO.published}掲載）の 大分類 → 中分類 → 小分類（=アプリの単元 ${UNITS.length}個）→ 項目（${UNITS.reduce((a, u) => a + u.items.length, 0)}個）
- 問題が1問も無い項目：**${gaps}**（全件）／照合済みの問題が無い項目：**${gapsV}**
- 「問題」は全件／照合済み（出題するのは照合済みだけ）

## 単元ごと

| 単元 | 名称 | 教材 | 問題（照合済み/全件） | 図（照合済み/全件） |
|---|---|---|---|---|
${unitRows.join('\n')}

## 項目ごと

| 大分類 | 中分類 | 小分類（単元） | 項目 | 単元ID | 問題（全件） | 照合済み |
|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
writeFileSync(join(ROOT, 'docs/COVERAGE.md'), md);
console.log(`項目の漏れ：全件 ${gaps}／照合済み ${gapsV}`);
process.exitCode = gaps ? 1 : 0;
