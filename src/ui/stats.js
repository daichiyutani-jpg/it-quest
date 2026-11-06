// 学習記録：正答率（分野別・単元別・形式別、初見と復習を区別）、学習時間、間違えた理由
import { UNITS, FIELDS } from '../data/syllabus.js';
import { STATUS, accuracyBy, wrongReasons, mistakeTrends, CONFIDENCE } from '../core/mastery.js';
import { judge, VERDICT, JUDGE } from '../core/judge.js';
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
  const byConf = accuracyBy(s, DB, 'conf');
  const byAfter = accuracyBy(s, DB, 'after');
  const trends = mistakeTrends(s, DB);
  const J = judge(s, A);
  const TAG = { mix: '似た用語と混同しやすい問題', calc: '計算・手順の問題', read: '読み違えやすい問題', law: '法律の要件の問題', order: '順序・手順の問題', number: '数値を覚える問題' };
  const AFTER = { figure: '図解を見た後', example: '具体例を読んだ後', beginner: 'やさしい説明を読んだ後', terms: '用語の意味を見た後' };
  const tests = Object.entries(s.tests || {}).flatMap(([u, l]) => l.map((t) => ({ ...t, unit: u }))).sort((a, b) => (a.at < b.at ? 1 : -1));
  const p100 = (x) => (x == null ? '—' : pct(x));
  const days = [...Array(14)].map((_, i) => addDays(today(), i - 13));
  const maxSec = Math.max(600, ...days.map((d) => s.days[d]?.sec || 0));
  view.innerHTML = `
  <section class="card"><h2>合格の目安</h2>
    <p class="small">教材：${J.allRead ? '<b>全単元の説明を読み終えました</b>' : '説明を読み終えていない単元があります'}／${J.allPassed ? '<b>全単元の小テストに合格</b>' : `小テスト合格（基礎理解済み以上）${UNITS.length - A.counts.new - A.counts.learning - A.counts.review}/${UNITS.length}単元`}。<span class="muted">一通り終えたことと、合格できる実力があることは別に判定します。</span></p>
    <p>総合：<b class="${VERDICT[J.overall].cls}">${VERDICT[J.overall].label}</b></p>
    <table class="acc small"><tr><th>分野</th><th>判定</th><th>範囲</th><th>初見</th><th>本番形式</th><th>定着</th></tr>
    ${J.fields.map((f) => `<tr><th>${esc(f.name)}</th><td class="${VERDICT[f.verdict].cls}">${VERDICT[f.verdict].label}</td><td>${pct(f.cover)}</td><td>${p100(f.first)}<small>（${f.firstN}）</small></td><td>${p100(f.exam)}<small>（${f.examN}）</small></td><td>${p100(f.retain)}${f.weak ? `<small>・要復習${f.weak}</small>` : ''}</td></tr>`).join('')}
    </table>
    <p class="tiny muted">目安であり、合格を保証するものではありません。本試験は総合600点以上かつ各分野300点以上（各1,000点満点・IRT方式）で、評価点は正答率と一致しないため、ここでは正答率70%以上などを「届いている」の目安にしています。範囲＝重要度で重みを付けた小テスト合格の割合、初見＝初めて解いた問題の正答率（${JUDGE.minFirstN}問以上で判定）、本番形式＝直近2回の模擬試験・公式の過去問（本番形式）の分野別正答率、定着＝合格した単元のうち時間を空けて再確認できた割合。模擬試験は30日計画の31日目以降に行います。</p>
  </section>
  <section class="card"><h2>小テストの記録</h2>
    ${tests.length ? `<ul class="small">${tests.slice(0, 20).map((t) => `<li>${t.d}　${esc(UNITS.find((u) => u.id === t.unit)?.name || t.unit)}　${t.correct}/${t.total}　${t.passed ? '合格' : '不合格'}</li>`).join('')}</ul>` : '<p class="small">まだありません。単元の説明を読んだら、小テスト（10問・90%で合格）を受けましょう。</p>'}
  </section>
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
  <section class="card"><h2>自信と正答率</h2>
    <table class="acc">${head}${Object.entries(CONFIDENCE).map(([k, l]) => accRow(l, byConf[k])).join('')}</table>
    <p class="small">自信ありで間違えた：${trends.sureWrong}回（思い込みに注意）／勘で正解：${trends.guessRight}回（復習で優先して出します）</p>
  </section>
  <section class="card"><h2>説明の形式と理解度</h2>
    ${Object.keys(AFTER).some((k) => byAfter[k]) ? `<table class="acc">${head}${Object.entries(AFTER).map(([k, l]) => accRow(l, byAfter[k])).join('')}</table><p class="tiny muted">間違えたときに別の説明を見た後、同じ単元の問題に答えた結果です。正答率が高い形式が、あなたに合った説明の目安です。</p>` : '<p class="small">間違えたときに「別の説明で確かめる」を使うと、どの説明の後に正解できたかをここに集計します。</p>'}
  </section>
  <section class="card"><h2>間違いの傾向</h2>
    ${Object.keys(trends.tags).length ? `<ul class="small">${Object.entries(trends.tags).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<li>${esc(TAG[k] || k)}：${n}回</li>`).join('')}</ul>` : '<p class="small">まだ集計できるほどの間違いはありません。</p>'}
  </section>
  <section class="card"><h2>間違えた理由</h2>
    ${Object.keys(reasons).length ? `<ul>${Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<li>${esc(REASON_LABEL[k] || k)}：${n}回</li>`).join('')}</ul>` : '<p class="small">問題に間違えたときに理由を選ぶと、ここに集計されます。</p>'}
  </section>
  <section class="card"><h2>模擬試験の記録</h2>
    ${s.mocks.length ? `<ul>${s.mocks.slice().reverse().map((m) => `<li>${m.at.slice(0, 10)}　${m.correct}/${m.total}問（${pct(m.correct / m.total)}）${FIELDS.map((f) => m.byField[f.id]?.[1] ? ` ${f.name.slice(0, 3)} ${pct(m.byField[f.id][0] / m.byField[f.id][1])}` : '').join('')}</li>`).join('')}</ul>` : '<p class="small">まだありません。</p>'}
  </section>
  <section class="card col gap"><a class="btn ghost wide" href="#/plan">学習計画と変更履歴</a><a class="btn ghost wide" href="#/settings">設定</a><a class="btn ghost wide" href="#/data">データ（保存の状態・準備状況・収録状況）</a></section>`;
}
