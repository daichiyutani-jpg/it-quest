// 演習メニューと重要用語カード
import { UNITS, FIELDS } from '../data/syllabus.js';
import { EXAM } from '../data/calendar.js';
import { pickTerms } from '../core/picker.js';
import { XP } from '../core/game.js';
import { unitRec } from '../core/mastery.js';
import { esc, rich, choiceChips, bindChoice } from './dom.js';
import { startQuiz } from './actions.js';

let sel = { field: 'S', unit: null, count: 10 };

export function renderPractice(view, app) {
  app.refresh();
  const { A, P, DB } = app;
  const total = Object.keys(DB.questions).length;
  const nField = (f) => Object.values(DB.questions).filter((q) => q.field === f).length;
  const unitOpts = UNITS.filter((u) => u.field === sel.field && (DB.byUnit[u.id] || []).length);
  if (!sel.unit || !unitOpts.find((u) => u.id === sel.unit)) sel.unit = unitOpts[0]?.id || null;
  view.innerHTML = `
  <section class="card"><h2>問題演習</h2>
    <p class="small muted">収録問題 ${total}問（オリジナル問題）</p>
    <a class="btn primary wide" href="#/past">📜 公式の過去問（IPA公開問題）を解く</a>
    ${P.mode === 'final' ? '<p class="final-flag">🗼 直前対策期間：模擬試験と苦手の復習がおすすめです</p>' : ''}
    <div class="menu">
      <button class="mi" data-k="review"><b>🔁 復習問題</b><small>予定日が来た問題 ${A.dueAll.length}問</small></button>
      <button class="mi" data-k="wrong"><b>❌ 間違えた問題</b><small>未解決 ${A.wrongAll.length}問</small></button>
      <button class="mi" data-k="flagged"><b>📌 復習リスト</b><small>登録 ${A.flagged.length}問</small></button>
      <button class="mi" data-k="weakUnits"><b>🎯 苦手分野の問題</b><small>要復習の単元 ${A.weakUnits.length}個</small></button>
      <button class="mi" data-k="random"><b>🎲 ランダム問題</b><small>全範囲から10問</small></button>
      <button class="mi" data-k="randomStudied"><b>🎲 学習済みからランダム</b><small>学習済み単元から10問</small></button>
      <button class="mi" data-k="timed"><b>⏱️ 制限時間付き演習</b><small>10問・12分（本番ペース）</small></button>
      <button class="mi" data-k="terms"><b>📖 重要用語カード</b><small>短時間で用語を確認</small></button>
    </div>
  </section>
  <section class="card"><h2>分野別・単元別</h2>
    ${choiceChips('field', FIELDS.map((f) => [f.id, `${f.name}（${nField(f.id)}）`]), sel.field)}
    <label class="q">問題数</label>${choiceChips('count', [[5, '5問'], [10, '10問'], [20, '20問'], [30, '30問']], sel.count)}
    <button class="btn primary wide" id="field">分野別問題を始める</button>
    <label class="q" for="unitSel">単元</label>
    <select id="unitSel">${unitOpts.map((u) => `<option value="${u.id}" ${u.id === sel.unit ? 'selected' : ''}>${esc(u.name)}（${DB.byUnit[u.id].length}問）</option>`).join('')}</select>
    <button class="btn ghost wide" id="unit">単元別問題を始める</button>
  </section>
  <section class="card"><h2>🗼 総合模擬試験</h2>
    <p class="small">本試験は${EXAM.questions}問・${EXAM.minutes}分（ストラテジ系35問程度・マネジメント系20問程度・テクノロジ系45問程度）。同じ比率で出題します。</p>
    <div class="col gap">
      <button class="btn primary wide" data-mock="100">本番形式（100問・120分）</button>
      <button class="btn ghost wide" data-mock="50">ハーフ（50問・60分）</button>
      <button class="btn ghost wide" data-mock="20">ミニ（20問・24分）</button>
    </div>
    <p class="tiny muted">模擬試験の問題は、このアプリ用に作ったオリジナル問題から選びます（模擬試験専用の問題は未作成）。</p>
  </section>`;
  bindChoice(view, 'field', (v) => { sel.field = v; renderPractice(view, app); });
  bindChoice(view, 'count', (v) => { sel.count = Number(v); });
  view.querySelector('#unitSel')?.addEventListener('change', (e) => { sel.unit = e.target.value; });
  view.querySelector('#field').addEventListener('click', () => startQuiz(app, { kind: 'field', title: `分野別：${FIELDS.find((f) => f.id === sel.field).name}`, field: sel.field, count: sel.count }));
  view.querySelector('#unit').addEventListener('click', () => sel.unit && startQuiz(app, { kind: 'unit', title: `単元別：${UNITS.find((u) => u.id === sel.unit).name}`, unit: sel.unit }));
  view.querySelectorAll('[data-mock]').forEach((b) => b.addEventListener('click', () => {
    const n = Number(b.dataset.mock);
    startQuiz(app, { kind: 'mock', title: `総合模擬試験（${n}問）`, count: n, limitMin: Math.round(n * EXAM.minutes / EXAM.questions) });
  }));
  view.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k;
    if (k === 'terms') return app.go('#/terms');
    const T = { review: '復習問題', wrong: '間違えた問題', flagged: '復習リスト', weakUnits: '苦手分野の問題', random: 'ランダム問題', randomStudied: '学習済みからランダム', timed: '制限時間付き演習' };
    if (k === 'randomStudied') return startQuiz(app, { kind: 'random', studiedOnly: true, title: T[k], count: 10 });
    if (k === 'timed') return startQuiz(app, { kind: 'timed', title: T[k], count: 10, limitMin: 12 });
    startQuiz(app, { kind: k, title: T[k], count: k === 'random' ? 10 : 20, includeWrong: k === 'review' });
  }));
}

/** 重要用語カード：用語を見て意味を思い出し、めくって確かめる */
export function renderTerms(view, app) {
  app.refresh();
  const cards = pickTerms(app.s, app.DB, app.A, 8);
  let i = 0; let flipped = false; let known = 0;
  const draw = () => {
    if (i >= cards.length) {
      app.clearResume();
      app.reward(Math.min(8, cards.length) * XP.term, '重要用語の確認');
      app.replan('重要用語カードの終了');
      view.innerHTML = `<section class="card"><h2>📖 重要用語カード 完了</h2><p>${cards.length}語中 <b>${known}語</b> を「覚えていた」と答えました。</p>
        <p class="small muted">覚えていなかった用語は、単元の説明でもう一度確認しましょう。</p>
        <div class="col gap"><button class="btn primary wide" id="again">もう一度</button><a class="btn ghost wide" href="#/home">ホームへ</a></div></section>`;
      view.querySelector('#again').addEventListener('click', () => renderTerms(view, app));
      return;
    }
    const c = cards[i];
    const u = UNITS.find((x) => x.id === c.unit);
    view.innerHTML = `
    <section class="card"><div class="row between"><h2>📖 重要用語</h2><span class="small">${i + 1}/${cards.length}</span></div>
      <button class="flash ${flipped ? 'back' : ''}" id="card">
        <span class="tiny muted">${esc(u.name)}</span>
        <span class="term">${esc(c.term)}</span>
        ${flipped ? `<span class="desc">${rich(c.desc)}</span>` : '<span class="small muted">意味を思い出してからタップ</span>'}
      </button>
      ${flipped ? '<div class="row gap"><button class="btn ghost" id="no">あやしい</button><button class="btn primary" id="yes">覚えていた</button></div>' : ''}
    </section>`;
    view.querySelector('#card').addEventListener('click', () => { flipped = !flipped; draw(); });
    view.querySelector('#yes')?.addEventListener('click', () => { known++; next(); });
    view.querySelector('#no')?.addEventListener('click', () => next());
  };
  const next = () => {
    const u = unitRec(app.s, cards[i].unit); u.termsViews = (u.termsViews || 0) + 1; app.store.touch('units');
    i++; flipped = false; draw();
  };
  if (!cards.length) { view.innerHTML = '<section class="card"><p>用語データがまだありません。</p><a class="btn" href="#/home">ホームへ</a></section>'; return; }
  draw();
}
