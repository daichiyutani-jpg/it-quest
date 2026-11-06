// 学習開始前の品質確認（学習アプリ共通ルール §16）。
// 教材データから自動で判定できるものはここで数え、人が実施する確認（オフライン動作など）は
// src/data/readiness-manual.js の記録（実施日・方法・結果）を見る。記録が無いものは「未実施」。
// すべて満たすまで「準備完了」と表示せず、30日間の学習計画の開始日を設定できない。
import { UNITS } from '../data/syllabus.js';
import { TEST } from './mastery.js';
import MANUAL from '../data/readiness-manual.js';

export const MIN_Q_PER_UNIT = TEST.size * 2; // 小テストを別の問題で2回組める数

/** manual：人が行う確認の記録（省略時は src/data/readiness-manual.js）。テストでは差し替えて使う */
export function readiness(DB, manual = MANUAL) {
  const checks = [];
  const add = (id, label, ok, detail) => checks.push({ id, label, ok: !!ok, detail });

  const allItems = UNITS.flatMap((u) => u.items.map((i) => i.id));
  const covered = new Set(Object.values(DB.questions).map((q) => q.item));
  const unc = allItems.filter((i) => !covered.has(i));
  const noLesson = UNITS.filter((u) => !DB.lessons[u.id]).map((u) => u.id);
  add('coverage', '対象範囲の網羅（シラバスの全項目に照合済みの問題がある）', unc.length === 0 && noLesson.length === 0,
    `項目 ${allItems.length - unc.length}/${allItems.length}${unc.length ? `（不足：${unc.slice(0, 8).join('、')}${unc.length > 8 ? ' ほか' : ''}）` : ''}`);

  const few = UNITS.filter((u) => (DB.byUnit[u.id] || []).length < MIN_Q_PER_UNIT);
  add('lessons', '教材の完成（全単元の説明と、小テスト2回分の問題）', noLesson.length === 0 && few.length === 0,
    `説明 ${UNITS.length - noLesson.length}/${UNITS.length}単元・問題${MIN_Q_PER_UNIT}問以上 ${UNITS.length - few.length}/${UNITS.length}単元${few.length ? `（不足：${few.slice(0, 6).map((u) => `${u.id} ${(DB.byUnit[u.id] || []).length}問`).join('、')}${few.length > 6 ? ' ほか' : ''}）` : ''}`);

  const all = Object.values(DB.allQuestions);
  const pending = all.filter((q) => q.status === 'needs_review').length;
  const susp = all.filter((q) => q.status === 'suspended').length;
  const ver = all.filter((q) => q.status === 'verified').length;
  add('answers', '問題と正解の整合性・解説の正確性（作成とは別の担当が出典と照合）', ver > 0 && pending === 0,
    `照合済み ${ver}問・未照合 ${pending}問・利用停止 ${susp}問（停止した問題は出題しません）${DB.verify.expert ? '' : '。AIで照合、専門家の監修なし'}`);

  const noFig = UNITS.filter((u) => !(DB.figures[u.id] || []).length);
  const figPending = Object.values(DB.allFigures).flat().filter((f) => f.status === 'needs_review').length;
  add('figures', '図解・アニメーションの正確性（照合済みの図が全単元にある）', noFig.length === 0 && figPending === 0,
    `図のある単元 ${UNITS.length - noFig.length}/${UNITS.length}・未照合の図 ${figPending}個`);

  for (const m of manual.checks) add(m.id, m.label, m.result === 'ok', m.date ? `${m.date}：${m.method}。${m.note || ''}` : '未実施');

  return { ready: checks.every((c) => c.ok), checks, recordedAt: manual.recordedAt };
}
