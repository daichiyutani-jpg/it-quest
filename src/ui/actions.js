// 計画のブロックや演習メニューから、学習を始める
import { pick } from '../core/picker.js';
import { uid } from '../core/util.js';
import { toast } from './dom.js';

const IMMEDIATE = new Set(['unit', 'lessonCheck', 'remedial', 'field', 'drill', 'weak', 'weakUnits', 'wrong', 'flagged', 'review', 'check', 'random', 'diag']);

/**
 * 演習を始める。opts: { kind, title, unit?, field?, count?, limitMin?, includeWrong?, returnTo?, block? }
 * kind が mock/timed のときは、最後にまとめて採点する
 */
export function startQuiz(app, opts) {
  const qids = opts.qids || pick(app.s, app.DB, app.A, opts);
  if (!qids.length) {
    toast(opts.kind === 'review' ? '今は復習が必要な問題はありません。' : opts.kind === 'wrong' ? '間違えた問題はありません。' : 'この条件の問題はまだありません（問題データ未作成）。');
    return false;
  }
  app.quiz = {
    id: uid(), kind: opts.kind, title: opts.title, qids, i: 0, results: [],
    immediate: IMMEDIATE.has(opts.kind), limitSec: opts.limitMin ? opts.limitMin * 60 : null,
    elapsed: 0, unit: opts.unit || null, field: opts.field || null, returnTo: opts.returnTo || '#/result',
    shortage: qids.shortage || null, wanted: opts.count || qids.length, block: opts.block ?? null,
    marks: [], startedAt: new Date().toISOString(),
  };
  app.saveResume({ type: 'quiz', quiz: app.quiz });
  app.go('#/quiz');
  return true;
}

export function startBlock(app, b, idx = null) {
  const block = idx;
  switch (b.kind) {
    case 'lesson':
      app.go(`#/unit/${b.unit}?${b.pagesOnly ? 'pagesOnly=1&' : ''}from=plan`);
      return;
    case 'remedial':
      app.go(`#/unit/${b.unit}?mode=remedial&from=plan`);
      return;
    case 'terms':
      app.go('#/terms');
      return;
    case 'mock':
      startQuiz(app, { kind: 'mock', title: b.title, count: b.count, limitMin: b.limitMin, block });
      return;
    case 'timed':
      startQuiz(app, { kind: 'timed', title: b.title, count: b.count, limitMin: b.limitMin, block });
      return;
    case 'review':
      startQuiz(app, { kind: 'review', title: b.title, count: b.count, includeWrong: b.includeWrong, block });
      return;
    case 'wrong':
      startQuiz(app, { kind: 'wrong', title: b.title, count: b.count, block });
      return;
    case 'weak':
      startQuiz(app, { kind: 'weak', title: b.title, field: b.field, count: b.count, block });
      return;
    case 'drill':
      startQuiz(app, { kind: 'drill', title: b.title, field: b.field, count: b.count, block });
      return;
    case 'check':
    default:
      startQuiz(app, { kind: 'check', title: b.title, count: b.count || 5, block });
  }
}

export const BLOCK_ICON = { terms: '📖', wrong: '🔁', review: '🔁', remedial: '🩹', lesson: '🗺️', check: '✅', drill: '⚔️', weak: '🎯', mock: '🗼', timed: '⏱️' };
