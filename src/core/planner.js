// 学習計画の自動調整（IT QUEST の中核）。
// 最重要ルール：固定のスケジュールに学習者を合わせるのではなく、学習者の実績に合わせて計画を変える。
// - 受験日・目安日は締切ではなく目安。実際に勉強できた時間（直近14日）で使える時間を見積もり直す。
// - 時間が足りなくても未学習範囲を自動で省略しない。重要度・理解度・苦手で順番を付け、後回しにした単元は画面に出す。
// - 理解が不十分な単元が残っている間は、新しい単元より先にその補強を入れる。
import { UNITS, FIELDS } from '../data/syllabus.js';
import { HOLIDAYS } from '../data/calendar.js';
import { today, addDays, diffDays, parseYmd, fmtDate, clamp } from './util.js';
import { STATUS } from './mastery.js';

export const PACE = {
  good: { label: '順調', cls: 'pace-good' },
  adjust: { label: '要調整', cls: 'pace-adjust' },
  focus: { label: '要集中', cls: 'pace-focus' },
};

const LEVEL_FACTOR = { 1: 1.3, 2: 1.1, 3: 0.95, 4: 0.85 };
const REVIEW_RESERVE = 0.2; // 使える時間のうち2割は復習に回す前提
const MIN_DAYS_FOR_ACTUAL = 3; // 実績が3日分たまったら実績で補正を始める

export function isOffDay(d) { const w = parseYmd(d).getDay(); return w === 0 || w === 6 || HOLIDAYS.has(d); }

/** 設定から見たその日の学習可能時間（分）。週の学習日数を確率として掛ける */
export function plannedMinutes(settings, d) {
  const base = isOffDay(d) ? settings.weekendMin : settings.weekdayMin;
  return base * clamp(settings.daysPerWeek / 7, 0, 1);
}

/** その単元を「基礎理解済み」まで進めるのに必要な時間の見積り（分） */
export function unitMinutes(settings, st, status, hasLesson) {
  let m;
  if (status === 'basic' || status === 'mastered') m = 0;
  else if (status === 'review') m = 8;
  else if (status === 'learning') m = st.lessonDone || !hasLesson ? 7 : 14;
  else m = hasLesson ? 18 : 9;
  let f = LEVEL_FACTOR[settings.selfLevel] || 1;
  if (settings.experience === 'retake') f *= 0.9;
  return m * f;
}

/** 直近の実績と設定の比（実績÷計画）。データが少ないうちは1に寄せる */
export function actualFactor(s) {
  const t = today();
  const startDay = (s.meta.createdAt || '').slice(0, 10) || t;
  const span = clamp(diffDays(startDay, t), 0, 14); // 今日を除く経過日数
  const res = { span, actualDaily: null, plannedDaily: null, ratio: 1, trust: 0, eff: 1 };
  if (span < MIN_DAYS_FOR_ACTUAL) return res;
  let act = 0; let plan = 0;
  for (let i = 1; i <= span; i++) {
    const d = addDays(t, -i);
    act += (s.days[d]?.sec || 0) / 60;
    plan += plannedMinutes(s.settings, d);
  }
  res.actualDaily = act / span;
  res.plannedDaily = plan / span;
  res.ratio = plan > 0 ? clamp(act / plan, 0.05, 4) : 1;
  res.trust = clamp(span / 10, 0, 1);
  res.eff = 1 + (res.ratio - 1) * res.trust;
  return res;
}

/** 今日あと何分使えそうか */
export function todayMinutes(s) {
  const t = today();
  const studied = (s.days[t]?.sec || 0) / 60;
  const set = s.settings.todayMin && s.settings.todayMin.date === t ? s.settings.todayMin.min : null;
  const base = set ?? (isOffDay(t) ? s.settings.weekendMin : s.settings.weekdayMin);
  return { total: base, studied, left: Math.max(0, base - studied), fromToday: set != null };
}

/** from〜to（両端含む）の見込み学習時間（分） */
export function capacity(s, from, to, eff) {
  let sum = 0;
  const t = today();
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (d === t) sum += todayMinutes(s).left;
    else sum += plannedMinutes(s.settings, d) * eff;
  }
  return sum;
}

function lastStudyDay(s) {
  const ds = Object.entries(s.days).filter(([, v]) => v.sec >= 60 || v.answers > 0).map(([k]) => k).sort();
  return ds[ds.length - 1] || null;
}

export function buildPlan(s, DB, A) {
  const set = s.settings;
  const t = today();
  const af = actualFactor(s);
  const exam = set.examDate || null;
  const daysToExam = exam ? diffDays(t, exam) : null;
  const finalDays = set.finalDays || 7;
  const finalStart = exam ? addDays(exam, -finalDays) : null;
  let mode = 'normal';
  if (exam && daysToExam < 0) mode = 'afterExam';
  else if (exam && t >= finalStart) mode = 'final';

  // 一通り学習の目標日（受験日があれば直前対策の前日まで、なければ目安日）
  let target; let targetLabel;
  if (exam) {
    target = addDays(finalStart, -1);
    if (target < t) target = exam;
    targetLabel = '受験日から逆算した一通り学習の目安';
  } else {
    target = set.softGoalDate || null;
    targetLabel = '一通り学習の目安日（受験日未設定）';
  }

  // 残りの学習量
  const remaining = [];
  let remainingMin = 0;
  for (const u of UNITS) {
    const st = A.units[u.id];
    const m = unitMinutes(set, st, st.status, !!DB.lessons[u.id]);
    if (m > 0) { remaining.push({ id: u.id, min: m }); remainingMin += m; }
  }

  const cap = target && target >= t ? capacity(s, t, target, af.eff) : 0;
  const usable = cap * (1 - REVIEW_RESERVE);
  const ratio = remainingMin === 0 ? 0 : usable > 0 ? remainingMin / usable : Infinity;

  // 今のペースで一通り終わる見込み日
  let projected = null;
  if (remainingMin === 0) projected = t;
  else {
    let acc = 0;
    for (let i = 0; i < 730; i++) {
      const d = addDays(t, i);
      acc += (d === t ? todayMinutes(s).left : plannedMinutes(set, d) * af.eff) * (1 - REVIEW_RESERVE);
      if (acc >= remainingMin) { projected = d; break; }
    }
  }

  // 優先順位
  const fieldProg = Object.fromEntries(FIELDS.map((f) => [f.id, A.fields[f.id].progress]));
  const share = Object.fromEntries(FIELDS.map((f) => [f.id, f.examShare / 100]));
  const scored = [];
  for (const u of UNITS) {
    const st = A.units[u.id];
    if (st.status === 'basic' || st.status === 'mastered') continue;
    let score = u.weight * (mode === 'final' ? 15 : 10);
    const reasons = [];
    // 説明を読み始めた単元だけを「途中」とみなす（模擬試験などで1問解いただけの単元は順番を変えない）
    if (st.status === 'learning' && st.lessonDone) { score += 25; reasons.push('途中の単元'); }
    else if (st.status === 'learning' && st.pagesSeen > 0) { score += 15; reasons.push('読みかけ'); }
    if (st.status === 'review') { score += 20; reasons.push('理解が不足'); }
    score += (share[u.field] - fieldProg[u.field] * share[u.field]) * 20;
    // 同じ重要度の中では、過去4年の出題数が多い単元を先に（最大+6）
    score += Math.min(6, (u.pastFreq || 0) * 0.25);
    if (u.weight === 3) reasons.push(u.pastFreq ? `よく出る（過去4年で${u.pastFreq}問）` : '重要度が高い');
    score -= u.no * 0.15;
    if (!DB.lessons[u.id] && !(DB.byUnit[u.id] || []).length) { score -= 100; reasons.push('教材未作成'); }
    scored.push({ id: u.id, score, reasons, min: remaining.find((r) => r.id === u.id)?.min || 0 });
  }
  scored.sort((a, b) => b.score - a.score);
  const priority = scored.map((x) => x.id);
  const reasonsOf = Object.fromEntries(scored.map((x) => [x.id, x.reasons]));

  // 時間が足りないときに後回しにする単元（省略はしない）
  const deferred = [];
  if (ratio > 1 && Number.isFinite(usable)) {
    let accMin = 0;
    for (const x of scored) {
      accMin += x.min;
      if (accMin > usable) deferred.push(x.id);
    }
  }

  // 理解が不十分なまま止まっている単元（新しい単元より先に補強する）
  const stuck = UNITS.filter((u) => {
    const st = A.units[u.id];
    return (st.status === 'learning' && st.lessonDone && st.recentN >= 3 && st.recentAcc < 0.7) || (st.status === 'review' && (st.lessonDone || st.pagesSeen > 0));
  }).map((u) => u.id).sort((a, b) => A.units[a].und - A.units[b].und);

  // 説明をまだ読んでいない単元（模擬試験などで間違えた未学習の単元も含む）
  const nextNew = priority.filter((id) => !A.units[id].lessonDone && ['new', 'learning', 'review'].includes(A.units[id].status) && !stuck.includes(id));
  const inProgress = priority.filter((id) => A.units[id].status === 'learning' && A.units[id].lessonDone && !stuck.includes(id));

  // 進み具合の判定
  const last = lastStudyDay(s);
  const gapDays = last ? diffDays(last, t) : null;
  const weakCount = A.weakUnits.length;
  let status = 'good';
  if (mode === 'afterExam') status = 'adjust';
  else if (exam && daysToExam <= 30 && (ratio > 1.25 || (mode === 'final' && (A.counts.new > 10 || weakCount >= 6)))) status = 'focus';
  else if (ratio > 1.0 || weakCount >= 5 || (gapDays != null && gapDays >= 3 && A.studiedUnits > 0)) status = 'adjust';

  // 分野ごとの弱さ
  const fieldsAcc = FIELDS.map((f) => ({ ...f, acc: A.fields[f.id].recentAcc, n: A.fields[f.id].recentN, prog: A.fields[f.id].progress }));
  const weakField = fieldsAcc.filter((f) => f.n >= 5 && f.acc < 0.65).sort((a, b) => a.acc - b.acc)[0] || null;

  // 具体的な対策
  const messages = [];
  const nm = (id) => UNITS.find((u) => u.id === id)?.name;
  if (mode === 'afterExam') messages.push('受験日が過ぎています。次の受験日を設定すると、計画を作り直します（設定 → 学習計画）。');
  if (gapDays != null && gapDays >= 3) messages.push(`最後の学習から${gapDays}日空きました。未学習の範囲と残りの日数から計画を作り直しました。まずは短い復習から再開しましょう。`);
  if (weakField) messages.push(`${weakField.name}の直近の正答率が${Math.round(weakField.acc * 100)}%と低いため、次回は新しい範囲を進める前に15分の復習をおすすめします。`);
  if (stuck.length) messages.push(`「${nm(stuck[0])}」の理解がまだ不十分です。次の単元に進む前に、解説の読み直しと確認問題で補強します。`);
  if (mode === 'final') {
    messages.push(`直前対策の期間です（受験日まであと${daysToExam}日）。模擬試験・苦手問題・間違えた問題の解き直しを中心にします。`);
    const imp = priority.filter((id) => A.units[id].status === 'new' && UNITS.find((u) => u.id === id).weight === 3);
    if (imp.length) messages.push(`未学習の重要単元が${imp.length}個あります（例：${imp.slice(0, 3).map(nm).join('、')}）。切り捨てずに、短い学習を毎回1つずつ入れます。`);
  } else if (remainingMin === 0) {
    messages.push('全単元が基礎理解済み以上です。復習と模擬試験で定着を確認しましょう。');
  } else if (target && target >= t) {
    const studyDaysLeft = Math.max(1, Math.round((diffDays(t, target) + 1) * clamp(set.daysPerWeek / 7, 0.14, 1)));
    const perDay = Math.ceil(remainingMin / (1 - REVIEW_RESERVE) / studyDaysLeft);
    if (ratio <= 0.8) messages.push(`予定より早く進んでいるため、次の単元に進むことができます（目安${fmtDate(target)}より前の${projected ? fmtDate(projected) : '—'}ごろに一通り終わる見込み）。`);
    else if (ratio <= 1) messages.push(`今のペースで、${targetLabel}（${fmtDate(target)}）までに一通り学習できる見込みです。`);
    else {
      messages.push(`今のペースだと一通り終わるのは${projected ? fmtDate(projected) + 'ごろ' : 'かなり先'}で、目安の${fmtDate(target)}より遅れそうです。学習日1日あたり約${perDay}分あると間に合います。`);
      messages.push(`時間を増やせない場合は、残り時間を考慮して出題範囲の重要度が高い未習得の単元を優先します。後回しにした単元（${deferred.length}個）は「計画」画面に一覧で表示します。`);
    }
  } else if (target && target < t) {
    messages.push(`一通り学習の目安日（${fmtDate(target)}）を過ぎました。目安日は締切ではありません。理解度を中心にこのまま進め、必要なら設定で目安日を変えてください。`);
  }
  if (af.span >= MIN_DAYS_FOR_ACTUAL && af.ratio < 0.6) messages.push(`直近${af.span}日の学習時間は1日平均約${Math.round(af.actualDaily)}分で、設定（約${Math.round(af.plannedDaily)}分）より少なめです。実績に合わせて見込みを下げて計算しています。`);
  if (af.span >= MIN_DAYS_FOR_ACTUAL && af.ratio > 1.3) messages.push(`直近${af.span}日は1日平均約${Math.round(af.actualDaily)}分と、設定より多く学習できています。実績に合わせて見込みを上げて計算しています。`);
  if (!exam && mode === 'normal') messages.push('受験日が決まったら設定してください。直前対策（受験日の約7日前から）の開始日を自動で決めます。');

  return {
    mode, status, statusLabel: PACE[status].label, messages,
    exam, daysToExam, finalStart, finalDays, target, targetLabel,
    remainingMin: Math.round(remainingMin), capacityMin: Math.round(cap), usableMin: Math.round(usable), ratio,
    projected, actual: af, gapDays, lastStudy: last,
    priority, reasonsOf, deferred, stuck, nextNew, inProgress, weakField,
    today: todayMinutes(s),
  };
}

// ---------- 1回の学習の中身 ----------
/**
 * 学習時間 minutes に合わせて、今回やることを並べる。
 * 返す block: { kind, title, min, unit?, field?, count?, reason }
 *   kind: terms 重要用語 / wrong 間違えた問題 / review 復習 / remedial 補強 / lesson 新しい単元 /
 *         check 確認テスト / drill 分野別演習 / weak 苦手分野 / mock 模擬試験 / timed 時間配分の練習
 */
export function sessionPlan(s, DB, A, P, minutes) {
  const M = Math.max(5, minutes);
  const blocks = [];
  let left = M;
  const add = (b) => { if (b.min <= left + 2 && b.min > 0) { blocks.push(b); left -= b.min; return true; } return false; };
  const due = A.dueAll.length;
  const wrong = A.wrongAll.length;
  const studied = A.studiedUnits > 0;
  const nm = (id) => UNITS.find((u) => u.id === id)?.name;
  const weakF = P.weakField?.id || weakestField(A);
  const lessonUnits = P.nextNew.filter((id) => DB.lessons[id] || (DB.byUnit[id] || []).length);
  const stuck = P.stuck[0] || null;

  if (P.mode === 'final') {
    // 未学習の重要単元が多いときは、模擬試験を短くして学習の時間を残す（切り捨てない）
    const impNew = lessonUnits.filter((id) => UNITS.find((u) => u.id === id).weight === 3);
    if (M >= 120 && (impNew.length <= 3 || M >= 150)) add({ kind: 'mock', title: '総合模擬試験（100問・120分）', min: 120, count: 100, limitMin: 120, reason: '本番と同じ問題数・時間で実力と時間配分を確認' });
    else if (M >= 75 || (M >= 60 && impNew.length <= 3)) add({ kind: 'mock', title: 'ハーフ模擬試験（50問・60分）', min: 60, count: 50, limitMin: 60, reason: '本番の半分の量で実力を確認' });
    const imp = impNew[0] || lessonUnits[0];
    if (imp && M >= 20) add({ kind: 'lesson', title: `未学習の重要単元：${nm(imp)}`, min: 15, unit: imp, reason: '未学習のまま本番を迎えないように' });
    if (wrong) add({ kind: 'wrong', title: '間違えた問題の解き直し', min: Math.min(15, Math.max(5, Math.ceil(wrong * 1.2))), count: Math.min(15, wrong), reason: `${wrong}問が未解決` });
    if (stuck) add({ kind: 'remedial', title: `補強：${nm(stuck)}`, min: 10, unit: stuck, reason: '理解が不足している単元' });
    if (impNew.length > 1 && left >= 20) add({ kind: 'lesson', title: `未学習の重要単元：${nm(impNew[1])}`, min: 15, unit: impNew[1], reason: '未学習のまま本番を迎えないように' });
    if (M < 60 && left >= 12) add({ kind: 'timed', title: '時間配分の練習（10問・12分）', min: 12, count: 10, limitMin: 12, reason: '1問あたり約1分12秒のペースに慣れる' });
    if (left >= 8) add({ kind: 'weak', title: `苦手分野の集中復習（${fieldName(weakF)}）`, min: Math.min(15, left), field: weakF, count: Math.min(15, Math.max(5, left)), reason: '正答率が低い分野' });
    if (left >= 3) add({ kind: 'terms', title: '重要用語の確認', min: Math.min(5, left), reason: '用語の取りこぼしを防ぐ' });
    return { blocks, left, total: M };
  }

  if (!studied) {
    const first = lessonUnits[0];
    if (!first) return { blocks, left, total: M };
    if (M < 15) add({ kind: 'lesson', title: `はじめの単元：${nm(first)}（説明を読む）`, min: M, unit: first, pagesOnly: true, reason: '短い時間でも、まず説明だけ読んで次回に問題を解く' });
    else {
      add({ kind: 'lesson', title: `はじめの単元：${nm(first)}`, min: 16, unit: first, reason: '最初の単元から学習を始める' });
      for (const id of lessonUnits.slice(1)) {
        if (left >= 16) add({ kind: 'lesson', title: `新しい単元：${nm(id)}`, min: 16, unit: id, reason: '優先度が高い単元' });
        else { if (left >= 8) add({ kind: 'lesson', title: `次の単元：${nm(id)}（説明を読む）`, min: left, unit: id, pagesOnly: true, reason: '残りの時間で説明だけ読んでおく' }); break; }
      }
    }
    return { blocks, left, total: M };
  }

  if (M <= 15) {
    if (wrong) add({ kind: 'wrong', title: '前回の間違いの解き直し', min: 3, count: Math.min(3, wrong), reason: '間違えた問題はすぐ解き直すと定着しやすい' });
    if (due) add({ kind: 'review', title: '復習問題', min: 4, count: Math.min(4, due), reason: `復習の予定日が来た問題が${due}問` });
    add({ kind: 'terms', title: '重要用語の学習', min: 3, reason: '短時間でも効果が高い' });
    if (stuck) add({ kind: 'remedial', title: `苦手の確認：${nm(stuck)}`, min: Math.max(3, left), unit: stuck, count: 3, reason: '理解が不足している単元' });
    else add({ kind: 'check', title: '数問の確認テスト', min: Math.max(3, left), count: Math.max(3, Math.min(5, left)), reason: '学習済みの範囲から出題' });
    if (!wrong && !due && !stuck && lessonUnits[0] && left >= 5) add({ kind: 'lesson', title: `新しい単元：${nm(lessonUnits[0])}（説明を読む）`, min: left, unit: lessonUnits[0], pagesOnly: true, reason: '続きは次回' });
    return { blocks, left, total: M };
  }

  const reviewMin = M <= 40 ? 8 : M <= 75 ? 10 : 15;
  if (due || wrong) add({ kind: 'review', title: '前回の復習（間違えた問題・復習予定の問題）', min: Math.min(reviewMin, Math.max(4, due + wrong)), count: Math.min(reviewMin, due + wrong), includeWrong: true, reason: `復習予定${due}問・未解決${wrong}問` });
  if (weakF && P.weakField && M > 40) add({ kind: 'weak', title: `苦手分野の補強（${fieldName(weakF)}）`, min: M > 75 ? 15 : 10, field: weakF, count: M > 75 ? 15 : 10, reason: '正答率が低い分野' });
  if (stuck) add({ kind: 'remedial', title: `補強：${nm(stuck)}`, min: 12, unit: stuck, reason: '理解が不十分なまま次に進まないため' });
  // 途中の単元 → 新しい単元
  const conts = P.inProgress.slice(0, 2);
  for (const id of conts) { if (left < 8) break; add({ kind: 'remedial', title: `続き：${nm(id)}`, min: 8, unit: id, reason: '途中の単元を基礎理解まで進める' }); }
  const maxNew = stuck && M <= 40 ? 0 : M <= 40 ? 1 : M <= 75 ? 2 : 3;
  let newCount = 0;
  for (const id of lessonUnits) {
    if (newCount >= maxNew || left < 14) break;
    if (add({ kind: 'lesson', title: `新しい単元：${nm(id)}`, min: 16, unit: id, reason: (P.reasonsOf[id] || []).join('・') || '優先度が高い単元' })) newCount++;
  }
  if (M > 75 && left >= 15) add({ kind: 'drill', title: `分野別演習（${fieldName(weakF || 'T')}）`, min: 15, field: weakF || 'T', count: 15, reason: 'まとまった演習で実力を確認' });
  if (M >= 110 && A.studiedUnits >= 15 && left >= 24) add({ kind: 'mock', title: 'ミニ模擬試験（20問・24分）', min: 24, count: 20, limitMin: 24, reason: '模擬試験形式で時間配分に慣れる' });
  if (left >= 4) add({ kind: 'check', title: '学習内容の確認テスト', min: Math.min(10, left), count: Math.min(10, Math.max(3, left)), reason: '今回学んだ範囲の定着を確認' });
  if (left >= 3) add({ kind: 'terms', title: '重要用語の学習', min: Math.min(5, left), reason: '残りの時間で用語を確認' });
  return { blocks, left, total: M };
}

export function weakestField(A) {
  let best = null;
  for (const f of FIELDS) {
    const x = A.fields[f.id];
    const v = x.recentN >= 5 ? x.recentAcc : 1 - x.progress * 0.5;
    if (!best || v < best.v) best = { id: f.id, v };
  }
  return best?.id || 'T';
}
export function fieldName(id) { return FIELDS.find((f) => f.id === id)?.name || ''; }

/** 計画の要約（変更履歴に残す） */
export function planSummary(P) {
  const parts = [`${PACE[P.status].label}`];
  if (P.mode === 'final') parts.push('直前対策');
  if (P.target) parts.push(`目安${P.target}`);
  parts.push(`残り約${P.remainingMin}分`);
  if (P.projected) parts.push(`見込み${P.projected}`);
  if (P.deferred.length) parts.push(`後回し${P.deferred.length}単元`);
  if (P.stuck.length) parts.push(`補強${P.stuck.length}単元`);
  return parts.join(' / ');
}

export { STATUS };
