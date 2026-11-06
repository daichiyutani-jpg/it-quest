// IT QUEST 起動処理と画面の切り替え（ハッシュ方式：GitHub Pages のサブパスでも動く）
import { Store } from './core/store.js';
import { loadContent, DB } from './data/content/index.js';
import { analyze } from './core/mastery.js';
import { buildPlan, planSummary } from './core/planner.js';
import { Tracker } from './core/session.js';
import { checkTitles, updateStreak, addXP, XP, levelInfo } from './core/game.js';
import { $, toast } from './ui/dom.js';
import { today } from './core/util.js';

import { renderHome } from './ui/home.js';
import { renderSetup, renderSettings } from './ui/setup.js';
import { renderMap, renderUnit } from './ui/learn.js';
import { renderQuiz, renderResult } from './ui/quiz.js';
import { renderPractice, renderTerms } from './ui/practice.js';
import { renderPlan } from './ui/plan.js';
import { renderStats } from './ui/stats.js';
import { renderAdventure } from './ui/adventure.js';
import { renderData } from './ui/data.js';
import { renderSessionEnd } from './ui/sessionEnd.js';
import { renderPast } from './ui/past.js';

export const app = {
  store: null, DB, tracker: null, A: null, P: null, quiz: null, lastSession: null,
  get s() { return this.store.s; },

  /** 分析と計画を作り直す（データが変わったら呼ぶ） */
  refresh() {
    this.A = analyze(this.s, DB);
    this.P = buildPlan(this.s, DB, this.A);
    return this;
  },

  go(hash) { if (location.hash === hash) route(); else location.hash = hash; },

  /** 経験値を足して、レベルアップ・称号を知らせる */
  reward(amount, why) {
    const s = this.s;
    const up = addXP(s, amount, why);
    if (updateStreak(s)) { addXP(s, XP.dayGoal, '今日の学習達成'); toast(`🔥 今日の学習達成！ +${XP.dayGoal}XP`); }
    this.refresh();
    const titles = checkTitles(s, this.A);
    this.store.touch('game');
    if (up) { toast(`⭐ レベル${up}になりました！（レベルは努力の記録です）`, 3000); }
    for (const t of titles) setTimeout(() => toast(`🏅 称号「${t.name}」を獲得！`, 3000), up ? 3100 : 300);
  },

  /** 計画を作り直して、内容が変わっていたら履歴に残す */
  replan(reason) {
    this.refresh();
    this.store.logPlan({ reason, status: this.P.status, summary: planSummary(this.P), detail: this.P.messages.slice(0, 3) });
  },

  saveResume(obj) { this.s.resume = obj; this.store.touch('resume'); },
  clearResume() { this.s.resume = null; this.store.touch('resume'); },
};

const ROUTES = {
  setup: renderSetup, home: renderHome, plan: renderPlan, learn: renderMap, unit: renderUnit,
  practice: renderPractice, quiz: renderQuiz, result: renderResult, terms: renderTerms,
  stats: renderStats, adventure: renderAdventure, settings: renderSettings, data: renderData, end: renderSessionEnd, past: renderPast,
};
const STUDY_ROUTES = new Set(['unit', 'quiz', 'terms', 'past']);
const NAV = { home: 'home', plan: 'home', learn: 'learn', unit: 'learn', practice: 'practice', quiz: 'practice', result: 'practice', terms: 'practice', past: 'practice', adventure: 'adventure', stats: 'stats', settings: 'stats', data: 'stats', end: 'home' };

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = h.split('?');
  const [name, ...args] = path.split('/');
  return { name: name || 'home', args, query: Object.fromEntries(new URLSearchParams(query)) };
}

function route() {
  const r = parseHash();
  const s = app.s;
  let name = r.name;
  if (!s.settings.setupDone && name !== 'setup' && name !== 'data') name = 'setup';
  const fn = ROUTES[name] || renderHome;
  app.tracker.setStudying(STUDY_ROUTES.has(name));
  // 学習画面から離れたらセッションの区切りを確認
  const view = $('#view');
  view.scrollTop = 0; window.scrollTo(0, 0);
  try {
    fn(view, app, r);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<section class="card"><h2>表示できませんでした</h2><p>${e.message}</p><p>学習データは保存されています。</p><button class="btn primary" data-go="#/home">ホームへ</button></section>`;
  }
  const nav = NAV[name];
  document.querySelectorAll('#tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === nav));
  document.body.classList.toggle('no-tabbar', name === 'setup' || name === 'quiz');
}

async function boot() {
  const view = $('#view');
  view.innerHTML = '<div class="loading">読み込み中…</div>';
  await loadContent('./');
  app.store = await Store.open();
  app.tracker = new Tracker(app.store, {
    onSessionEnd: (ses, why) => {
      app.lastSession = ses;
      app.replan(why === 'gap' ? '前回の学習セッションの終了' : '学習セッションの終了');
    },
  });
  app.tracker.start();
  app.tracker.closeStale();
  app.refresh();
  if (app.P.gapDays >= 3) app.store.logPlan({ reason: `${app.P.gapDays}日ぶりの学習で再計画`, status: app.P.status, summary: planSummary(app.P), detail: app.P.messages.slice(0, 3) });
  document.documentElement.style.setProperty('--fs', app.s.settings.fontScale || 1);

  // 端末の容量が少ないときに、学習データが自動で消されないよう依頼する
  if (navigator.storage?.persist) navigator.storage.persisted().then((p) => { if (!p) navigator.storage.persist(); }).catch(() => {});

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-go]');
    if (a) { e.preventDefault(); app.go(a.dataset.go); }
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', () => { app.tracker.flush(); app.store.flush(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) app.store.flush(); });
  // 日付が変わったら計画を更新
  let day = today();
  setInterval(() => { if (today() !== day) { day = today(); app.replan('日付の変更'); if (parseHash().name === 'home') route(); } }, 60000);
  route();
  registerSW();
  updateOnlineBadge();
  window.addEventListener('online', updateOnlineBadge);
  window.addEventListener('offline', updateOnlineBadge);
}

function updateOnlineBadge() {
  const el = $('#net');
  if (el) { el.textContent = navigator.onLine ? '' : 'オフライン'; el.hidden = navigator.onLine; }
}

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) {
          toast('新しい版を読み込みました。次に開いたときから反映されます（学習データはそのままです）。', 4000);
        }
      });
    });
  }).catch(() => {});
}

window.__itq = app; // 動作確認用
boot().catch((e) => {
  console.error(e);
  $('#view').innerHTML = `<section class="card"><h2>起動できませんでした</h2><p>${e.message}</p></section>`;
});

export { levelInfo };
