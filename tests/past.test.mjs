// 公開問題（過去問）の年度データと、切り出し位置の計算のテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import { PAST_YEARS } from '../src/data/past.js';
import { UNITS } from '../src/data/syllabus.js';
import { layoutYear, marginX, guessYear, scorePast } from '../src/core/pastimport.js';

test('年度データ：各年100問・正答0〜3・単元と項目が存在・分野の区分が連続', () => {
  const unitIds = new Set(UNITS.map((u) => u.id));
  const itemIds = new Set(UNITS.flatMap((u) => u.items.map((i) => i.id)));
  assert.equal(PAST_YEARS.length, 4);
  for (const y of PAST_YEARS) {
    assert.equal(y.questions.length, 100, y.id);
    assert.deepEqual(y.questions.map((q) => q.no), Array.from({ length: 100 }, (_, i) => i + 1));
    for (const q of y.questions) {
      assert.ok([0, 1, 2, 3].includes(q.answer), `${y.id} 問${q.no}`);
      assert.ok(unitIds.has(q.unit), `${y.id} 問${q.no} unit`);
      assert.ok(itemIds.has(q.item) && q.item.startsWith(q.unit + '-'), `${y.id} 問${q.no} item`);
      assert.ok(q.explain && q.explain.length > 20, `${y.id} 問${q.no} explain`);
      assert.ok(q.page >= 2 && q.page <= y.pdfPages);
      const sec = Object.entries(y.sections).find(([, [a, b]]) => q.no >= a && q.no <= b)[0];
      assert.equal(q.field, sec);
    }
    // ページ番号は問題番号順に増える
    for (let i = 1; i < 100; i++) assert.ok(y.questions[i].page >= y.questions[i - 1].page);
  }
  // 公式の解答例と照合済みの正答（令和8年度）
  const kana = 'アイウエ';
  assert.equal(PAST_YEARS.find((y) => y.id === '2026r08').questions.map((q) => kana[q.answer]).join(''),
    'アアウイエエイウイエエエウアイアイアアイウエイアエアイイウアウウウアエウエイウアウイイイイウウウアウエアイウウエウアウアイエウウエイイエウエアイエアエエウエウエアアアエエエアアイウウイアイイアイウイウ');
});

// 架空のページ：問の行（左端0.10）と続きの行（0.15）
const line = (y0, x0, h = 0.012) => ({ y0, y1: y0 + h, x0, x1: 0.88 });
function fakePages() {
  const pages = [{ lines: [] }]; // 表紙
  // 2ページ目：見出し枠＋問1・問2、3ページ目：問2の続き＋問3、ほか margin 推定用に行を足す
  pages.push({ lines: [line(0.09, 0.09, 0.033), line(0.17, 0.10), line(0.19, 0.15), line(0.5, 0.10), line(0.52, 0.15)] });
  pages.push({ lines: [line(0.1, 0.15), line(0.12, 0.15), line(0.4, 0.10), line(0.42, 0.15), line(0.95, 0.45)] });
  pages.push({ lines: [] }); // 4ページ目（問題なし）：左端の推定に使う行
  for (let i = 0; i < 30; i++) pages[3].lines.push(line(0.1 + i * 0.02, 0.10, 0.009));
  return pages;
}
const fakeYear = { id: 'x', pdfPages: 3, questions: [{ no: 1, page: 2 }, { no: 2, page: 2 }, { no: 3, page: 3 }], stems: [] };

test('切り出し：次の問題の手前まで、ページをまたぐ問題は2つに分ける', () => {
  const pages = fakePages();
  assert.ok(Math.abs(marginX(pages) - 0.10) < 0.005);
  const r = layoutYear(pages, fakeYear);
  assert.deepEqual(r.mismatched, []);
  const q1 = r.items.find((i) => i.no === 1), q2 = r.items.find((i) => i.no === 2);
  assert.equal(q1.parts.length, 1);
  assert.ok(q1.parts[0].y1 < 0.5);
  assert.equal(q2.parts.length, 2); // 2ページ目の後半＋3ページ目の先頭（続き）
  assert.equal(q2.parts[1].page, 2);
  assert.ok(q2.parts[1].y1 < 0.4);
});

test('切り出し：問題数が合わないページは全体を付けて exact=false', () => {
  const pages = fakePages();
  const y = { ...fakeYear, questions: [{ no: 1, page: 2 }, { no: 2, page: 2 }, { no: 3, page: 2 }] };
  const r = layoutYear(pages, y);
  assert.deepEqual(r.mismatched, [2]);
  assert.ok(r.items.every((i) => !i.exact));
});

test('年度の候補（ページ数）と分野別採点', () => {
  assert.deepEqual(guessYear(52, PAST_YEARS).sort(), ['2023r05', '2024r06']);
  const per = scorePast([1, 2, 3], { 1: 0, 2: 1 }, { 1: 0, 2: 2, 3: 1 }, { 1: 'S', 2: 'S', 3: 'T' });
  assert.deepEqual(per.S, { n: 2, c: 1 });
  assert.deepEqual(per.T, { n: 1, c: 0 });
});
