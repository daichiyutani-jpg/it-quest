// 中核ロジックのテスト（node --test tests/）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNITS } from '../src/data/syllabus.js';
import { indexContent, DB, inventory } from '../src/data/content/index.js';
import { Store } from '../src/core/store.js';
import { setNow, today, addDays } from '../src/core/util.js';
import { analyze, recordAnswer, markLessonPage, addStudySeconds, unitStatus } from '../src/core/mastery.js';
import { buildPlan, sessionPlan } from '../src/core/planner.js';
import { pickMock, pick } from '../src/core/picker.js';
import { updateStreak, levelInfo } from '../src/core/game.js';

const mods = await Promise.all(['c1', 'c2', 'c3', 'c4', 'c5'].map((f) => import(`../src/data/content/${f}.js`).then((m) => m.default)));
indexContent(mods);

async function fresh(start = '2026-11-05T09:00:00') {
  setNow(start);
  const st = await Store.open({ memory: true });
  Object.assign(st.s.settings, { setupDone: true, weekdayMin: 30, weekendMin: 60, daysPerWeek: 7 });
  st.s.meta.createdAt = new Date(start).toISOString();
  return st;
}
const q = (unit, i = 0) => DB.questions[DB.byUnit[unit][i]];
function readLesson(s, unit) { const n = DB.lessons[unit].pages.length + 3; for (let i = 0; i < n; i++) markLessonPage(s, unit, i, n); }
function answer(s, unit, i, correct) { return recordAnswer(s, q(unit, i), { correct, mode: 'unit' }); }

test('教材と問題：全63単元・全180項目がそろい、正解番号が選択肢の範囲内', () => {
  const inv = inventory();
  assert.equal(inv.missingLessons.length, 0);
  assert.equal(inv.noQuestionUnits.length, 0);
  assert.equal(inv.itemsCovered, inv.itemsTotal);
  assert.equal(inv.byType.official, 0, '出典未確認の公式問題を入れていない');
  for (const x of Object.values(DB.questions)) {
    assert.equal(x.choices.length, 4, x.id);
    assert.ok(x.answer >= 0 && x.answer < 4, x.id);
    assert.equal(x.why.length, 4, x.id);
  }
});

test('理解度：一度読んだ・一度正解しただけでは習得確認済みにならない', async () => {
  const st = await fresh(); const s = st.s;
  readLesson(s, 'U01');
  answer(s, 'U01', 0, true);
  assert.equal(unitStatus(s, DB, 'U01'), 'learning');
  answer(s, 'U01', 1, true); answer(s, 'U01', 2, true);
  assert.equal(unitStatus(s, DB, 'U01'), 'basic');
  // 同じ日にたくさん正解しても習得確認にはならない
  for (let i = 3; i < 6; i++) answer(s, 'U01', i, true);
  assert.equal(unitStatus(s, DB, 'U01'), 'basic');
  // 3日後にもう一度正解すると習得確認
  setNow('2026-11-08T09:00:00');
  for (let i = 0; i < 6; i++) answer(s, 'U01', i, true);
  assert.equal(unitStatus(s, DB, 'U01'), 'mastered');
});

test('理解度：間違いが続くと要復習、解き直して正解すると戻る', async () => {
  const st = await fresh(); const s = st.s;
  readLesson(s, 'U22');
  answer(s, 'U22', 0, false); answer(s, 'U22', 1, false); answer(s, 'U22', 2, true);
  assert.equal(unitStatus(s, DB, 'U22'), 'review');
  answer(s, 'U22', 0, true); answer(s, 'U22', 1, true); answer(s, 'U22', 3, true); answer(s, 'U22', 4, true);
  assert.notEqual(unitStatus(s, DB, 'U22'), 'review');
});

test('初見と復習の正答率を区別して集計する', async () => {
  const st = await fresh(); const s = st.s;
  answer(s, 'U40', 0, false);
  answer(s, 'U40', 0, true);
  answer(s, 'U40', 0, true);
  const A = analyze(s, DB);
  assert.equal(A.firstN, 1); assert.equal(A.firstAcc, 0);
  assert.equal(A.repeatN, 2); assert.equal(A.repeatAcc, 1);
});

test('計画：実績が設定より少ないと見込みが遅れ、多いと早まる（固定の計画に合わせない）', async () => {
  const lazy = await fresh('2026-11-01T09:00:00');
  const busy = await fresh('2026-11-01T09:00:00');
  for (let d = 1; d <= 5; d++) {
    const day = `2026-11-0${d}`;
    lazy.s.days[day] = { sec: 5 * 60, answers: 3, correct: 2, lessons: 0 };
    busy.s.days[day] = { sec: 120 * 60, answers: 30, correct: 25, lessons: 2 };
  }
  setNow('2026-11-06T09:00:00');
  const Pl = buildPlan(lazy.s, DB, analyze(lazy.s, DB));
  const Pb = buildPlan(busy.s, DB, analyze(busy.s, DB));
  assert.ok(Pl.actual.eff < 1 && Pb.actual.eff > 1);
  assert.ok(Pl.projected > Pb.projected, `${Pl.projected} > ${Pb.projected}`);
  assert.ok(Pl.capacityMin < Pb.capacityMin);
  assert.ok(Pl.messages.some((m) => m.includes('少なめ')));
});

test('計画：数日空くと再計画のメッセージを出し、要調整にする', async () => {
  const st = await fresh('2026-11-01T09:00:00'); const s = st.s;
  readLesson(s, 'U01'); answer(s, 'U01', 0, true); addStudySeconds(s, 900);
  setNow('2026-11-06T09:00:00');
  const P = buildPlan(s, DB, analyze(s, DB));
  assert.equal(P.gapDays, 5);
  assert.equal(P.status, 'adjust');
  assert.ok(P.messages.some((m) => m.includes('5日空きました')));
});

test('計画：受験日を変えると直前対策の開始日も変わり、直前期は模擬試験を含む', async () => {
  const st = await fresh(); const s = st.s;
  s.settings.examDate = '2026-12-20';
  let P = buildPlan(s, DB, analyze(s, DB));
  assert.equal(P.finalStart, '2026-12-13'); assert.equal(P.mode, 'normal');
  s.settings.examDate = '2026-11-10';
  P = buildPlan(s, DB, analyze(s, DB));
  assert.equal(P.finalStart, '2026-11-03'); assert.equal(P.mode, 'final');
  const plan = sessionPlan(s, DB, analyze(s, DB), P, 120);
  assert.ok(plan.blocks.some((b) => b.kind === 'mock'));
  // 未学習の重要単元を切り捨てない
  assert.ok(plan.blocks.some((b) => b.kind === 'lesson'));
  assert.ok(P.priority.length === UNITS.length, '未学習の単元は全部優先順位リストに残る');
});

test('計画：時間が足りないときは後回しの単元を明示し、省略しない', async () => {
  const st = await fresh(); const s = st.s;
  Object.assign(s.settings, { examDate: '2026-11-25', weekdayMin: 10, weekendMin: 10, daysPerWeek: 3 });
  const A = analyze(s, DB);
  const P = buildPlan(s, DB, A);
  assert.ok(P.ratio > 1);
  assert.ok(P.deferred.length > 0);
  assert.equal(P.status, 'focus');
  assert.equal(P.priority.length, UNITS.length);
});

test('計画：受験日未設定でも計画でき、要集中にはしない', async () => {
  const st = await fresh(); const s = st.s;
  Object.assign(s.settings, { examDate: null, weekdayMin: 10, weekendMin: 10, daysPerWeek: 2 });
  const P = buildPlan(s, DB, analyze(s, DB));
  assert.notEqual(P.status, 'focus');
  assert.equal(P.target, '2026-12-06');
});

test('1回の学習：10分・30分・60分・120分で内容が変わる', async () => {
  const st = await fresh(); const s = st.s;
  readLesson(s, 'U01'); for (let i = 0; i < 4; i++) answer(s, 'U01', i, i !== 1);
  const A = analyze(s, DB); const P = buildPlan(s, DB, A);
  const kinds = (m) => sessionPlan(s, DB, A, P, m).blocks.map((b) => b.kind);
  const k10 = kinds(10); const k30 = kinds(30); const k60 = kinds(60); const k120 = kinds(120);
  assert.ok(k10.includes('terms') && !k10.includes('drill'));
  assert.ok(k30.includes('lesson') || k30.includes('remedial'));
  assert.ok(k60.filter((k) => k === 'lesson').length >= 1);
  assert.ok(k120.includes('drill'));
  for (const m of [10, 30, 60, 120]) assert.ok(sessionPlan(s, DB, A, P, m).blocks.reduce((a, b) => a + b.min, 0) <= m + 2, `${m}分を超えない`);
});

test('理解が不十分な単元があると、新しい単元より先に補強を入れる', async () => {
  const st = await fresh(); const s = st.s;
  readLesson(s, 'U05');
  answer(s, 'U05', 0, false); answer(s, 'U05', 1, false); answer(s, 'U05', 2, false);
  const A = analyze(s, DB); const P = buildPlan(s, DB, A);
  assert.equal(P.stuck[0], 'U05');
  const b = sessionPlan(s, DB, A, P, 30).blocks;
  assert.ok(b.some((x) => x.kind === 'remedial' && x.unit === 'U05'));
  assert.ok(!b.some((x) => x.kind === 'lesson'), '30分では新しい単元に進まない');
});

test('模擬試験：100問を35:20:45の比率で選ぶ', () => {
  const ids = pickMock({ qstate: {} }, DB, 100);
  const c = { S: 0, M: 0, T: 0 };
  for (const id of ids) c[DB.questions[id].field]++;
  assert.deepEqual(c, { S: 35, M: 20, T: 45 });
  assert.equal(new Set(ids).size, 100);
});

test('復習：間違えた問題は翌日に復習対象になる', async () => {
  const st = await fresh(); const s = st.s;
  answer(s, 'U59', 0, false);
  assert.equal(s.qstate[q('U59').id].due, addDays(today(), 1));
  setNow('2026-11-06T09:00:00');
  const A = analyze(s, DB);
  assert.ok(A.dueAll.includes(q('U59').id));
  assert.deepEqual(pick(s, DB, A, { kind: 'review', count: 5 }), [q('U59').id]);
});

test('バックアップ：書き出したJSONを読み込むと同じデータに戻る。壊れたファイルは拒否', async () => {
  const st = await fresh(); const s = st.s;
  readLesson(s, 'U10'); answer(s, 'U10', 0, true); s.settings.examDate = '2027-01-20';
  const json = st.exportJSON();
  const st2 = await fresh();
  const { data } = Store.parseBackup(json);
  await st2.replaceAll(data);
  assert.equal(st2.s.answers.length, 1);
  assert.equal(st2.s.settings.examDate, '2027-01-20');
  assert.throws(() => Store.parseBackup('{"x":1}'));
  assert.throws(() => Store.parseBackup('not json'));
});

test('ゲーム：意味のある学習をした日だけ連続記録が伸びる', async () => {
  const st = await fresh(); const s = st.s;
  s.days[today()] = { sec: 120, answers: 2, correct: 1, lessons: 0 };
  assert.equal(updateStreak(s), false);
  s.days[today()].answers = 5;
  assert.equal(updateStreak(s), true);
  setNow('2026-11-06T09:00:00');
  s.days[today()] = { sec: 400, answers: 0, correct: 0, lessons: 0 };
  updateStreak(s);
  assert.equal(s.game.streak, 2);
  assert.equal(levelInfo(0).lv, 1); assert.equal(levelInfo(60).lv, 2);
});
