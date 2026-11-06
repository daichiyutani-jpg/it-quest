// 初回設定と設定変更
import { UNITS, FIELDS, SYLLABUS_INFO } from '../data/syllabus.js';
import { DEFAULT_SOFT_GOAL } from '../data/calendar.js';
import { sessionPlan, planSummary, PLAN30 } from '../core/planner.js';
import { readiness } from '../core/readiness.js';
import { today, addDays, fmtDate } from '../core/util.js';
import { esc, timeChips, bindChips, choiceChips, bindChoice, toast, confirmDialog } from './dom.js';
import { pico } from './art.js';
import { startQuiz } from './actions.js';
import { pickDiagnostic } from '../core/picker.js';

const LEVELS = [['1', 'ほぼ初めて'], ['2', '少し分かる'], ['3', '仕事で使っている'], ['4', 'かなり詳しい']];
const EXPS = [['none', '初めて学ぶ'], ['some', '少し勉強した'], ['retake', '受験したことがある']];
const DAYS = [1, 2, 3, 4, 5, 6, 7].map((d) => [String(d), `${d}日`]);

function planStartField(st, ready) {
  return `
    <label class="q">30日間の学習計画の開始日</label>
    ${ready ? `<input type="date" id="planStart" value="${st.planStart || ''}" min="${addDays(today(), -29)}">
    <p class="tiny muted">1日${PLAN30.dailyMin}分・30日（目安${PLAN30.totalMin / 60}時間）で全範囲を一通り学習する計画です。模擬試験は31日目から始めます。空にすると計画なしで自由に学習できます。</p>`
    : `<input type="date" id="planStart" disabled>
    <p class="tiny warn">教材の照合・動作確認（学習開始前の品質確認）が終わっていないため、まだ設定できません。<a href="#/data">準備状況を見る</a></p>`}`;
}

function form(st, { isSetup, ready }) {
  return `
  <div class="form">
    ${planStartField(st, ready)}
    <label class="q">① 受験予定日</label>
    <div class="row gap wrap">
      <input type="date" id="exam" value="${st.examDate || ''}" min="${today()}" ${st.examDate ? '' : 'disabled'}>
      <label class="check"><input type="checkbox" id="examUndecided" ${st.examDate ? '' : 'checked'}> まだ決めていない</label>
    </div>
    <p class="tiny muted">未定でも使えます。30日計画と模擬試験の期間（31日目以降）を取れるよう、開始日から31日以上あとがおすすめです。</p>

    <p class="tiny muted">学習時間は1日${PLAN30.dailyMin}分が基本です。実際に学習できた時間に合わせて、計画は自動で見直されます。</p>
    <label class="q">② 平日に勉強できる時間（1日）</label>${timeChips('weekday', st.weekdayMin, { allowZero: true })}
    <label class="q">③ 土日祝日に勉強できる時間（1日）</label>${timeChips('weekend', st.weekendMin, { allowZero: true })}
    <label class="q">④ 今日、実際に勉強できる時間</label>${timeChips('todayMin', st.todayMin?.date === today() ? st.todayMin.min : st.weekdayMin, { allowZero: true })}
    <label class="q">⑤ IT知識の自己評価</label>${choiceChips('level', LEVELS, st.selfLevel)}
    <label class="q">⑥ ITパスポートの学習経験</label>${choiceChips('exp', EXPS, st.experience)}
    <label class="q">⑦ 1回の学習で希望する時間</label>${timeChips('session', st.sessionMin)}
    <label class="q">⑧ 1週間に勉強できる日数</label>${choiceChips('days', DAYS, st.daysPerWeek)}
    ${isSetup ? '' : `
    <label class="q">一通り学習の目安日（受験日が未設定のとき）</label>
    <input type="date" id="soft" value="${st.softGoalDate || DEFAULT_SOFT_GOAL}">
    <p class="tiny muted">締切ではなく目安です。学習状況に応じて計画は前後します。</p>
    <label class="q">直前対策を始める日数（受験日の何日前から）</label>
    ${choiceChips('final', [[5, '5日前'], [7, '7日前'], [10, '10日前'], [14, '14日前']], st.finalDays)}`}
  </div>`;
}

function bindForm(root, st) {
  const ex = root.querySelector('#exam'); const und = root.querySelector('#examUndecided');
  und.addEventListener('change', () => { ex.disabled = und.checked; if (!und.checked && !ex.value) ex.value = addDays(today(), 60); });
  bindChips(root, 'weekday', (v) => { st.weekdayMin = v; });
  bindChips(root, 'weekend', (v) => { st.weekendMin = v; });
  bindChips(root, 'todayMin', (v) => { st.todayMin = { date: today(), min: v }; });
  bindChips(root, 'session', (v) => { st.sessionMin = Math.max(5, v); });
  bindChoice(root, 'level', (v) => { st.selfLevel = Number(v); });
  bindChoice(root, 'exp', (v) => { st.experience = v; });
  bindChoice(root, 'days', (v) => { st.daysPerWeek = Number(v); });
  bindChoice(root, 'final', (v) => { st.finalDays = Number(v); });
  return () => {
    st.examDate = und.checked ? null : (ex.value || null);
    const ps = root.querySelector('#planStart');
    if (ps && !ps.disabled) st.planStart = ps.value || null;
    const soft = root.querySelector('#soft');
    if (soft && soft.value) st.softGoalDate = soft.value;
    return st;
  };
}

export function renderSetup(view, app) {
  const st = { ...app.s.settings };
  if (!st.todayMin || st.todayMin.date !== today()) st.todayMin = { date: today(), min: st.weekdayMin };
  const ready = readiness(app.DB).ready;
  view.innerHTML = `
  <section class="card hero-setup">
    ${pico(0, 'wow', 88)}
    <h1>IT QUEST へようこそ</h1>
    <p>ITパスポート試験の合格をめざす学習ゲームです。最初に、学習計画をつくるための情報を教えてください（あとから変更できます）。</p>
  </section>
  <section class="card">${form(st, { isSetup: true, ready })}
    <button class="btn primary wide" id="save">この内容で計画をつくる</button>
    <p class="tiny muted">学習データはこの端末の中だけに保存されます。ユーザー登録はありません。</p>
  </section>
`;
  const read = bindForm(view, st);
  view.querySelector('#save').addEventListener('click', () => {
    read();
    if (st.weekdayMin === 0 && st.weekendMin === 0) { toast('平日か土日祝日のどちらかに、学習できる時間を入れてください。'); return; }
    Object.assign(app.s.settings, st, { setupDone: true });
    app.store.touch('settings');
    app.replan('初期設定');
    renderStart(view, app);
  });
}

/** 初期設定のあと：現在地と最初に取り組む内容 */
function renderStart(view, app) {
  const { s, A, P } = app;
  const plan = sessionPlan(s, app.DB, A, P, s.settings.todayMin?.min || s.settings.sessionMin);
  const nm = (id) => UNITS.find((u) => u.id === id)?.name;
  view.innerHTML = `
  <section class="card">
    <h2>あなたの現在地</h2>
    <p>試験範囲は <b>3分野・${UNITS.length}単元</b>（公式シラバス ${SYLLABUS_INFO.version}）です。いまは全単元が「未学習」です。</p>
    <ul class="small">
      ${FIELDS.map((f) => `<li>${f.area}（${f.name}）：${UNITS.filter((u) => u.field === f.id).length}単元</li>`).join('')}
    </ul>
    <p>一通り学習するのに必要な時間の見積り：<b>約${Math.round(P.remainingMin / 60)}時間</b>（復習を除く）</p>
    ${P.target ? `<p>${esc(P.targetLabel)}：<b>${fmtDate(P.target)}</b>。今の設定のペースだと <b>${P.projected ? fmtDate(P.projected) : '—'}</b> ごろに一通り終わる見込みです（実績に合わせて毎回見直します）。</p>` : ''}
    <ul class="msgs">${P.messages.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
  </section>
  <section class="card">
    <h2>最初に取り組む内容</h2>
    <ol>${plan.blocks.map((b) => `<li>${esc(b.title)}（${b.min}分）</li>`).join('')}</ol>
    <p class="small">最初の単元：<b>${esc(nm(P.nextNew[0]) || '')}</b></p>
    <button class="btn primary wide" data-go="#/home">ホームへ（ここから始める）</button>
    <button class="btn ghost wide" id="diag">基礎の確認（10問・約12分・とばせます）</button>
    <p class="tiny muted">3分野から基礎の問題を出します。結果で、始める分野と難しさのおすすめを出します。</p>
  </section>`;
  view.querySelector('#diag').addEventListener('click', () => {
    const ids = pickDiagnostic(app.DB);
    startQuiz(app, { kind: 'diag', title: '基礎の確認', qids: ids, returnTo: '#/result' });
  });
  void planSummary;
}

export function renderSettings(view, app) {
  const s = app.s;
  const st = JSON.parse(JSON.stringify(s.settings));
  const ready = readiness(app.DB).ready;
  view.innerHTML = `
  <section class="card"><h2>学習計画の設定</h2>${form(st, { isSetup: false, ready })}
    <button class="btn primary wide" id="save">保存して計画を見直す</button></section>
  <section class="card"><h2>表示</h2>
    <label class="q">文字の大きさ</label>${choiceChips('font', [[0.9, '小'], [1, '標準'], [1.12, '大'], [1.25, '特大']], st.fontScale)}
  </section>
  <section class="card"><h2>データ</h2><button class="btn ghost wide" data-go="#/data">保存の状態・準備状況・収録状況</button></section>`;
  const read = bindForm(view, st);
  bindChoice(view, 'font', (v) => { s.settings.fontScale = Number(v); document.documentElement.style.setProperty('--fs', v); app.store.touch('settings'); });
  view.querySelector('#save').addEventListener('click', async () => {
    read();
    const old = s.settings;
    const changes = [];
    if (old.examDate !== st.examDate) changes.push(`受験日 ${old.examDate || '未定'}→${st.examDate || '未定'}`);
    if (old.weekdayMin !== st.weekdayMin || old.weekendMin !== st.weekendMin) changes.push('学習可能時間');
    if (old.daysPerWeek !== st.daysPerWeek) changes.push('週の学習日数');
    if (old.finalDays !== st.finalDays) changes.push('直前対策の開始日数');
    if (old.softGoalDate !== st.softGoalDate) changes.push('目安日');
    if (old.planStart !== st.planStart) changes.push(`30日計画の開始日 ${old.planStart || 'なし'}→${st.planStart || 'なし'}`);
    if (st.examDate && st.examDate < today()) {
      const ok = await confirmDialog({ title: '受験日が過去の日付です', body: '<p>このまま保存しますか？</p>' });
      if (!ok) return;
    }
    Object.assign(s.settings, { ...st, fontScale: s.settings.fontScale });
    app.store.touch('settings');
    app.replan(changes.length ? `設定変更：${changes.join('、')}` : '設定の保存');
    toast('保存しました。計画を見直しました。');
    app.go('#/plan');
  });
}
