// 理解度・定着度の判定と、回答の記録・復習（間隔反復）の管理。
// 「一度読んだ・一度正解した」だけでは習得確認済みにしない。
import { UNITS, FIELDS } from '../data/syllabus.js';
import { today, addDays, diffDays, now } from './util.js';

export const STATUS = {
  new: { label: '未学習', p: 0, cls: 'st-new' },
  learning: { label: '学習中', p: 0.25, cls: 'st-learning' },
  review: { label: '要復習', p: 0.4, cls: 'st-review' },
  basic: { label: '基礎理解済み', p: 0.7, cls: 'st-basic' },
  mastered: { label: '習得確認済み', p: 1, cls: 'st-mastered' },
};

// 復習間隔（日）。箱0=未出題、1=間違えた直後
export const INTERVALS = [0, 1, 3, 7, 16, 35];

export const RULES = {
  // 基礎理解済み：説明を読み終え、小テスト（10問）に9問以上で合格
  // 習得確認済み：基礎理解済み ＋ 合格した日から2日以上空けて、合格したテストに入っていない問題で再確認（3問以上・80%以上）
  //              または2日以上空けて別の小テストにもう一度合格 ＋ 直近の正答率80%以上 ＋ 間違えたままの問題なし
  masterAcc: 0.8,
  masterGapDays: 2,
  retestMinQ: 3,
  reviewAcc: 0.6, // 直近の正答率がこれ未満なら要復習
  recentN: 6,
  overdueDays: 7, // 復習予定をこれ以上過ぎた基礎理解・習得済みは要復習
};

export function unitRec(s, unitId) {
  if (!s.units[unitId]) s.units[unitId] = { pagesSeen: 0, lessonDone: null, lessonReads: 0, termsViews: 0, firstAt: null, lastAt: null };
  return s.units[unitId];
}

function dayRec(s, d = today()) {
  if (!s.days[d]) s.days[d] = { sec: 0, answers: 0, correct: 0, lessons: 0, reviews: 0 };
  return s.days[d];
}

/** 回答時の自信（学習アプリ共通ルール §7・§11） */
export const CONFIDENCE = { sure: '自信あり', maybe: 'たぶん', guess: '勘' };

/**
 * 回答を記録して、問題ごとの復習予定を更新する（間隔反復。式は docs/DESIGN.md §3）
 * - 不正解：箱1（翌日）
 * - 正解・自信あり：箱+1、間隔 INTERVALS[箱]
 * - 正解・たぶん：箱+1、間隔は半分（切り上げ）
 * - 正解・勘：箱は1のまま（上げない）、翌日。復習リストに入れる（自信のない正解を優先して確認）
 * - この問題を2回以上間違えている：箱4未満のうちは間隔を半分に（繰り返し間違える所は頻度を上げる）
 */
export function recordAnswer(s, q, { correct, mode, ms = 0, reason = null, choice = null, confidence = null, afterFormat = null }) {
  const qs = s.qstate[q.id] || { box: 0, due: null, seen: 0, correct: 0, wrong: 0, lastAt: null, lastCorrect: null, explainReads: 0, flagged: false };
  const first = qs.seen === 0;
  const wasDue = !first && qs.due && qs.due <= today();
  qs.seen++;
  let interval;
  if (correct) {
    qs.correct++;
    if (confidence === 'guess') {
      qs.box = Math.min(Math.max(qs.box, 1), 1);
      interval = 1;
      qs.flagged = true;
    } else {
      qs.box = Math.min(qs.box + 1, INTERVALS.length - 1);
      interval = INTERVALS[qs.box];
      if (confidence === 'maybe') interval = Math.max(1, Math.ceil(interval / 2));
      if (qs.lastCorrect === false) qs.flagged = qs.flagged && qs.box < 3; // 間違い→正解に戻ったら、定着するまで残す
    }
  } else {
    qs.wrong++;
    qs.box = 1;
    interval = INTERVALS[1];
    qs.flagged = true; // 間違えた問題は自動で復習登録
  }
  if (qs.wrong >= 2 && qs.box < 4) interval = Math.max(1, Math.ceil(interval / 2));
  qs.due = addDays(today(), interval);
  qs.lastAt = now().toISOString();
  qs.lastCorrect = correct;
  qs.lastConf = confidence;
  s.qstate[q.id] = qs;
  const rec = { qid: q.id, unit: q.unit, field: q.field, at: qs.lastAt, d: today(), correct, first, mode, ms: Math.round(ms) };
  if (reason) rec.reason = reason;
  if (choice != null) rec.choice = choice;
  if (confidence) rec.conf = confidence;
  if (afterFormat) rec.after = afterFormat;
  s.answers.push(rec);
  const u = unitRec(s, q.unit);
  u.firstAt = u.firstAt || qs.lastAt;
  u.lastAt = qs.lastAt;
  const d = dayRec(s);
  d.answers++;
  if (correct) d.correct++;
  if (wasDue) d.reviews++;
  return { first, wasDue, rec };
}

// ---------- 小テスト（共通ルール §10） ----------
export const TEST = { size: 10, pass: 9 }; // 10問中9問以上（90%）で合格

/** 小テストの結果を記録する */
export function recordTest(s, unitId, results) {
  if (!s.tests) s.tests = {};
  const list = s.tests[unitId] || (s.tests[unitId] = []);
  const correct = results.filter((r) => r.correct).length;
  const rec = { at: now().toISOString(), d: today(), qids: results.map((r) => r.qid), correct, total: results.length, passed: results.length >= TEST.size && correct >= TEST.pass };
  list.push(rec);
  return rec;
}

/** 解説を別の形式で読んだことを記録する（どの説明の後に正解できたかを見るため） */
export function recordExplainView(s, unitId, format) {
  const u = unitRec(s, unitId);
  u.lastFormat = { format, at: now().toISOString() };
}

export function setWrongReason(s, qid, reason) {
  for (let i = s.answers.length - 1; i >= 0; i--) {
    if (s.answers[i].qid === qid) { s.answers[i].reason = reason; return; }
  }
}

export function markLessonPage(s, unitId, page, total) {
  const u = unitRec(s, unitId);
  u.pagesSeen = Math.max(u.pagesSeen, page + 1);
  u.firstAt = u.firstAt || now().toISOString();
  u.lastAt = now().toISOString();
  if (page + 1 >= total && !u.lessonDone) {
    u.lessonDone = now().toISOString();
    dayRec(s).lessons++;
  }
  if (page + 1 >= total) u.lessonReads++;
}

export function addStudySeconds(s, sec) { dayRec(s).sec += sec; }

// ---------- 単元の判定 ----------
export function unitStats(s, DB, unitId) {
  const pool = DB.byUnit[unitId] || [];
  const inPool = new Set(pool);
  const ans = s.answers.filter((a) => a.unit === unitId && a.mode !== 'terms' && (inPool.has(a.qid) || a.mode === 'past')); // 公式の過去問（IPAの解答例と照合済み）も数える
  const recent = ans.slice(-RULES.recentN);
  const recentAcc = recent.length ? recent.filter((a) => a.correct).length / recent.length : null;
  const firsts = ans.filter((a) => a.first);
  const firstAcc = firsts.length ? firsts.filter((a) => a.correct).length / firsts.length : null;
  const repeats = ans.filter((a) => !a.first);
  const repeatAcc = repeats.length ? repeats.filter((a) => a.correct).length / repeats.length : null;
  const seenQ = pool.filter((id) => s.qstate[id]?.seen > 0);
  const openWrong = pool.filter((id) => s.qstate[id]?.lastCorrect === false);
  const unsure = pool.filter((id) => s.qstate[id]?.lastCorrect === true && ['guess', 'maybe'].includes(s.qstate[id]?.lastConf));
  const t = today();
  const dueQ = pool.filter((id) => s.qstate[id]?.seen > 0 && s.qstate[id].due <= t);
  const overdueMax = dueQ.reduce((m, id) => Math.max(m, diffDays(s.qstate[id].due, t)), 0);
  const correctDays = [...new Set(ans.filter((a) => a.correct).map((a) => a.d))].sort();
  const u = s.units[unitId] || {};
  const tests = (s.tests && s.tests[unitId]) || [];
  const lastTest = tests[tests.length - 1] || null;
  const firstPass = tests.find((x) => x.passed) || null;
  // 時間を空けた再確認
  let retest = { n: 0, c: 0, ok: false };
  if (firstPass) {
    const inTest = new Set(firstPass.qids);
    const later = ans.filter((a) => !inTest.has(a.qid) && diffDays(firstPass.d, a.d) >= RULES.masterGapDays);
    retest = { n: later.length, c: later.filter((a) => a.correct).length };
    const laterPass = tests.some((x) => x.passed && x !== firstPass && diffDays(firstPass.d, x.d) >= RULES.masterGapDays);
    retest.ok = laterPass || (retest.n >= RULES.retestMinQ && retest.c / retest.n >= RULES.masterAcc);
  }
  return {
    pool: pool.length, attempts: ans.length, recentN: recent.length, recentAcc, firstAcc, firstN: firsts.length, repeatAcc, repeatN: repeats.length,
    seenQ: seenQ.length, openWrong, unsure, dueQ, overdueMax, correctDays,
    lessonDone: !!u.lessonDone, pagesSeen: u.pagesSeen || 0, lessonReads: u.lessonReads || 0,
    tests: tests.length, lastTest, passed: !!firstPass, passedAt: firstPass?.d || null, retest,
  };
}

export function unitStatus(s, DB, unitId, st = unitStats(s, DB, unitId)) {
  const hasLesson = !!DB.lessons[unitId];
  if (st.attempts === 0 && st.pagesSeen === 0 && !st.tests) return 'new';
  const lessonOk = st.lessonDone || !hasLesson;
  const failedLast = st.lastTest && !st.lastTest.passed;
  const isBasic = lessonOk && st.passed && !failedLast;
  const isMaster = isBasic && st.retest.ok && (st.recentAcc ?? 0) >= RULES.masterAcc && st.openWrong.length === 0;
  const weak = (st.attempts >= 3 && st.recentAcc < RULES.reviewAcc) || st.openWrong.length >= 2 || failedLast;
  if (weak) return 'review';
  if (isMaster) return st.overdueMax >= RULES.overdueDays ? 'review' : 'mastered';
  if (isBasic) return st.overdueMax >= RULES.overdueDays ? 'review' : 'basic';
  return 'learning';
}

/** 理解度スコア 0〜1（計画の優先度づけに使う。画面には段階で表示する） */
export function understanding(st) {
  if (!st.attempts) return st.lessonDone ? 0.15 : 0;
  const acc = st.recentN ? st.recentAcc : 0;
  const cover = st.pool ? Math.min(1, st.seenQ / Math.max(3, Math.min(st.pool, 6))) : 0;
  let u = 0.15 * (st.lessonDone ? 1 : 0) + 0.85 * acc * cover;
  if (st.passed) u = Math.max(u, 0.7);
  if (st.retest?.ok) u = Math.max(u, 0.9);
  if (st.lastTest && !st.lastTest.passed) u = Math.min(u, 0.6);
  return Math.min(1, u);
}

/** 全単元の状況をまとめて計算 */
export function analyze(s, DB) {
  const units = {};
  const counts = { new: 0, learning: 0, review: 0, basic: 0, mastered: 0 };
  for (const u of UNITS) {
    const st = unitStats(s, DB, u.id);
    const status = unitStatus(s, DB, u.id, st);
    units[u.id] = { ...st, status, und: understanding(st) };
    counts[status]++;
  }
  const fields = {};
  for (const f of FIELDS) {
    const us = UNITS.filter((u) => u.field === f.id);
    const w = us.reduce((a, u) => a + u.weight, 0);
    const prog = us.reduce((a, u) => a + u.weight * STATUS[units[u.id].status].p, 0) / w;
    const ans = s.answers.filter((a) => a.field === f.id && a.mode !== 'terms');
    const recent = ans.slice(-30);
    const firsts = ans.filter((a) => a.first);
    fields[f.id] = {
      progress: prog,
      units: us.length,
      studied: us.filter((u) => units[u.id].status !== 'new').length,
      mastered: us.filter((u) => units[u.id].status === 'mastered').length,
      recentAcc: recent.length ? recent.filter((a) => a.correct).length / recent.length : null,
      recentN: recent.length,
      firstAcc: firsts.length ? firsts.filter((a) => a.correct).length / firsts.length : null,
      firstN: firsts.length,
    };
  }
  const totalW = UNITS.reduce((a, u) => a + u.weight, 0);
  const progress = UNITS.reduce((a, u) => a + u.weight * STATUS[units[u.id].status].p, 0) / totalW;
  const all = s.answers.filter((a) => a.mode !== 'terms');
  const recent = all.slice(-50);
  const firsts = all.filter((a) => a.first);
  const repeats = all.filter((a) => !a.first);
  const t = today();
  const dueAll = Object.entries(s.qstate).filter(([id, q]) => q.seen > 0 && q.due <= t && DB.questions[id]).map(([id]) => id);
  const wrongAll = Object.entries(s.qstate).filter(([id, q]) => q.lastCorrect === false && DB.questions[id]).map(([id]) => id);
  const flagged = Object.entries(s.qstate).filter(([id, q]) => q.flagged && DB.questions[id]).map(([id]) => id);
  const weakUnits = UNITS.filter((u) => units[u.id].status === 'review').map((u) => u.id);
  const totalSec = Object.values(s.days).reduce((a, d) => a + d.sec, 0);
  return {
    units, counts, fields, progress, totalSec,
    studiedUnits: UNITS.length - counts.new,
    recentAcc: recent.length ? recent.filter((a) => a.correct).length / recent.length : null,
    recentN: recent.length,
    firstAcc: firsts.length ? firsts.filter((a) => a.correct).length / firsts.length : null,
    firstN: firsts.length,
    repeatAcc: repeats.length ? repeats.filter((a) => a.correct).length / repeats.length : null,
    repeatN: repeats.length,
    dueAll, wrongAll, flagged, weakUnits,
  };
}

/** 形式別の正答率（初見のみ／復習のみを分ける） */
export function accuracyBy(s, DB, key) {
  const out = {};
  for (const a of s.answers) {
    if (a.mode === 'terms') continue;
    const q = DB.questions[a.qid];
    if (!q) continue;
    const k = key === 'format' ? q.format : key === 'type' ? q.type : key === 'level' ? q.level : a[key];
    const o = out[k] || (out[k] = { n: 0, c: 0, fn: 0, fc: 0, rn: 0, rc: 0 });
    o.n++; if (a.correct) o.c++;
    if (a.first) { o.fn++; if (a.correct) o.fc++; } else { o.rn++; if (a.correct) o.rc++; }
  }
  return out;
}

/** 間違えた理由の集計 */
export function wrongReasons(s) {
  const out = {};
  for (const a of s.answers) if (!a.correct && a.reason) out[a.reason] = (out[a.reason] || 0) + 1;
  return out;
}

/** 間違いの傾向：誤りやすさの種類（問題の tags）と、自信ありで間違えた数 */
export function mistakeTrends(s, DB) {
  const tags = {}; let sureWrong = 0; let guessRight = 0;
  for (const a of s.answers) {
    if (a.mode === 'terms') continue;
    if (!a.correct) {
      for (const t of DB.questions[a.qid]?.tags || []) tags[t] = (tags[t] || 0) + 1;
      if (a.conf === 'sure') sureWrong++;
    } else if (a.conf === 'guess') guessRight++;
  }
  return { tags, sureWrong, guessRight };
}
