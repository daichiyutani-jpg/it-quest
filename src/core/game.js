// ゲーム要素（勉強を続けるための補助）。経験値は学習時間だけでなく、理解・復習への取り組みを評価する。
// 注意：レベルは「努力の記録」で、試験範囲の理解度ではない。画面にも明記する。
import { UNITS, FIELDS } from '../data/syllabus.js';
import { today, addDays } from './util.js';

export const XP = {
  firstCorrect: 5, firstWrong: 1, reviewCorrect: 8, fixWrong: 8, reviewWrong: 2,
  lesson: 20, reason: 1, term: 1, dayGoal: 15, mock: 30, remedialDone: 10,
};

export function levelInfo(xp) {
  let lv = 1; let need = 60; let rest = xp;
  while (rest >= need) { rest -= need; lv++; need = 60 + 20 * (lv - 1); }
  return { lv, cur: rest, need };
}

export const RANKS = [
  { min: 1, name: '見習い', stage: 0 },
  { min: 5, name: '旅の学徒', stage: 1 },
  { min: 10, name: '冒険者', stage: 2 },
  { min: 20, name: '熟練の冒険者', stage: 3 },
  { min: 35, name: '賢者', stage: 4 },
];
export function rankOf(lv) { return RANKS.filter((r) => lv >= r.min).pop(); }

export function addXP(s, amount, why) {
  if (!amount) return null;
  const before = levelInfo(s.game.xp).lv;
  s.game.xp += amount;
  s.game.log.push({ at: today(), xp: amount, why });
  if (s.game.log.length > 200) s.game.log.splice(0, s.game.log.length - 200);
  const after = levelInfo(s.game.xp).lv;
  return after > before ? after : null;
}

/** 意味のある学習をした日か（短時間でも、問題を解く・単元を読み終えるなどをしたら達成） */
export function meaningfulDay(d) { return !!d && (d.sec >= 300 || d.answers >= 5 || d.lessons >= 1 || (d.reviews || 0) >= 3); }

/** 連続学習記録の更新。今日はじめて達成したら true */
export function updateStreak(s) {
  const t = today();
  const g = s.game;
  if (!meaningfulDay(s.days[t]) || g.lastStreakDate === t) return false;
  g.streak = g.lastStreakDate === addDays(t, -1) ? g.streak + 1 : 1;
  g.bestStreak = Math.max(g.bestStreak, g.streak);
  g.lastStreakDate = t;
  return true;
}
export function currentStreak(s) {
  const g = s.game; const t = today();
  return g.lastStreakDate === t || g.lastStreakDate === addDays(t, -1) ? g.streak : 0;
}

export const TITLES = [
  { id: 'first_step', name: 'はじめの一歩', desc: '最初の単元を読み終えた', test: (s) => Object.values(s.units).some((u) => u.lessonDone) },
  { id: 'q50', name: '問題の旅人', desc: '問題に50回答えた', test: (s) => s.answers.length >= 50 },
  { id: 'q300', name: '百戦錬磨', desc: '問題に300回答えた', test: (s) => s.answers.length >= 300 },
  { id: 'streak3', name: '三日坊主卒業', desc: '3日連続で学習した', test: (s) => s.game.bestStreak >= 3 },
  { id: 'streak7', name: '七日の誓い', desc: '7日連続で学習した', test: (s) => s.game.bestStreak >= 7 },
  { id: 'streak21', name: '習慣の守り手', desc: '21日連続で学習した', test: (s) => s.game.bestStreak >= 21 },
  { id: 'reviewer', name: '復習の達人', desc: '復習問題に30回答えた', test: (s) => s.answers.filter((a) => !a.first).length >= 30 },
  { id: 'comeback', name: 'リベンジ成功', desc: '間違えた問題を10問解き直して正解した', test: (s) => countFixes(s) >= 10 },
  { id: 'reflect', name: 'ふりかえり上手', desc: '間違えた理由を10回記録した', test: (s) => s.answers.filter((a) => a.reason).length >= 10 },
  { id: 'short', name: 'すきま時間の勇者', desc: '15分未満の日でも意味のある学習を5日した', test: (s) => Object.values(s.days).filter((d) => d.sec < 900 && meaningfulDay(d)).length >= 5 },
  { id: 'all_seen', name: '全土踏破', desc: '全63単元に一度は取り組んだ', test: (s) => UNITS.every((u) => s.units[u.id]) },
  { id: 'mock1', name: '試験塔の挑戦者', desc: '模擬試験を1回受けた', test: (s) => s.mocks.length >= 1 },
  { id: 'mock_full', name: '塔の頂へ', desc: '100問の総合模擬試験を最後まで受けた', test: (s) => s.mocks.some((m) => m.total >= 100) },
];
function countFixes(s) {
  const lastWrong = new Set(); let n = 0;
  for (const a of s.answers) { if (!a.correct) lastWrong.add(a.qid); else if (lastWrong.has(a.qid)) { n++; lastWrong.delete(a.qid); } }
  return n;
}

/** 分析結果が必要な称号（大陸の踏破など） */
export function fieldTitles(A) {
  return FIELDS.map((f) => ({
    id: 'land_' + f.id, name: `${f.area}の守護者`, desc: `${f.name}の全単元を基礎理解済み以上にした`,
    ok: UNITS.filter((u) => u.field === f.id).every((u) => ['basic', 'mastered'].includes(A.units[u.id].status)),
  }));
}

/** 新しく得た称号を返す */
export function checkTitles(s, A) {
  const got = [];
  for (const t of TITLES) if (!s.game.titles.includes(t.id) && t.test(s)) { s.game.titles.push(t.id); got.push(t); }
  for (const t of fieldTitles(A)) if (t.ok && !s.game.titles.includes(t.id)) { s.game.titles.push(t.id); got.push(t); }
  return got;
}
export function titleName(id) {
  const t = TITLES.find((x) => x.id === id);
  if (t) return t.name;
  const f = FIELDS.find((x) => 'land_' + x.id === id);
  return f ? `${f.area}の守護者` : id;
}

/** 冒険マップ：大陸ごとの町（=中分類）の状態 */
export function worldMap(A) {
  return FIELDS.map((f) => {
    const us = UNITS.filter((u) => u.field === f.id);
    const chus = [...new Map(us.map((u) => [u.chu, u.chuName])).entries()];
    const towns = chus.map(([chu, name]) => {
      const tu = us.filter((u) => u.chu === chu);
      const sts = tu.map((u) => A.units[u.id].status);
      const cleared = sts.every((x) => x === 'basic' || x === 'mastered');
      const visited = sts.some((x) => x !== 'new');
      return { chu, name, units: tu.map((u) => u.id), state: cleared ? 'cleared' : visited ? 'visited' : 'fog', mastered: sts.filter((x) => x === 'mastered').length };
    });
    return { ...f, towns, progress: A.fields[f.id].progress };
  });
}

/** 合格への試験塔：各分野の学習がある程度進むか、直前対策期間に入ると開く */
export function towerState(s, A, P) {
  const open = P.mode === 'final' || FIELDS.every((f) => A.fields[f.id].progress >= 0.35);
  const best = s.mocks.reduce((m, x) => Math.max(m, x.total ? x.correct / x.total : 0), 0);
  const floor = !s.mocks.length ? 0 : best >= 0.8 ? 4 : best >= 0.7 ? 3 : best >= 0.6 ? 2 : 1;
  return { open, floor, best, tries: s.mocks.length };
}
