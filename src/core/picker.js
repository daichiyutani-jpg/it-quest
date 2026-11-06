// 演習の問題選び。復習は「間違えた・時間が経った」問題を優先し、初見の問題と区別する。
import { UNITS } from '../data/syllabus.js';
import { EXAM } from '../data/calendar.js';
import { shuffle, today, diffDays } from './util.js';

function seenOrder(s, ids) {
  const t = today();
  // 復習の必要が高い順：未解決の間違い → 予定日を過ぎた日数が多い → 箱が小さい
  return ids.slice().sort((a, b) => {
    const qa = s.qstate[a] || {}; const qb = s.qstate[b] || {};
    // 未解決の間違い(2) → 自信のない正解(1) → その他(0)
    const rank = (q) => (q.lastCorrect === false ? 2 : q.lastCorrect === true && (q.lastConf === 'guess' || q.lastConf === 'maybe') ? 1 : 0);
    const wa = rank(qa); const wb = rank(qb);
    if (wa !== wb) return wb - wa;
    const oa = qa.due ? diffDays(qa.due, t) : -99; const ob = qb.due ? diffDays(qb.due, t) : -99;
    if (oa !== ob) return ob - oa;
    return (qa.box || 0) - (qb.box || 0);
  });
}

/** 未出題を優先しつつ、足りなければ出題済みから補う */
function freshFirst(s, ids, n, rnd) {
  const fresh = shuffle(ids.filter((id) => !s.qstate[id]?.seen), rnd);
  const seen = seenOrder(s, ids.filter((id) => s.qstate[id]?.seen));
  return [...fresh, ...seen].slice(0, n);
}

export function pick(s, DB, A, opts, rnd = Math.random) {
  const all = Object.keys(DB.questions);
  const n = opts.count || 10;
  const studiedUnits = new Set(UNITS.filter((u) => A.units[u.id].status !== 'new').map((u) => u.id));
  switch (opts.kind) {
    case 'unitTest':
      return pickUnitTest(s, DB, opts.unit, rnd);
    case 'lessonCheck': {
      // 教材の中の練習問題（3問・その場で解説）。小テストに使う問題をなるべく残すため、出題済みを先に使う
      const ids = DB.byUnit[opts.unit] || [];
      const tested = testedSet(s, opts.unit);
      const seen = shuffle(ids.filter((id) => s.qstate[id]?.seen && !tested.has(id)), rnd);
      const fresh = shuffle(ids.filter((id) => !s.qstate[id]?.seen), rnd);
      return [...seen, ...fresh].slice(0, opts.count || 3);
    }
    case 'unit':
      return freshFirst(s, DB.byUnit[opts.unit] || [], opts.count || 99, rnd);
    case 'remedial': {
      const ids = DB.byUnit[opts.unit] || [];
      const wrong = ids.filter((id) => s.qstate[id]?.lastCorrect === false);
      const rest = freshFirst(s, ids.filter((id) => !wrong.includes(id)), 99, rnd);
      return [...wrong, ...rest].slice(0, opts.count || 5);
    }
    case 'field':
    case 'drill':
      return freshFirst(s, all.filter((id) => DB.questions[id].field === opts.field), n, rnd);
    case 'weak': {
      // 苦手分野：その分野のうち理解度が低い単元の問題を優先
      const units = UNITS.filter((u) => (!opts.field || u.field === opts.field) && A.units[u.id].status !== 'new')
        .sort((a, b) => A.units[a.id].und - A.units[b.id].und).slice(0, 6).map((u) => u.id);
      const ids = units.flatMap((u) => DB.byUnit[u] || []);
      const wrong = ids.filter((id) => s.qstate[id]?.lastCorrect === false);
      return [...shuffle(wrong, rnd), ...freshFirst(s, ids.filter((id) => !wrong.includes(id)), n, rnd)].slice(0, n);
    }
    case 'weakUnits': {
      const ids = A.weakUnits.flatMap((u) => DB.byUnit[u] || []);
      return seenOrder(s, ids).slice(0, n);
    }
    case 'wrong':
      return shuffle(A.wrongAll, rnd).slice(0, n);
    case 'flagged':
      return seenOrder(s, A.flagged).slice(0, n);
    case 'review': {
      const ids = opts.includeWrong ? [...new Set([...A.wrongAll, ...A.dueAll])] : A.dueAll;
      return seenOrder(s, ids).slice(0, n);
    }
    case 'check': {
      // 学習済みの単元から：直近に学んだ単元を多めに
      const recentUnits = [...new Set(s.answers.slice(-40).map((a) => a.unit))];
      const base = recentUnits.length ? recentUnits : [...studiedUnits];
      const ids = base.flatMap((u) => DB.byUnit[u] || []);
      return freshFirst(s, ids, n, rnd);
    }
    case 'random':
      return shuffle(opts.studiedOnly ? all.filter((id) => studiedUnits.has(DB.questions[id].unit)) : all, rnd).slice(0, n);
    case 'timed':
      return shuffle(all.filter((id) => studiedUnits.size === 0 || studiedUnits.has(DB.questions[id].unit)), rnd).slice(0, n);
    case 'mock':
      return pickMock(s, DB, n, rnd);
    default:
      return [];
  }
}

function testedSet(s, unit) {
  return new Set(((s.tests && s.tests[unit]) || []).flatMap((t) => t.qids));
}

/**
 * 小テスト（10問）：前回までの小テストに出していない問題 → 練習で解いていない問題 → の順に選ぶ。
 * 全部出し切ったら、いちばん前に出したテストの問題から使う（同じ10問の繰り返しにしない）。
 */
export function pickUnitTest(s, DB, unit, rnd = Math.random) {
  const ids = DB.byUnit[unit] || [];
  const tests = (s.tests && s.tests[unit]) || [];
  const tested = testedSet(s, unit);
  const notTested = ids.filter((id) => !tested.has(id));
  const a = shuffle(notTested.filter((id) => !s.qstate[id]?.seen), rnd);
  const b = shuffle(notTested.filter((id) => s.qstate[id]?.seen), rnd);
  let out = [...a, ...b];
  if (out.length < 10) {
    const last = new Set(tests.length ? tests[tests.length - 1].qids : []);
    const older = shuffle(ids.filter((id) => tested.has(id) && !last.has(id)), rnd);
    const lastOnes = shuffle(ids.filter((id) => last.has(id)), rnd);
    out = [...out, ...older, ...lastOnes];
  }
  const res = out.slice(0, 10);
  res.reused = res.filter((id) => tested.has(id)).length;
  return res;
}

/** 初回の基礎確認（10問）：分野の比率に近く（S4・M2・T4）、基礎(level1)の問題から、中分類が重ならないように */
export function pickDiagnostic(DB, rnd = Math.random) {
  const want = { S: 4, M: 2, T: 4 };
  const out = [];
  for (const f of ['S', 'M', 'T']) {
    const units = shuffle(UNITS.filter((u) => u.field === f), rnd);
    const usedChu = new Set();
    for (const u of units) {
      if (out.filter((id) => DB.questions[id].field === f).length >= want[f]) break;
      if (usedChu.has(u.chu)) continue;
      const cand = shuffle((DB.byUnit[u.id] || []).filter((id) => DB.questions[id].level === 1), rnd);
      if (cand.length) { out.push(cand[0]); usedChu.add(u.chu); }
    }
  }
  return out;
}

/** 模擬試験：本試験の分野比率（35:20:45）に合わせて、単元が偏らないように選ぶ。足りないときは足りないまま返す */
export function pickMock(s, DB, total, rnd = Math.random) {
  const want = { S: Math.round(total * EXAM.share.S / 100), M: Math.round(total * EXAM.share.M / 100) };
  want.T = total - want.S - want.M;
  const out = [];
  const shortage = {};
  for (const f of ['S', 'M', 'T']) {
    const units = UNITS.filter((u) => u.field === f);
    // 単元ごとに1問ずつ順番に取る（mock 区分の問題があれば優先）
    const queues = units.map((u) => {
      const ids = DB.byUnit[u.id] || [];
      const mocks = shuffle(ids.filter((id) => DB.questions[id].type === 'mock'), rnd);
      const others = shuffle(ids.filter((id) => DB.questions[id].type !== 'mock'), rnd);
      return [...mocks, ...others];
    });
    const got = [];
    let progress = true;
    while (got.length < want[f] && progress) {
      progress = false;
      for (const q of shuffle(queues, rnd)) {
        if (got.length >= want[f]) break;
        if (q.length) { got.push(q.shift()); progress = true; }
      }
    }
    if (got.length < want[f]) shortage[f] = want[f] - got.length;
    out.push(...got);
  }
  const ids = shuffle(out, rnd);
  ids.shortage = shortage;
  return ids;
}

/** 重要用語カード：学習済み単元の用語を、理解度が低い単元から */
export function pickTerms(s, DB, A, n = 8, rnd = Math.random) {
  const units = UNITS.filter((u) => A.units[u.id].status !== 'new' && DB.lessons[u.id])
    .sort((a, b) => A.units[a.id].und - A.units[b.id].und);
  const pool = units.length ? units : UNITS.filter((u) => DB.lessons[u.id]).slice(0, 3);
  const terms = [];
  for (const u of pool.slice(0, 8)) for (const t of DB.lessons[u.id].terms || []) terms.push({ ...t, unit: u.id });
  return shuffle(terms, rnd).slice(0, n);
}
