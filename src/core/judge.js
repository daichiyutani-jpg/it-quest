// 合格可能性の目安（学習アプリ共通ルール §13）。式と閾値は docs/DESIGN.md §6。
// - 合格を保証しない。表示は「目安」とし、根拠の数値を一緒に見せる。
// - 「教材を一通り終えた」と「合格できる実力がある」を分けて出す。
// - ITパスポートは総合600点以上かつ分野ごとに300点以上（各1,000点満点・IRT方式。SRC-002）なので、分野別に判定する。
//   IRT の評価点は正答率と一致しないため、正答率の閾値は合格基準（60%・30%）より高め（70%）に置く。
import { UNITS, FIELDS } from '../data/syllabus.js';
import { STATUS } from './mastery.js';

export const JUDGE = {
  minFirstN: 20, // 初見の正答率を使うのに必要な回答数（分野ごと）
  minExamN: 15, // 本番形式（模擬試験・公式の過去問 本番形式）の分野ごとの問題数
  good: { cover: 0.9, first: 0.7, exam: 0.7, retain: 0.6, weakMax: 1 },
  near: { cover: 0.6, first: 0.6, exam: 0.6 },
};
export const VERDICT = {
  good: { label: '目安に届いている', cls: 'ok' },
  near: { label: 'あと少し', cls: 'warn' },
  far: { label: 'まだ届いていない', cls: 'ng' },
  unknown: { label: '判定の材料が足りない', cls: 'muted' },
};

/** 本番形式の結果（模擬試験と、公式の過去問の本番形式）から、分野別の直近の成績 */
function examResults(s) {
  const list = [];
  for (const m of s.mocks || []) if (m.kind === 'mock' && m.total >= 20) list.push({ at: m.at, per: Object.fromEntries(FIELDS.map((f) => [f.id, { c: m.byField[f.id]?.[0] || 0, n: m.byField[f.id]?.[1] || 0 }])), src: '模擬試験' });
  for (const p of s.past?.sessions || []) if (p.kind === 'full') list.push({ at: new Date(p.t).toISOString(), per: p.per, src: '公式の過去問' });
  return list.sort((a, b) => (a.at < b.at ? -1 : 1));
}

export function judge(s, A) {
  const exams = examResults(s);
  const last = exams.slice(-2); // 直近2回の合計
  const fields = FIELDS.map((f) => {
    const us = UNITS.filter((u) => u.field === f.id);
    const w = us.reduce((a, u) => a + u.weight, 0);
    const cover = us.reduce((a, u) => a + u.weight * (['basic', 'mastered'].includes(A.units[u.id].status) ? 1 : 0), 0) / w;
    const learned = us.filter((u) => ['basic', 'mastered'].includes(A.units[u.id].status));
    const retain = learned.length ? learned.filter((u) => A.units[u.id].status === 'mastered').length / learned.length : null;
    const weak = us.filter((u) => A.units[u.id].status === 'review').length;
    const fa = A.fields[f.id];
    const first = fa.firstN >= JUDGE.minFirstN ? fa.firstAcc : null;
    const ex = last.reduce((a, e) => ({ c: a.c + (e.per[f.id]?.c || 0), n: a.n + (e.per[f.id]?.n || 0) }), { c: 0, n: 0 });
    const exam = ex.n >= JUDGE.minExamN ? ex.c / ex.n : null;
    let v;
    if (first == null || exam == null) v = cover >= JUDGE.near.cover && first != null && first >= JUDGE.near.first ? 'near' : (first == null && exam == null ? 'unknown' : 'far');
    else if (cover >= JUDGE.good.cover && first >= JUDGE.good.first && exam >= JUDGE.good.exam && (retain ?? 0) >= JUDGE.good.retain && weak <= JUDGE.good.weakMax) v = 'good';
    else if (cover >= JUDGE.near.cover && first >= JUDGE.near.first && exam >= JUDGE.near.exam) v = 'near';
    else v = 'far';
    if (v === 'unknown' && cover > 0) v = 'far';
    return { id: f.id, name: f.name, cover, first, firstN: fa.firstN, exam, examN: ex.n, retain, weak, verdict: v };
  });
  const order = ['far', 'unknown', 'near', 'good'];
  let overall = fields.reduce((m, x) => (order.indexOf(x.verdict) < order.indexOf(m) ? x.verdict : m), 'good');
  if (fields.every((x) => x.verdict === 'unknown')) overall = 'unknown';
  const allRead = UNITS.every((u) => s.units[u.id]?.lessonDone);
  const allPassed = UNITS.every((u) => ['basic', 'mastered'].includes(A.units[u.id].status));
  return { fields, overall, exams: exams.length, allRead, allPassed, mastered: A.counts.mastered, units: UNITS.length, statusLabel: STATUS };
}
