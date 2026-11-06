// 試験範囲マップと単元の学習画面
// 学習の順序：1 学習テーマの説明 → 図解 → 2 重要用語 → 3 具体例 → 4 初学者向けの補足 → 5 練習問題（3問・その場で解説）→ 小テスト（10問・90%で合格）
import { UNITS, FIELDS, SYLLABUS_INFO } from '../data/syllabus.js';
import { STATUS, markLessonPage, unitStats, TEST } from '../core/mastery.js';
import { PREREQ } from '../data/prereq.js';
import { figureHTML, bindFigures } from './figure.js';
import { XP } from '../core/game.js';
import { pct } from '../core/util.js';
import { esc, rich, richBlock, bar, choiceChips, bindChoice } from './dom.js';
import { startQuiz } from './actions.js';
import { AREA_ICON } from './art.js';

let mapFilter = 'all';

export function renderMap(view, app) {
  app.refresh();
  const { A, P, DB } = app;
  const deferred = new Set(P.deferred);
  const show = (id) => mapFilter === 'all' || A.units[id].status === mapFilter;
  view.innerHTML = `
  <section class="card"><h2>試験範囲マップ</h2>
    <p class="small muted">公式シラバス ${SYLLABUS_INFO.version}（${SYLLABUS_INFO.published}掲載、${SYLLABUS_INFO.checkedAt}確認）の${UNITS.length}単元。どの単元からでも学習できます。</p>
    ${choiceChips('filter', [['all', 'すべて'], ...Object.entries(STATUS).map(([k, v]) => [k, `${v.label} ${A.counts[k]}`])], mapFilter)}
  </section>
  ${FIELDS.map((f) => {
    const us = UNITS.filter((u) => u.field === f.id);
    const groups = [...new Map(us.map((u) => [u.chu, u])).values()];
    return `<section class="card"><h2 style="color:${f.color}">${AREA_ICON[f.id]} ${f.area}<small>（${f.name}）</small></h2>
      ${bar(A.fields[f.id].progress, f.color, f.name)}
      ${groups.map((g) => {
        const list = us.filter((u) => u.chu === g.chu && show(u.id));
        if (!list.length) return '';
        return `<h3 class="chu">${esc(g.daiName)} ／ ${esc(g.chuName)}</h3><ul class="units">${list.map((u) => {
          const st = A.units[u.id];
          const nq = (DB.byUnit[u.id] || []).length;
          return `<li><a class="unit" href="#/unit/${u.id}">
            <span class="pill ${STATUS[st.status].cls}">${STATUS[st.status].label}</span>
            <span class="un"><b>${esc(u.name)}</b><small>${'★'.repeat(u.weight)}${'☆'.repeat(3 - u.weight)}${u.pastFreq != null ? `　過去4年${u.pastFreq}問` : ''}　問題${nq}問${st.recentAcc != null ? `　直近${pct(st.recentAcc)}` : ''}${!DB.lessons[u.id] ? '　<em>教材未作成</em>' : ''}${deferred.has(u.id) ? '　<em>後回し候補</em>' : ''}</small></span></a></li>`;
        }).join('')}</ul>`;
      }).join('')}</section>`;
  }).join('')}
  <p class="tiny muted pad">★は本アプリ独自の重要度（計画の優先順位に使用。IPAの公表値ではありません）。</p>`;
  bindChoice(view, 'filter', (v) => { mapFilter = v; renderMap(view, app); });
}

export function renderUnit(view, app, r) {
  const id = r.args[0];
  const u = UNITS.find((x) => x.id === id);
  if (!u) { view.innerHTML = '<section class="card"><p>単元が見つかりません。</p><a class="btn" href="#/learn">戻る</a></section>'; return; }
  const L = app.DB.lessons[id];
  const q = r.query;
  if (q.step === 'done' || (!L && q.mode !== 'remedial')) return renderUnitSummary(view, app, u, q);
  if (q.mode === 'remedial') return renderRemedial(view, app, u, L, q);

  const steps = [
    ...L.pages.map((p, i) => ({ kind: 'page', label: `1. 学習テーマ（${i + 1}/${L.pages.length}）`, html: `<h3>${esc(p.title)}</h3>${richBlock(p.body)}` })),
    ...((app.DB.figures[id] || []).length ? [{ kind: 'figure', label: '図解で確かめる', html: app.DB.figures[id].map((f, k) => figureHTML(f, k)).join('') }] : []),
    { kind: 'terms', label: '2. 重要用語', html: `<dl class="terms">${L.terms.map((t) => `<dt>${esc(t.term)}${t.read ? `<small>${esc(t.read)}</small>` : ''}</dt><dd>${rich(t.desc)}</dd>`).join('')}</dl>` },
    { kind: 'example', label: '3. 具体例', html: `<div class="example">💡 ${richBlock(L.example)}</div>` },
    { kind: 'beginner', label: '4. 初学者向けの補足', html: `<div class="beginner">🔰 ${richBlock(L.beginner)}</div>${L.points?.length ? `<h3>試験で問われやすい点</h3><ul>${L.points.map((p) => `<li>${rich(p)}</li>`).join('')}</ul>` : ''}` },
  ];
  let i = Math.max(0, Math.min(steps.length - 1, Number(q.i || 0)));
  const total = steps.length;

  const draw = () => {
    const stp = steps[i];
    const last = i === total - 1;
    view.innerHTML = `
    <section class="card lesson">
      <div class="crumb small"><a href="#/learn">マップ</a> › ${esc(u.chuName)}</div>
      <h2>${esc(u.name)}</h2>
      <div class="steps">${steps.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"></i>`).join('')}<i></i></div>
      <div class="step-label">${stp.label}</div>
      <div class="lesson-body">${stp.html}</div>
    </section>
    <div class="sticky-actions row gap">
      <button class="btn ghost" id="prev" ${i === 0 ? 'disabled' : ''}>‹ 戻る</button>
      ${last
    ? (q.pagesOnly ? '<button class="btn primary" id="finishRead">読み終えた（問題は次回）</button>' : '<button class="btn primary" id="toQuiz">5. 練習問題へ（3問）›</button>')
    : '<button class="btn primary" id="next">次へ ›</button>'}
    </div>
    ${last && q.pagesOnly ? '<div class="pad"><button class="btn ghost wide" id="toQuiz">時間があれば練習問題も解く</button></div>' : ''}`;
    bindFigures(view);
    const s = app.s;
    const before = !!s.units[id]?.lessonDone;
    markLessonPage(s, id, i, total);
    if (!before && s.units[id].lessonDone) { app.tracker.countLesson(); app.reward(XP.lesson, `単元「${u.name}」を読み終えた`); }
    app.store.touch('units', 'days');
    app.saveResume({ type: 'unit', hash: `#/unit/${id}?i=${i}${q.pagesOnly ? '&pagesOnly=1' : ''}`, title: `${u.name}（${stp.label}）` });
    view.querySelector('#prev')?.addEventListener('click', () => { i--; draw(); window.scrollTo(0, 0); });
    view.querySelector('#next')?.addEventListener('click', () => { i++; draw(); window.scrollTo(0, 0); });
    view.querySelector('#finishRead')?.addEventListener('click', () => { app.clearResume(); app.replan(`単元「${u.name}」の説明を読了`); app.go(`#/unit/${id}?step=done`); });
    view.querySelector('#toQuiz')?.addEventListener('click', () => {
      app.clearResume();
      startQuiz(app, { kind: 'lessonCheck', title: `練習問題：${u.name}`, unit: id, count: 3, returnTo: `#/unit/${id}?step=done` });
    });
  };
  draw();
}

function renderRemedial(view, app, u, L) {
  const st = unitStats(app.s, app.DB, u.id);
  view.innerHTML = `
  <section class="card lesson">
    <div class="crumb small"><a href="#/learn">マップ</a> › 補強</div>
    <h2>🩹 補強：${esc(u.name)}</h2>
    <p class="small">直近の正答率 ${st.recentAcc == null ? '—' : pct(st.recentAcc)}・未解決の間違い ${st.openWrong.length}問。要点を読み直してから、間違えた問題を中心に解きます。</p>
    ${L ? `<h3>要点</h3><ul>${(L.points || []).map((p) => `<li>${rich(p)}</li>`).join('')}</ul>
    <h3>重要用語</h3><dl class="terms">${L.terms.map((t) => `<dt>${esc(t.term)}</dt><dd>${rich(t.desc)}</dd>`).join('')}</dl>
    ${(app.DB.figures[u.id] || []).map((f, k) => figureHTML(f, k)).join('')}
    <details><summary>具体例・補足をもう一度読む</summary><div class="example">💡 ${richBlock(L.example)}</div><div class="beginner">🔰 ${richBlock(L.beginner)}</div></details>` : '<p>この単元の教材は照合が終わっていないため、まだ表示できません。</p>'}
  </section>
  <div class="sticky-actions row gap"><a class="btn ghost" href="#/unit/${u.id}">最初から読む</a><button class="btn primary" id="go">問題で確認 ›</button></div>`;
  bindFigures(view);
  view.querySelector('#go').addEventListener('click', () => startQuiz(app, { kind: 'remedial', title: `補強：${u.name}`, unit: u.id, count: 5, returnTo: `#/unit/${u.id}?step=done` }));
}

function renderUnitSummary(view, app, u) {
  app.refresh();
  const { A, DB, s } = app;
  const st = A.units[u.id];
  const L = DB.lessons[u.id];
  const qids = DB.byUnit[u.id] || [];
  const itemQ = (itemId) => qids.filter((x) => DB.questions[x].item === itemId).length;
  const idx = UNITS.findIndex((x) => x.id === u.id);
  const next = app.P.stuck.includes(u.id) ? null : (app.P.nextNew.find((x) => x !== u.id) || UNITS[idx + 1]?.id);
  const hints = [];
  if (st.status === 'new') hints.push('まだ学習していません。');
  if (st.status === 'learning') hints.push(st.lessonDone ? `基礎理解まで：小テスト（${TEST.size}問）で${TEST.pass}問以上正解すると合格です。` : 'まず説明を最後まで読みましょう。');
  if (st.status === 'review') hints.push(st.lastTest && !st.lastTest.passed ? '前回の小テストが不合格でした。間違えた所を復習してから、別の問題で再テストしましょう。' : '正答率が低いか、間違えたままの問題があります。補強がおすすめです。');
  if (st.status === 'basic') hints.push(`習得確認には、合格した日（${st.passedAt}）から2日以上空けて、別の問題で確かめることが必要です（再確認 ${st.retest.c}/${st.retest.n}問）。`);
  const pre = (PREREQ[u.id] || []).filter((p) => ['new', 'learning'].includes(A.units[p]?.status));
  if (pre.length && st.status === 'new') hints.push(`先にこちらがおすすめ：${pre.map((p) => UNITS.find((x) => x.id === p).name).join('、')}（順番は自由です）`);
  if (st.status === 'mastered') hints.push('習得確認済みです。復習予定の日に問題が出ます。');
  view.innerHTML = `
  <section class="card">
    <div class="crumb small"><a href="#/learn">マップ</a> › ${esc(u.daiName)} › ${esc(u.chuName)}</div>
    <h2>${esc(u.name)}</h2>
    <span class="pill ${STATUS[st.status].cls}">${STATUS[st.status].label}</span>
    <ul class="small">${hints.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
    <div class="stat-grid">
      <div><b>${st.seenQ}/${st.pool}</b><small>解いた問題</small></div>
      <div><b>${st.recentAcc == null ? '—' : pct(st.recentAcc)}</b><small>直近の正答率</small></div>
      <div><b>${st.firstAcc == null ? '—' : pct(st.firstAcc)}</b><small>初見の正答率</small></div>
      <div><b>${st.repeatAcc == null ? '—' : pct(st.repeatAcc)}</b><small>復習の正答率</small></div>
      <div><b>${st.openWrong.length}</b><small>未解決の間違い</small></div>
      <div><b>${s.units[u.id]?.lessonReads || 0}回</b><small>説明を読んだ</small></div>
      <div><b>${st.tests ? `${st.lastTest.correct}/${st.lastTest.total}` : '—'}</b><small>前回の小テスト（${st.tests}回）</small></div>
      <div><b>${st.unsure.length}</b><small>自信のない正解</small></div>
    </div>
    <div class="col gap">
      ${L ? `<a class="btn ${st.status === 'new' ? 'primary' : 'ghost'} wide" href="#/unit/${u.id}">${st.lessonDone ? '説明をもう一度読む' : '説明を読む'}</a>` : `<p class="warn">この単元の教材（説明）は${app.DB.allLessons[u.id] ? '照合が終わっていないため、まだ表示できません' : '未作成です'}。</p>`}
      ${qids.length >= TEST.size ? `<button class="btn ${st.lessonDone && !st.passed ? 'primary' : 'ghost'} wide" id="test">${st.tests ? '小テスト（別の問題で10問）' : '小テスト（10問・90%で合格）'}</button>` : `<p class="warn">照合済みの問題が${qids.length}問のため、小テスト（${TEST.size}問）はまだできません。</p>`}
      ${qids.length ? `<button class="btn ghost wide" id="quiz">練習：この単元の問題（${qids.length}問・その場で解説）</button>` : ''}
      ${st.status === 'review' || st.openWrong.length ? `<a class="btn ghost wide" href="#/unit/${u.id}?mode=remedial">補強する</a>` : ''}
      ${next ? `<a class="btn ghost wide" href="#/unit/${next}">次の単元へ：${esc(UNITS.find((x) => x.id === next).name)} ›</a>` : ''}
    </div>
  </section>
  <section class="card"><h3>この単元のシラバス項目</h3>
    <ul class="small">${u.items.map((it) => `<li>(${it.no}) ${esc(it.name)}　<span class="muted">問題${itemQ(it.id)}問${itemQ(it.id) ? '' : '（未作成）'}</span></li>`).join('')}</ul>
  </section>`;
  view.querySelector('#test')?.addEventListener('click', () => startQuiz(app, { kind: 'unitTest', title: `小テスト：${u.name}`, unit: u.id, returnTo: '#/result' }));
  view.querySelector('#quiz')?.addEventListener('click', () => startQuiz(app, { kind: 'unit', title: `単元別問題：${u.name}`, unit: u.id, returnTo: `#/unit/${u.id}?step=done` }));
  void FIELDS;
}
