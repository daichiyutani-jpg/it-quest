// 学習時間の計測。学習画面（単元・問題・用語）を開いていて、画面が表示中で、
// 直近2分以内に操作があった時間だけを数える（開きっぱなしの放置は数えない）。
// 30分以上間があいたら別の学習セッションとして扱う。
import { now, uid, today } from './util.js';
import { addStudySeconds } from './mastery.js';

export const IDLE_SEC = 120;
export const SESSION_GAP_MIN = 30;

export class Tracker {
  constructor(store, { onSessionEnd } = {}) {
    this.store = store;
    this.studying = false;
    this.lastInput = Date.now();
    this.pending = 0;
    this.onSessionEnd = onSessionEnd;
    this.tickTimer = null;
  }

  start() {
    const mark = () => { this.lastInput = Date.now(); };
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, mark, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.flush(); else this.lastInput = Date.now(); });
    window.addEventListener('pagehide', () => this.flush());
    this.tickTimer = setInterval(() => this.tick(), 1000);
  }

  setStudying(on) { if (this.studying && !on) this.flush(); this.studying = on; if (on) { this.lastInput = Date.now(); this.ensureSession(); } }

  tick() {
    if (!this.studying || document.hidden) return;
    if ((Date.now() - this.lastInput) / 1000 > IDLE_SEC) return;
    this.pending++;
    if (this.pending >= 15) this.flush();
  }

  flush() {
    if (!this.pending) return;
    const s = this.store.s;
    addStudySeconds(s, this.pending);
    const ses = this.current();
    if (ses) { ses.sec += this.pending; ses.end = now().toISOString(); }
    this.pending = 0;
    this.store.touch('days', 'sessions');
  }

  current() {
    const list = this.store.s.sessions;
    const last = list[list.length - 1];
    return last && !last.closed ? last : null;
  }

  /** 学習を始めるとき：前のセッションから30分以上空いていたら締めて、新しく始める */
  ensureSession() {
    const s = this.store.s;
    let ses = this.current();
    if (ses && (now() - new Date(ses.end)) / 60000 > SESSION_GAP_MIN) { this.close('gap'); ses = null; }
    if (!ses) {
      ses = { id: uid(), date: today(), start: now().toISOString(), end: now().toISOString(), sec: 0, answers: 0, correct: 0, lessons: 0, closed: false };
      s.sessions.push(ses);
      if (s.sessions.length > 500) s.sessions.splice(0, s.sessions.length - 500);
      this.store.touch('sessions');
    }
    return ses;
  }

  countAnswer(correct) { const ses = this.ensureSession(); ses.answers++; if (correct) ses.correct++; ses.end = now().toISOString(); this.store.touch('sessions'); }
  countLesson() { const ses = this.ensureSession(); ses.lessons++; ses.end = now().toISOString(); this.store.touch('sessions'); }

  /** セッションを締める。中身があれば onSessionEnd（計画の見直し）を呼ぶ */
  close(why = 'user') {
    this.flush();
    const ses = this.current();
    if (!ses) return null;
    ses.closed = true;
    ses.closeReason = why;
    this.store.touch('sessions');
    const meaningful = ses.sec >= 60 || ses.answers > 0 || ses.lessons > 0;
    if (meaningful && this.onSessionEnd) this.onSessionEnd(ses, why);
    return ses;
  }

  /** アプリを開いたとき：前回のセッションが放置されていたら締める */
  closeStale() {
    const ses = this.current();
    if (ses && (now() - new Date(ses.end)) / 60000 > SESSION_GAP_MIN) return this.close('gap');
    return null;
  }
}
