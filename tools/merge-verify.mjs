// 照合担当の報告（src/data/verify/raw/*.json）をまとめて、アプリが読む形にする。
// 使い方: node tools/merge-verify.mjs
// 出力:
//   src/data/verify/all.js     照合結果（status・sourceIds・note・patch）。index.js がデータに重ねる
//   src/data/sources-extra.js  照合で使った追加の情報源（SRC-100〜。URLが同じものは1つにまとめる）
//   docs/SOURCES.md            情報源の一覧（人が読む）
//   docs/FACTCHECK.md の「集計」部分（<!-- auto:start --> 〜 <!-- auto:end -->）
//
// raw の形（1ファイル＝1人の照合担当）:
// {
//   "range": "U01-U12", "verifier": "照合担当A（作成とは別のAI）", "checkedAt": "2026-11-06",
//   "sources": [{ "key": "S1", "name": "", "publisher": "", "url": "", "where": "", "published": "", "checked": "2026-11-06" }],
//   "items": { "U01-q01": { "status": "verified", "sourceIds": ["SRC-001", "S1"], "note": "", "patch": { ... } } }
// }
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const RAW = join(ROOT, 'src/data/verify/raw');
const { SOURCES: BASE_ALL } = await import('../src/data/sources.js');
const BASE = BASE_ALL.filter((s) => !/^SRC-1\d\d$/.test(s.id));
const baseIds = new Set(BASE.map((s) => s.id));

const files = existsSync(RAW) ? readdirSync(RAW).filter((f) => f.endsWith('.json')).sort() : [];
const extra = []; // { id, name, ..., used: Set }
const byUrl = new Map();
const items = {};
const reports = [];
const problems = [];
let nextId = 100;

const norm = (u) => String(u || '').trim().replace(/#.*$/, '').replace(/\/$/, '');
for (const f of files) {
  const r = JSON.parse(readFileSync(join(RAW, f), 'utf8'));
  const keyMap = {};
  for (const s of r.sources || []) {
    // 大学の講義資料には http だけで公開されているものがあるため、http も受け付ける
    if (!s.url || !/^https?:\/\//.test(s.url)) { problems.push(`${f}: 出典 ${s.key} のURLが http(s) で始まらない`); continue; }
    const u = norm(s.url);
    let ex = byUrl.get(u);
    if (!ex) {
      ex = { id: `SRC-${nextId++}`, name: s.name, publisher: s.publisher, url: s.url, where: new Set(), published: s.published || '記載なし', checked: s.checked || r.checkedAt, status: '照合済み', note: '' };
      byUrl.set(u, ex); extra.push(ex);
    }
    if (s.where) ex.where.add(s.where);
    if (s.checked && s.checked > ex.checked) ex.checked = s.checked;
    keyMap[s.key] = ex.id;
  }
  const counts = { verified: 0, needs_review: 0, suspended: 0, patched: 0 };
  for (const [id, v] of Object.entries(r.items || {})) {
    if (items[id]) problems.push(`${f}: ${id} が別の報告と重複（後の報告で上書き）`);
    const sourceIds = (v.sourceIds || []).map((k) => (baseIds.has(k) ? k : keyMap[k] || null));
    if (sourceIds.includes(null)) problems.push(`${f}: ${id} の出典キーが sources に無い (${v.sourceIds})`);
    const out = { status: v.status, sourceIds: sourceIds.filter(Boolean), at: r.checkedAt };
    if (v.note) out.note = v.note;
    if (v.patch && Object.keys(v.patch).length) { out.patch = v.patch; counts.patched++; }
    if (out.status === 'verified' && !out.sourceIds.length) { out.status = 'needs_review'; problems.push(`${f}: ${id} は出典なしのため needs_review に戻した`); }
    items[id] = out;
    counts[out.status] = (counts[out.status] || 0) + 1;
  }
  reports.push({ file: f, range: r.range, verifier: r.verifier, checkedAt: r.checkedAt, counts });
}

const checkedAt = reports.map((r) => r.checkedAt).sort().pop() || null;
const extraOut = extra.map((s) => ({ ...s, where: [...s.where].slice(0, 6).join('／') }));

writeFileSync(join(ROOT, 'src/data/verify/all.js'), `// 照合結果（自動生成：node tools/merge-verify.mjs。手で書き換えない）。
// 元データは src/data/verify/raw/*.json（照合担当の報告）。
export default ${JSON.stringify({ checkedAt, method: '作成とは別の担当（AI）が、公式シラバスと公的機関・規格団体などの資料を開いて照合', expert: false, items })};
`);
writeFileSync(join(ROOT, 'src/data/sources-extra.js'), `// 照合で使った追加の情報源（SRC-100 以降）。自動生成：node tools/merge-verify.mjs（手で書き換えない）。
export default ${JSON.stringify(extraOut, null, 1)};
`);

// ---------- docs/SOURCES.md ----------
const used = {};
for (const [id, v] of Object.entries(items)) for (const s of v.sourceIds || []) (used[s] ||= []).push(id);
const unitsOf = (ids) => [...new Set((ids || []).map((x) => x.replace(/^lesson:/, '').slice(0, 3)))].sort().join(' ');
const all = [...BASE, ...extraOut];
const md = `# 情報源（学習アプリ共通ルール §2）

自動生成：\`node tools/merge-verify.mjs\`（元は \`src/data/sources.js\` と照合担当の報告 \`src/data/verify/raw/\`）。
「取得日」は実際にページ・PDFを開いて確認した日です。開けなかった資料・存在を確かめられなかった資料は載せていません。

| id | 名称 | 発行元 | 公式URL | 該当箇所 | 公開日・改訂日 | 取得日 | 検証状況 | 対応する単元 |
|---|---|---|---|---|---|---|---|---|
${all.map((s) => `| ${s.id} | ${s.name} | ${s.publisher} | ${s.url} | ${String(s.where || '').replace(/\|/g, '／')} | ${s.published || '記載なし'} | ${s.checked} | ${s.status} | ${s.id === 'SRC-001' ? '全単元' : unitsOf(used[s.id]) || '—'} |`).join('\n')}

各問題・図・教材がどの情報源と照合されたかは \`src/data/verify/all.js\` の \`sourceIds\` にあります。
`;
writeFileSync(join(ROOT, 'docs/SOURCES.md'), md);

// ---------- docs/FACTCHECK.md の集計 ----------
const fc = join(ROOT, 'docs/FACTCHECK.md');
if (existsSync(fc)) {
  const txt = readFileSync(fc, 'utf8');
  const sum = { verified: 0, needs_review: 0, suspended: 0, patched: 0 };
  for (const v of Object.values(items)) { sum[v.status]++; if (v.patch) sum.patched++; }
  const table = `<!-- auto:start -->
| 報告 | 範囲 | 照合担当 | 照合日 | 照合済み | 未照合・疑義 | 利用停止 | 照合で修正 |
|---|---|---|---|---|---|---|---|
${reports.map((r) => `| ${r.file} | ${r.range} | ${r.verifier} | ${r.checkedAt} | ${r.counts.verified || 0} | ${r.counts.needs_review || 0} | ${r.counts.suspended || 0} | ${r.counts.patched} |`).join('\n')}
| 合計 | | | | ${sum.verified} | ${sum.needs_review} | ${sum.suspended} | ${sum.patched} |

照合で直した点・停止した理由は \`src/data/verify/all.js\` の \`note\` と \`patch\` にあります。
<!-- auto:end -->`;
  writeFileSync(fc, txt.replace(/<!-- auto:start -->[\s\S]*<!-- auto:end -->/, table));
}

console.log(`報告 ${files.length}件・照合結果 ${Object.keys(items).length}件・追加の情報源 ${extra.length}件`);
for (const p of problems) console.log('注意:', p);
