// 学習記録：正答率（分野別・単元別・形式別、初見と復習を区別）、学習時間、間違えた理由
import { UNITS, FIELDS } from '../data/syllabus.js';
import { STATUS, accuracyBy, wrongReasons } from '../core/mastery.js';
import { FORMAT_LABEL, TYPE_LABEL } from '../data/content/index.js';
import { today, addDays, fmtMin, pct } from '../core/util.js';
import { esc } from './dom.js';
import { REASON_LABEL } from './quiz.js';

function accRow(label, o) {
  if (!o) return `<tr><th>${esc(label)}</th><td colspan="3" class="muted">—</td></tr>`;
  const f = (c, n) => (n ? `${pct(c / n)}<small>（${n}）</small>` : '—');
  return `<tr><th>${esc(label)}</th><td>${f(o.c, o.n)}</td><td>${f(o.fc, o.fn)}</td><td>${f(o.rc, o.rn)}</td></tr>`;
}
const head = '<tr><th></th><th>全体</th><th>初見</th><th>復習</th></tr>';

export function renderStats(view, app) {
  app.refresh();
  const { s, A, DB } = app;
  const byField = accuracyBy(s, DB, 'field');
  const byUnit = accuracyBy(s, DB, 'unit');
  const byFormat = accuracyBy(s, DB, 'format');
  const byType = accuracyBy(s, DB, 'type');
  const reasons = wrongReasons(s);
  const days = [...Array(14)].map((_, i) => addDays(today(), i - 13));
  const maxSec = Math.max(600, ...days.map((d) => s.days[d]?.sec || 0));
  view.innerHTML = `
  <section class="card"><h2>学習時間（直近14日）</h2>
    <div class="chart">${days.map((d) => { const sec = s.days[d]?.sec || 0; return `<div class="col-bar" title="${d} ${fmtMin(sec)}"><i style="height:${Math.round(sec / maxSec * 100)}%"></i><small>${Number(d.slice(8))}</small></div>`; }).join('')}</div>
    <p class="small">累計 ${fmtMin(A.totalSec)}／学習した日 ${Object.values(s.days).filter((d) => d.sec >= 60 || d.answers).length}日／最長連続 ${s.game.bestStreak}日</p>
    <p class="tiny muted">学習時間は、学習画面を開いて操作している時間だけを数えます（2分以上操作がないと止まります）。</p>
  </section>
  <section class="card"><h2>正答率（初見と復習を分けて集計）</h2>
    <table class="acc">${head}${FIELDS.map((f) => accRow(f.name, byField[f.id])).join('')}</table>
    <h3>問題形式別</h3><table class="acc">${head}${Object.entries(FORMAT_LABEL).map(([k, l]) => accRow(l, byFormat[k])).join('')}</table>
    <h3>問題の区分別</h3><table class="acc">${head}${Object.entries(TYPE_LABEL).map(([k, l]) => accRow(l, byType[k])).join('')}</table>
    <p class="tiny muted">同じ問題を繰り返すと正答率は上がりやすいため、「初見」の正答率で実力を判断してください。</p>
  </section>
  <section class="card"><h2>単元別</h2>
    <details><summary>全${UNITS.length}単元を表示</summary>
    <table class="acc small"><tr><th>単元</th><th>状態</th><th>全体</th><th>初見</th></tr>
    ${UNITS.map((u) => { const o = byUnit[u.id]; return `<tr><th><a href="#/unit/${u.id}">${esc(u.name)}</a></th><td><span class="pill ${STATUS[A.units[u.id].status].cls}">${STATUS[A.units[u.id].status].label}</span></td><td>${o ? pct(o.c / o.n) : '—'}</td><td>${o?.fn ? pct(o.fc / o.fn) : '—'}</td></tr>`; }).join('')}
    </table></details>
  </section>
  <section class="card"><h2>間違えた理由</h2>
    ${Object.keys(reasons).length ? `<ul>${Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<li>${esc(REASON_LABEL[k] || k)}：${n}回</li>`).join('')}</ul>` : '<p class="small">問題に間違えたときに理由を選ぶと、ここに集計されます。</p>'}
  </section>
  <section class="card"><h2>模擬試験の記録</h2>
    ${s.mocks.length ? `<ul>${s.mocks.slice().reverse().map((m) => `<li>${m.at.slice(0, 10)}　${m.correct}/${m.total}問（${pct(m.correct / m.total)}）${FIELDS.map((f) => m.byField[f.id]?.[1] ? ` ${f.name.slice(0, 3)} ${pct(m.byField[f.id][0] / m.byField[f.id][1])}` : '').join('')}</li>`).join('')}</ul>` : '<p class="small">まだありません。</p>'}
  </section>
  <section class="card col gap"><a class="btn ghost wide" href="#/plan">学習計画と変更履歴</a><a class="btn ghost wide" href="#/settings">設定</a><a class="btn ghost wide" href="#/data">データ（バックアップ・収録状況）</a></section>`;
}
