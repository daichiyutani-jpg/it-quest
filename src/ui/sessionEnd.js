// 学習セッションの振り返りと、次回の計画
import { sessionPlan, PACE } from '../core/planner.js';
import { fmtMin, pct } from '../core/util.js';
import { esc } from './dom.js';
import { pico } from './art.js';
import { rankOf, levelInfo } from '../core/game.js';

export function renderSessionEnd(view, app) {
  app.refresh();
  const { s, A, P } = app;
  const ses = app.lastSession || s.sessions[s.sessions.length - 1];
  const next = sessionPlan(s, app.DB, A, P, s.settings.sessionMin);
  const rank = rankOf(levelInfo(s.game.xp).lv);
  const short = ses && ses.sec < 15 * 60;
  view.innerHTML = `
  <section class="card hero"><div class="hero-row">${pico(rank.stage, 'wow', 80)}<div class="hero-txt">
    <h2>おつかれさま！</h2>
    ${ses ? `<p>今回の学習：<b>${fmtMin(ses.sec)}</b>・問題 <b>${ses.answers}問</b>${ses.answers ? `（正答率${pct(ses.correct / ses.answers)}）` : ''}・読み終えた単元 <b>${ses.lessons}</b></p>` : ''}
    ${short ? '<p class="small">短い時間でも、問題を解いたり用語を確かめたりした分はしっかり記録されています。</p>' : ''}
  </div></div></section>
  <section class="card pace ${PACE[P.status].cls}"><div class="row between"><h2>計画を更新しました</h2><span class="badge ${PACE[P.status].cls}">${P.statusLabel}</span></div>
    <ul class="msgs">${P.messages.slice(0, 3).map((m) => `<li>${esc(m)}</li>`).join('')}</ul></section>
  <section class="card"><h2>次回のおすすめ（${s.settings.sessionMin}分の場合）</h2>
    <ol>${next.blocks.map((b) => `<li>${esc(b.title)}（${b.min}分）</li>`).join('')}</ol>
    <p class="small muted">次回は、ホームで「今日、実際に勉強できる時間」を選ぶと内容が組み直されます。</p>
    <a class="btn primary wide" href="#/home">ホームへ</a></section>`;
}
