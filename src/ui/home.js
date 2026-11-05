// ホーム：今の状況が一目で分かり、今日やることをすぐ始められる画面
import { UNITS, FIELDS } from '../data/syllabus.js';
import { STATUS } from '../core/mastery.js';
import { PACE, sessionPlan, fieldName } from '../core/planner.js';
import { levelInfo, rankOf, currentStreak } from '../core/game.js';
import { today, fmtDate, fmtMin, pct } from '../core/util.js';
import { bar, esc, timeChips, bindChips } from './dom.js';
import { pico } from './art.js';
import { startBlock, BLOCK_ICON } from './actions.js';

export function renderHome(view, app) {
  app.refresh();
  const { s, A, P } = app;
  const lv = levelInfo(s.game.xp);
  const rank = rankOf(lv.lv);
  const streak = currentStreak(s);
  const t = today();
  const todayDone = Math.round((s.days[t]?.sec || 0) / 60);
  const minutes = s.settings.todayMin?.date === t ? s.settings.todayMin.min : P.today.total;
  // 今日すでに学習した分を引いた残り時間で組む（使い切っていたら、もう1回分として組む）
  const planMin = minutes - todayDone >= 10 ? minutes - todayDone : minutes;
  const plan = sessionPlan(s, app.DB, A, P, Math.max(10, planMin));
  const nm = (id) => UNITS.find((u) => u.id === id)?.name || '';
  const ses = app.tracker.current();
  const resume = s.resume;
  const weakFields = FIELDS.filter((f) => A.fields[f.id].recentN >= 5 && A.fields[f.id].recentAcc < 0.65);
  const nextUnit = P.stuck[0] || P.inProgress[0] || P.nextNew[0];

  view.innerHTML = `
  <section class="hero card">
    <div class="hero-row">
      ${pico(rank.stage, A.weakUnits.length > 6 ? 'sad' : 'happy', 76)}
      <div class="hero-txt">
        <div class="small muted">冒険者ランク：${rank.name}</div>
        <div class="lv">Lv.${lv.lv} <span class="small">（努力の記録）</span></div>
        ${bar(lv.cur / lv.need, 'var(--gold)', '次のレベルまで')}
        <div class="small">🔥 連続学習 ${streak}日　⏱️ 今日 ${todayDone}分</div>
      </div>
    </div>
  </section>

  ${resume ? `<section class="card resume"><b>⏸ 中断した学習があります</b><p class="small">${esc(resume.title || resume.quiz?.title || '')}</p>
    <div class="row gap"><button class="btn primary" id="resume">続きから再開</button><button class="btn ghost" id="dropResume">破棄</button></div></section>` : ''}

  <section class="card pace ${PACE[P.status].cls}">
    <div class="row between"><h2>学習ペース</h2><span class="badge ${PACE[P.status].cls}">${P.statusLabel}</span></div>
    ${P.mode === 'final' ? '<p class="final-flag">🗼 直前対策モード</p>' : ''}
    <ul class="msgs">${P.messages.slice(0, 3).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
    <button class="btn ghost small" data-go="#/plan">計画の詳細・後回しの単元を見る ›</button>
  </section>

  <section class="card">
    <h2>今日の学習</h2>
    <p class="small muted">今日、実際に勉強できる時間を選ぶと、内容を組み直します。</p>
    ${timeChips('today', minutes)}
    ${plan.blocks.length ? `<ol class="blocks">${plan.blocks.map((b, i) => `
      <li><button class="block" data-block="${i}">
        <span class="bi">${BLOCK_ICON[b.kind] || '•'}</span>
        <span class="bt"><b>${esc(b.title)}</b><small>${b.min}分　${esc(b.reason || '')}</small></span>
        <span class="go">›</span></button></li>`).join('')}</ol>`
    : '<p>教材データが見つかりません。「データ」画面で収録状況を確認してください。</p>'}
    ${ses && ses.sec + ses.answers > 0 ? '<button class="btn wide" id="endSession">今日の学習を終える（振り返りと次回の計画）</button>' : ''}
  </section>

  <section class="card">
    <h2>全体の進捗</h2>
    <div class="big">${pct(A.progress)}</div>
    ${bar(A.progress, 'var(--accent)', '全体の進捗')}
    <p class="tiny muted">進捗は各単元の段階（未学習0・学習中25・要復習40・基礎理解70・習得確認100）を重要度で重み付けした値です。教材を開いた回数では増えません。</p>
    ${FIELDS.map((f) => `<div class="field-row"><span>${f.name}</span>${bar(A.fields[f.id].progress, f.color, f.name)}<span class="num">${pct(A.fields[f.id].progress)}</span></div>`).join('')}
    <div class="stat-grid">
      <div><b>${A.studiedUnits}</b><small>学習済み単元</small></div>
      <div><b>${A.counts.mastered}</b><small>習得確認済み</small></div>
      <div><b>${A.counts.new}</b><small>未学習</small></div>
      <div><b>${A.counts.review}</b><small>要復習</small></div>
      <div><b>${fmtMin(A.totalSec)}</b><small>累計学習時間</small></div>
      <div><b>${A.recentAcc == null ? '—' : pct(A.recentAcc)}</b><small>直近の正答率</small></div>
    </div>
    <p class="small">初見の正答率 <b>${A.firstAcc == null ? '—' : pct(A.firstAcc)}</b>（${A.firstN}問）／復習の正答率 <b>${A.repeatAcc == null ? '—' : pct(A.repeatAcc)}</b>（${A.repeatN}問）</p>
    <p class="small">苦手分野：<b>${weakFields.length ? weakFields.map((f) => f.name).join('、') : (A.recentN < 5 ? 'まだ判定できません（問題を5問以上解くと判定）' : 'なし')}</b></p>
    <p class="small">次に学習する内容：<b>${nextUnit ? esc(nm(nextUnit)) : '復習と模擬試験'}</b></p>
    <p class="small">学習ペース：${P.actual.actualDaily == null ? `実績が3日分たまると、実績に合わせて調整します（設定：平日${s.settings.weekdayMin}分／休日${s.settings.weekendMin}分）` : `直近${P.actual.span}日の平均 <b>${Math.round(P.actual.actualDaily)}分/日</b>（設定上の見込み ${Math.round(P.actual.plannedDaily)}分/日）`}</p>
    ${P.exam ? `<p class="small">受験日まで：<b>あと${P.daysToExam}日</b>（${fmtDate(P.exam)}）</p>` : '<p class="small">受験日：未設定（<a href="#/settings">設定する</a>）</p>'}
    <p class="small">復習が必要な問題：<b>${A.dueAll.length}問</b>　未解決の間違い：<b>${A.wrongAll.length}問</b></p>
  </section>

  <section class="card">
    <h2>単元の状態</h2>
    <div class="legend">${Object.entries(STATUS).map(([k, v]) => `<span class="pill ${v.cls}">${v.label} ${A.counts[k]}</span>`).join('')}</div>
    <button class="btn ghost small" data-go="#/learn">試験範囲マップを開く ›</button>
  </section>`;

  bindChips(view, 'today', (v) => {
    s.settings.todayMin = { date: today(), min: v };
    app.store.touch('settings');
    app.replan(`今日の学習時間を${v}分に変更`);
    renderHome(view, app);
  });
  view.querySelectorAll('[data-block]').forEach((b) => b.addEventListener('click', () => startBlock(app, plan.blocks[Number(b.dataset.block)], Number(b.dataset.block))));
  view.querySelector('#endSession')?.addEventListener('click', () => {
    app.tracker.close('user');
    app.go('#/end');
  });
  view.querySelector('#resume')?.addEventListener('click', () => {
    const r = s.resume;
    if (r.type === 'quiz') { app.quiz = r.quiz; app.go('#/quiz'); } else if (r.type === 'unit') app.go(r.hash);
  });
  view.querySelector('#dropResume')?.addEventListener('click', () => { app.clearResume(); renderHome(view, app); });
  void fieldName;
}
