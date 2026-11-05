// 問題演習の実行画面と結果画面（模擬試験・制限時間付き演習を含む）
import { UNITS, FIELDS } from '../data/syllabus.js';
import { EXAM } from '../data/calendar.js';
import { TYPE_LABEL, FORMAT_LABEL } from '../data/content/index.js';
import { recordAnswer, setWrongReason } from '../core/mastery.js';
import { XP } from '../core/game.js';
import { pct, now } from '../core/util.js';
import * as audio from '../core/audio.js';
import { esc, rich, richBlock, toast, confirmDialog } from './dom.js';

const KANA = ['ア', 'イ', 'ウ', 'エ'];
const REASONS = [
  ['term', '用語・意味を知らなかった'], ['two', '2択までは絞れた'], ['read', '問題文を読み違えた'],
  ['calc', '計算・手順のミス'], ['guess', 'なんとなく選んだ'], ['mix', '似た用語と混同した'],
];
export const REASON_LABEL = Object.fromEntries(REASONS);

let timer = null;

export function renderQuiz(view, app) {
  clearInterval(timer);
  const Q = app.quiz;
  if (!Q) { app.go('#/practice'); return; }
  const exam = !Q.immediate; // 模擬試験・時間制限演習：最後にまとめて採点
  let shownAt = Date.now();
  let lastTick = Date.now();

  const unitName = (id) => UNITS.find((u) => u.id === id)?.name || '';

  const save = () => app.saveResume({ type: 'quiz', quiz: Q, title: Q.title });

  const timeLeft = () => (Q.limitSec ? Math.max(0, Q.limitSec - Q.elapsed) : null);
  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

  const startTimer = () => {
    lastTick = Date.now();
    timer = setInterval(() => {
      if (!view.querySelector('#clock')) { clearInterval(timer); save(); return; } // 画面を離れた
      if (document.hidden) { lastTick = Date.now(); return; }
      const d = (Date.now() - lastTick) / 1000; lastTick = Date.now();
      Q.elapsed += d;
      const el = view.querySelector('#clock');
      if (el) el.textContent = Q.limitSec ? `残り ${fmt(timeLeft())}` : fmt(Q.elapsed);
      if (Q.limitSec && timeLeft() <= 0) { clearInterval(timer); toast('時間になりました。採点します。'); finish(); }
      if (Math.floor(Q.elapsed) % 10 === 0) save();
    }, 1000);
  };

  function draw() {
    const qid = Q.qids[Q.i];
    const q = app.DB.questions[qid];
    if (!q) { Q.i++; if (Q.i >= Q.qids.length) return finish(); return draw(); }
    const prev = Q.results.find((r) => r.qid === qid);
    const answered = Q.immediate && prev;
    shownAt = Date.now();
    view.innerHTML = `
    <div class="quiz-top">
      <button class="icon-btn" id="quit" aria-label="中断する">✕</button>
      <div class="qprog"><b>${esc(Q.title)}</b><small>${Q.i + 1} / ${Q.qids.length}問</small></div>
      <div id="clock" class="clock">${Q.limitSec ? `残り ${fmt(timeLeft())}` : fmt(Q.elapsed)}</div>
    </div>
    <section class="card question">
      <div class="qmeta"><span class="tag">${esc(TYPE_LABEL[q.type] || q.type)}</span><span class="tag">${esc(FORMAT_LABEL[q.format] || '')}</span><span class="tag">${'●'.repeat(q.level)}${'○'.repeat(3 - q.level)}</span>${exam ? '' : `<span class="tag">${esc(unitName(q.unit))}</span>`}</div>
      ${q.type === 'official' && q.source ? `<div class="tiny muted">出典：${esc(q.source.year)} ${esc(q.source.season || '')} 問${esc(q.source.number)}</div>` : ''}
      <div class="qtext">${richBlock(q.q)}</div>
      <ol class="choices">${q.choices.map((c, k) => {
        let cls = '';
        if (answered) cls = k === q.answer ? 'right' : k === prev.choice ? 'wrong' : 'dim';
        else if (exam && prev && prev.choice === k) cls = 'picked';
        return `<li><button class="choice ${cls}" data-k="${k}" ${answered ? 'disabled' : ''}><span class="kana">${KANA[k]}</span><span>${rich(c)}</span></button></li>`;
      }).join('')}</ol>
      ${answered ? feedback(q, prev) : ''}
    </section>
    ${exam ? `<div class="sticky-actions row gap">
        <button class="btn ghost" id="prevQ" ${Q.i === 0 ? 'disabled' : ''}>‹ 前へ</button>
        <button class="btn ghost" id="mark">${Q.marks.includes(qid) ? '★ 見直し' : '☆ 見直し'}</button>
        ${Q.i < Q.qids.length - 1 ? '<button class="btn primary" id="nextQ">次へ ›</button>' : '<button class="btn primary" id="end">採点する</button>'}
      </div>
      <details class="pad"><summary>問題一覧（${Q.results.length}/${Q.qids.length}問 回答済み）</summary><div class="qgrid">${Q.qids.map((x, k) => `<button class="${Q.results.find((r) => r.qid === x) ? 'a' : ''} ${Q.marks.includes(x) ? 'm' : ''} ${k === Q.i ? 'now' : ''}" data-jump="${k}">${k + 1}</button>`).join('')}</div>
        <button class="btn ghost wide" id="end2">ここで採点する</button></details>`
    : answered ? `<div class="sticky-actions"><button class="btn primary wide" id="nextQ">${Q.i < Q.qids.length - 1 ? '次の問題へ ›' : '結果を見る'}</button></div>` : ''}`;

    view.querySelectorAll('.choice:not([disabled])').forEach((b) => b.addEventListener('click', () => choose(Number(b.dataset.k))));
    view.querySelector('#quit').addEventListener('click', quit);
    view.querySelector('#nextQ')?.addEventListener('click', () => { Q.i++; save(); if (Q.i >= Q.qids.length) finish(); else { draw(); window.scrollTo(0, 0); } });
    view.querySelector('#prevQ')?.addEventListener('click', () => { Q.i--; save(); draw(); });
    view.querySelector('#mark')?.addEventListener('click', () => { Q.marks = Q.marks.includes(qid) ? Q.marks.filter((x) => x !== qid) : [...Q.marks, qid]; save(); draw(); });
    view.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => { Q.i = Number(b.dataset.jump); save(); draw(); window.scrollTo(0, 0); }));
    const endBtn = async () => {
      const left = Q.qids.length - Q.results.length;
      if (left > 0 && !(await confirmDialog({ title: '採点しますか？', body: `<p>未回答が${left}問あります。未回答は不正解として数えます。</p>`, ok: '採点する' }))) return;
      finish();
    };
    view.querySelector('#end')?.addEventListener('click', endBtn);
    view.querySelector('#end2')?.addEventListener('click', endBtn);
    if (answered) bindFeedback(q, prev);
  }

  function choose(k) {
    const qid = Q.qids[Q.i];
    const q = app.DB.questions[qid];
    const ms = Date.now() - shownAt;
    if (exam) {
      const prev = Q.results.find((r) => r.qid === qid);
      if (prev) { prev.choice = k; prev.correct = k === q.answer; prev.ms += ms; } else Q.results.push({ qid, choice: k, correct: k === q.answer, ms });
      audio.se('tap'); save();
      if (Q.i < Q.qids.length - 1) { Q.i++; draw(); window.scrollTo(0, 0); } else draw();
      return;
    }
    const correct = k === q.answer;
    const s = app.s;
    const { first, wasDue } = recordAnswer(s, q, { correct, mode: Q.kind, ms });
    const qs = s.qstate[qid];
    qs.explainReads = (qs.explainReads || 0) + 1;
    const wasWrongBefore = !first && qs.wrong > (correct ? 0 : 1);
    Q.results.push({ qid, choice: k, correct, ms, first });
    app.tracker.countAnswer(correct);
    app.store.touch('answers', 'qstate', 'units', 'days');
    audio.se(correct ? 'correct' : 'wrong');
    let xp = correct ? (first ? XP.firstCorrect : wasWrongBefore ? XP.fixWrong : wasDue ? XP.reviewCorrect : 3) : (first ? XP.firstWrong : XP.reviewWrong);
    app.reward(xp, correct ? '正解' : '挑戦');
    save();
    draw();
  }

  function feedback(q, r) {
    const qs = app.s.qstate[q.id] || {};
    return `<div class="feedback ${r.correct ? 'ok' : 'ng'}">
      <div class="verdict">${r.correct ? '⭕ 正解！' : '❌ 不正解'}　正解は <b>${KANA[q.answer]}</b></div>
      <h4>6. 正解と解説</h4><div>${richBlock(q.explain)}</div>
      <h4>選択肢ごとの理由</h4>
      <ul class="why">${q.why.map((w, k) => `<li class="${k === q.answer ? 'right' : k === r.choice ? 'wrong' : ''}"><b>${KANA[k]}</b> ${rich(w)}</li>`).join('')}</ul>
      ${r.correct ? '' : `<h4>7. 間違えた理由は？</h4><div class="chips" id="reasons">${REASONS.map(([v, l]) => `<button class="chip ${r.reason === v ? 'on' : ''}" data-r="${v}">${l}</button>`).join('')}</div>`}
      <h4>8. 復習登録</h4>
      <label class="check"><input type="checkbox" id="flag" ${qs.flagged ? 'checked' : ''}> この問題を復習リストに入れる ${r.correct ? '（自信がなかったときに）' : '（間違えた問題は自動で登録）'}</label>
      <p class="tiny muted">次にこの問題が復習に出る日：${qs.due || '—'}</p>
    </div>`;
  }

  function bindFeedback(q, r) {
    view.querySelectorAll('#reasons [data-r]').forEach((b) => b.addEventListener('click', () => {
      const first = !r.reason;
      r.reason = b.dataset.r;
      setWrongReason(app.s, q.id, r.reason);
      app.store.touch('answers');
      if (first) app.reward(XP.reason, '間違いの振り返り');
      view.querySelectorAll('#reasons .chip').forEach((c) => c.classList.toggle('on', c === b));
      save();
    }));
    view.querySelector('#flag')?.addEventListener('change', (e) => { app.s.qstate[q.id].flagged = e.target.checked; app.store.touch('qstate'); });
  }

  async function quit() {
    const ok = await confirmDialog({ title: '中断しますか？', body: '<p>ここまでの回答は保存されています。ホームの「続きから再開」で再開できます。</p>', ok: '中断する', cancel: '続ける' });
    if (!ok) return;
    clearInterval(timer);
    save();
    app.replan('演習の中断');
    app.go('#/home');
  }

  function finish() {
    clearInterval(timer);
    const s = app.s;
    if (exam) {
      // まとめて記録（回答した問題だけを理解度に反映。未回答は点数上は不正解）
      for (const r of Q.results) {
        const q = app.DB.questions[r.qid];
        const res = recordAnswer(s, q, { correct: r.correct, mode: Q.kind, ms: r.ms });
        r.first = res.first;
        app.tracker.countAnswer(r.correct);
      }
      const byField = {};
      for (const f of FIELDS) byField[f.id] = [0, 0];
      for (const qid of Q.qids) {
        const q = app.DB.questions[qid]; if (!q) continue;
        byField[q.field][1]++;
        if (Q.results.find((r) => r.qid === qid)?.correct) byField[q.field][0]++;
      }
      const correct = Q.results.filter((r) => r.correct).length;
      if (Q.kind === 'mock') {
        s.mocks.push({ at: now().toISOString(), kind: Q.kind, title: Q.title, total: Q.qids.length, correct, byField, sec: Math.round(Q.elapsed), limitSec: Q.limitSec, unanswered: Q.qids.length - Q.results.length });
        app.store.touch('mocks');
      }
      app.store.touch('answers', 'qstate', 'units', 'days');
      app.reward(XP.mock + correct, Q.kind === 'mock' ? '模擬試験' : '時間配分の練習');
    }
    Q.done = true;
    app.lastQuiz = Q;
    app.clearResume();
    app.replan(`${Q.title}の終了`);
    audio.se('finish');
    app.go(Q.returnTo && Q.returnTo !== '#/result' && Q.immediate ? Q.returnTo + (Q.returnTo.includes('?') ? '&' : '?') + 'r=' + Q.id : '#/result');
    if (Q.immediate && Q.returnTo !== '#/result') setTimeout(() => toast(`${Q.results.filter((r) => r.correct).length}/${Q.results.length}問 正解`), 200);
  }

  if (Q.done) { app.go('#/result'); return; }
  draw();
  startTimer();
}

// ---------- 結果 ----------
export function renderResult(view, app) {
  const Q = app.lastQuiz;
  if (!Q) { app.go('#/practice'); return; }
  const { DB } = app;
  const total = Q.qids.length;
  const correct = Q.results.filter((r) => r.correct).length;
  const exam = !Q.immediate;
  const byField = {}; const byChu = {};
  for (const qid of Q.qids) {
    const q = DB.questions[qid]; if (!q) continue;
    const r = Q.results.find((x) => x.qid === qid);
    const u = UNITS.find((x) => x.id === q.unit);
    (byField[q.field] ||= [0, 0])[1]++;
    (byChu[u.chuName] ||= [0, 0, u.field])[1]++;
    if (r?.correct) { byField[q.field][0]++; byChu[u.chuName][0]++; }
  }
  const avgSec = Q.results.length ? Q.results.reduce((a, r) => a + r.ms, 0) / Q.results.length / 1000 : 0;
  const unanswered = total - Q.results.length;
  const sugg = [];
  if (exam) {
    for (const f of FIELDS) {
      const x = byField[f.id]; if (!x || !x[1]) continue;
      if (x[0] / x[1] < 0.5) sugg.push(`${f.name}の正答率が${pct(x[0] / x[1])}です。次は「${f.name}」の分野別演習と、苦手単元の補強をおすすめします。`);
    }
    const weakChu = Object.entries(byChu).filter(([, v]) => v[1] >= 2 && v[0] / v[1] < 0.5).map(([k]) => k);
    if (weakChu.length) sugg.push(`特に弱い分野：${weakChu.slice(0, 5).join('、')}。単元の説明を読み直してから解き直しましょう。`);
    const pace = EXAM.minutes * 60 / EXAM.questions;
    if (unanswered > 0 && Q.limitSec && Q.elapsed >= Q.limitSec - 1) sugg.push(`時間内に${unanswered}問が未回答でした。「時間配分の練習」で1問あたり約${Math.round(pace)}秒のペースに慣れましょう。`);
    else if (unanswered > 0) sugg.push(`未回答が${unanswered}問ありました（途中で採点）。次は最後まで解いて、時間配分も確かめましょう。`);
    else if (avgSec > pace * 1.1) sugg.push(`1問あたり平均${Math.round(avgSec)}秒でした（本番は約${Math.round(pace)}秒）。迷う問題は見直しマークを付けて先に進みましょう。`);
    if (Q.results.some((r) => !r.correct)) sugg.push('間違えた問題は自動で復習リストに入りました。「間違えた問題」から解き直せます。');
    if (!sugg.length) sugg.push('よくできています。日を空けてもう一度解き、定着を確認しましょう。');
  }
  const short = Q.shortage && Object.keys(Q.shortage).length;
  view.innerHTML = `
  <section class="card">
    <h2>${esc(Q.title)}　結果</h2>
    <div class="big">${correct} / ${total}問　<small>${pct(total ? correct / total : 0)}</small></div>
    ${short ? `<p class="warn">問題データが足りないため、予定より少ない問題数で出題しました（不足：${Object.entries(Q.shortage).map(([f, n]) => `${FIELDS.find((x) => x.id === f).name}${n}問`).join('、')}）。</p>` : ''}
    ${exam ? `<p class="small">所要時間 ${Math.floor(Q.elapsed / 60)}分${Math.round(Q.elapsed % 60)}秒${Q.limitSec ? `（制限${Q.limitSec / 60}分）` : ''}／未回答 ${unanswered}問</p>
      ${FIELDS.map((f) => byField[f.id] ? `<div class="field-row"><span>${f.name}</span><span class="num">${byField[f.id][0]}/${byField[f.id][1]}（${pct(byField[f.id][0] / byField[f.id][1])}）</span></div>` : '').join('')}
      <p class="tiny muted">参考：本試験は総合評価点600点以上かつ各分野300点以上（各1000点満点）で合格です。評価点はIRT方式で算出されるため、この正答率とは一致しません。合格可能性の％は表示しません。</p>
      <h3>次に取り組むこと</h3><ul class="msgs">${sugg.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  </section>
  <section class="card"><h3>問題ごとの結果</h3>
    ${Q.qids.map((qid, k) => {
      const q = DB.questions[qid]; if (!q) return '';
      const r = Q.results.find((x) => x.qid === qid);
      return `<details class="res ${r?.correct ? 'ok' : 'ng'}"><summary>${r ? (r.correct ? '⭕' : '❌') : '—'} 問${k + 1}　${esc(UNITS.find((u) => u.id === q.unit).name)}</summary>
        <div class="qtext">${richBlock(q.q)}</div>
        <ol class="choices static">${q.choices.map((c, i) => `<li class="${i === q.answer ? 'right' : r && i === r.choice ? 'wrong' : ''}"><span class="kana">${KANA[i]}</span> ${rich(c)}</li>`).join('')}</ol>
        <div class="feedback"><b>解説</b>${richBlock(q.explain)}<ul class="why">${q.why.map((w, i) => `<li><b>${KANA[i]}</b> ${rich(w)}</li>`).join('')}</ul></div></details>`;
    }).join('')}
  </section>
  <div class="pad col gap"><a class="btn primary wide" href="#/home">ホームへ（次の計画を見る）</a><a class="btn ghost wide" href="#/practice">演習メニューへ</a></div>`;
  view.querySelectorAll('details.res').forEach((d) => d.addEventListener('toggle', () => {
    if (!d.open) return;
    const k = [...view.querySelectorAll('details.res')].indexOf(d);
    const qs = app.s.qstate[Q.qids[k]]; if (qs) { qs.explainReads = (qs.explainReads || 0) + 1; app.store.touch('qstate'); }
  }));
}
