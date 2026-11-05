// 学習計画の詳細：判定の根拠、優先順位、後回しの単元、変更履歴
import { UNITS } from '../data/syllabus.js';
import { STATUS } from '../core/mastery.js';
import { PACE, sessionPlan } from '../core/planner.js';
import { fmtDate } from '../core/util.js';
import { esc, choiceChips, bindChoice } from './dom.js';

let previewMin = 30;

export function renderPlan(view, app) {
  app.refresh();
  const { s, A, P, DB } = app;
  const nm = (id) => UNITS.find((u) => u.id === id)?.name || id;
  const preview = sessionPlan(s, DB, A, P, previewMin);
  const ratioTxt = !Number.isFinite(P.ratio) ? '—' : `${Math.round(P.ratio * 100)}%`;
  view.innerHTML = `
  <section class="card pace ${PACE[P.status].cls}">
    <div class="row between"><h2>学習計画</h2><span class="badge ${PACE[P.status].cls}">${P.statusLabel}</span></div>
    ${P.mode === 'final' ? `<p class="final-flag">🗼 直前対策モード（${fmtDate(P.finalStart)}から）</p>` : ''}
    <ul class="msgs">${P.messages.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
  </section>
  <section class="card"><h2>計算の根拠</h2>
    <table class="kv">
      <tr><th>受験日</th><td>${P.exam ? `${fmtDate(P.exam)}（あと${P.daysToExam}日）` : '未設定'}</td></tr>
      <tr><th>直前対策の開始</th><td>${P.finalStart ? `${fmtDate(P.finalStart)}（受験日の${P.finalDays}日前・目安）` : '受験日を設定すると決まります'}</td></tr>
      <tr><th>${esc(P.targetLabel)}</th><td>${P.target ? fmtDate(P.target) : '—'}</td></tr>
      <tr><th>残りの学習量（見積り）</th><td>約${P.remainingMin}分（全単元を基礎理解まで。復習は別）</td></tr>
      <tr><th>目安日までに使える時間（見込み）</th><td>約${P.capacityMin}分（うち2割は復習に使う前提）</td></tr>
      <tr><th>必要÷使える時間</th><td>${ratioTxt}（100%を超えると時間不足）</td></tr>
      <tr><th>今のペースで一通り終わる見込み</th><td>${P.projected ? fmtDate(P.projected) : '—'}</td></tr>
      <tr><th>直近の実績</th><td>${P.actual.actualDaily == null ? '実績が3日分たまると反映します' : `1日平均${Math.round(P.actual.actualDaily)}分（設定上の見込み${Math.round(P.actual.plannedDaily)}分）→ 見込みを${Math.round(P.actual.eff * 100)}%に補正`}</td></tr>
      <tr><th>最後に学習した日</th><td>${P.lastStudy ? `${fmtDate(P.lastStudy)}${P.gapDays ? `（${P.gapDays}日前）` : '（今日）'}` : 'まだありません'}</td></tr>
    </table>
    <p class="tiny muted">見積りは、未学習の単元18分・読みかけ14分・問題が残っている単元7分・要復習8分を基準に、IT知識の自己評価と受験経験で補正しています。受験日・目安日は締切ではなく目安です。</p>
    <a class="btn ghost small" href="#/settings">受験日・学習時間を変更する ›</a>
  </section>
  <section class="card"><h2>時間別のおすすめ内容（試算）</h2>
    ${choiceChips('pm', [10, 15, 30, 45, 60, 90, 120].map((m) => [m, `${m}分`]), previewMin)}
    <ol>${preview.blocks.map((b) => `<li>${esc(b.title)}（${b.min}分）<br><small class="muted">${esc(b.reason || '')}</small></li>`).join('')}</ol>
  </section>
  ${P.stuck.length ? `<section class="card"><h2>🩹 次に進む前に補強する単元</h2><ul>${P.stuck.map((id) => `<li><a href="#/unit/${id}?mode=remedial">${esc(nm(id))}</a>（${STATUS[A.units[id].status].label}）</li>`).join('')}</ul></section>` : ''}
  <section class="card"><h2>学習する順番（優先順位）</h2>
    <ol class="small">${P.priority.slice(0, 15).map((id) => `<li><a href="#/unit/${id}">${esc(nm(id))}</a> <span class="muted">${esc((P.reasonsOf[id] || []).join('・'))}</span></li>`).join('')}</ol>
    ${P.priority.length > 15 ? `<details><summary>残り${P.priority.length - 15}単元</summary><ol start="16" class="small">${P.priority.slice(15).map((id) => `<li><a href="#/unit/${id}">${esc(nm(id))}</a></li>`).join('')}</ol></details>` : ''}
    <p class="tiny muted">順番：途中の単元 → 理解が不足した単元 → 重要度・分野の進み具合。いつでもマップから好きな単元を学べます。</p>
  </section>
  <section class="card"><h2>後回しにする単元</h2>
    ${P.deferred.length ? `<p class="small">今のペースでは目安日までに全単元を終えられない見込みのため、次の単元を後回しにしています。<b>省略ではありません</b>。時間ができたら学習し、試験までに一度は目を通しましょう。</p>
      <ul class="small">${P.deferred.map((id) => `<li><a href="#/unit/${id}">${esc(nm(id))}</a></li>`).join('')}</ul>` : '<p class="small">ありません（今のペースで全範囲を学習できる見込みです）。</p>'}
  </section>
  <section class="card"><h2>計画の変更履歴</h2>
    ${s.planHistory.length ? `<ul class="history">${s.planHistory.slice(-20).reverse().map((h) => `<li><small>${new Date(h.at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small><b>${esc(h.reason || '')}</b><span>${esc(h.summary)}</span></li>`).join('')}</ul>` : '<p class="small">まだありません。</p>'}
  </section>`;
  bindChoice(view, 'pm', (v) => { previewMin = Number(v); renderPlan(view, app); });
}
