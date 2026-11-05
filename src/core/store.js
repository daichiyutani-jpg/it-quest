// 学習データの保存（端末内）。IndexedDB を基本にし、使えない環境では localStorage に保存する。
// データは区分（section）ごとに別レコードで保存し、変わった区分だけを書き込む。
// Service Worker のキャッシュ更新ではIndexedDBは消えない（キャッシュとは別の保存場所）。
import { now, today, uid } from './util.js';
import { DEFAULT_SOFT_GOAL } from '../data/calendar.js';

export const SCHEMA_VERSION = 1;
export const SECTIONS = ['meta', 'settings', 'units', 'qstate', 'answers', 'days', 'sessions', 'mocks', 'planHistory', 'game', 'resume'];

export function defaultState() {
  return {
    meta: { app: 'it-quest', schema: SCHEMA_VERSION, createdAt: now().toISOString(), id: uid() },
    settings: {
      setupDone: false,
      examDate: null, // 'YYYY-MM-DD' または null（未定）
      softGoalDate: DEFAULT_SOFT_GOAL, // 受験日未定のときの「一通り学習」の目安日
      weekdayMin: 30,
      weekendMin: 60,
      todayMin: null, // { date, min } その日だけの学習可能時間
      selfLevel: 2, // 1=ほぼ初めて 2=少し分かる 3=仕事で使う 4=詳しい
      experience: 'none', // none / some / retake
      sessionMin: 30,
      daysPerWeek: 5,
      finalDays: 7, // 直前対策を始める日数（目安）
      sound: { se: true, bgm: false, volume: 0.6, muted: false },
      fontScale: 1,
    },
    units: {}, // unitId -> { pagesSeen, lessonDone, lessonReads, termsViews, firstAt, lastAt }
    qstate: {}, // qid -> { box, due, seen, correct, wrong, lastAt, lastCorrect, explainReads, flagged }
    answers: [], // { qid, unit, field, at, d, correct, first, mode, ms, reason }
    days: {}, // 'YYYY-MM-DD' -> { sec, answers, correct, lessons, meaningful }
    sessions: [], // { id, start, end, sec, answers, correct, lessons, summarized }
    mocks: [], // { at, kind, total, correct, byField, sec, limitSec, unanswered }
    planHistory: [], // { at, reason, status, summary, detail }
    game: { xp: 0, titles: [], streak: 0, bestStreak: 0, lastStreakDate: null, log: [] },
    resume: null, // 中断した演習・学習の続き
  };
}

// ---------- 保存先 ----------
const DB_NAME = 'it-quest';
const STORE = 'kv';
const LS_PREFIX = 'itq:';

function openIDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

class IDBBackend {
  constructor(db) { this.db = db; this.kind = 'IndexedDB'; }
  getAll() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE, 'readonly');
      const st = tx.objectStore(STORE);
      const out = {};
      const req = st.openCursor();
      req.onsuccess = () => { const c = req.result; if (c) { out[c.key] = c.value; c.continue(); } else resolve(out); };
      req.onerror = () => reject(req.error);
    });
  }
  putMany(obj) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      for (const [k, v] of Object.entries(obj)) st.put(v, k);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  clear() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

class LSBackend {
  constructor() { this.kind = 'localStorage'; }
  async getAll() {
    const out = {};
    for (const s of SECTIONS) {
      const v = localStorage.getItem(LS_PREFIX + s);
      if (v) out[s] = JSON.parse(v);
    }
    return out;
  }
  async putMany(obj) { for (const [k, v] of Object.entries(obj)) localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)); }
  async clear() { for (const s of SECTIONS) localStorage.removeItem(LS_PREFIX + s); }
}

class MemoryBackend {
  constructor() { this.kind = 'memory'; this.data = {}; }
  async getAll() { return JSON.parse(JSON.stringify(this.data)); }
  async putMany(obj) { Object.assign(this.data, JSON.parse(JSON.stringify(obj))); }
  async clear() { this.data = {}; }
}

/** 古い形式のデータを今の形にそろえる（足りない項目を既定値で補う） */
export function migrate(raw) {
  const base = defaultState();
  const s = {};
  for (const k of SECTIONS) {
    const v = raw?.[k];
    if (v === undefined || v === null) s[k] = base[k];
    else if (Array.isArray(base[k])) s[k] = Array.isArray(v) ? v : base[k];
    else if (base[k] && typeof base[k] === 'object') s[k] = { ...base[k], ...v };
    else s[k] = v;
  }
  s.settings.sound = { ...base.settings.sound, ...(raw?.settings?.sound || {}) };
  s.meta.schema = SCHEMA_VERSION;
  return s;
}

export class Store {
  constructor(backend) {
    this.backend = backend;
    this.state = defaultState();
    this.dirty = new Set();
    this.timer = null;
    this.listeners = new Set();
    this.lastSavedAt = null;
    this.saveError = null;
  }

  static async open({ memory = false } = {}) {
    let backend;
    if (memory) backend = new MemoryBackend();
    else {
      try { backend = new IDBBackend(await openIDB()); } catch {
        try { localStorage.setItem(LS_PREFIX + 'test', '1'); localStorage.removeItem(LS_PREFIX + 'test'); backend = new LSBackend(); } catch { backend = new MemoryBackend(); }
      }
    }
    const st = new Store(backend);
    const raw = await backend.getAll();
    st.state = migrate(raw);
    // 設定は localStorage にも控えを置く（IndexedDB が消された場合の手がかり）
    if (!raw.settings && typeof localStorage !== 'undefined') {
      try { const bak = localStorage.getItem(LS_PREFIX + 'settings-mirror'); if (bak) st.state.settings = { ...st.state.settings, ...JSON.parse(bak) }; } catch { /* なし */ }
    }
    return st;
  }

  get s() { return this.state; }

  /** 区分を変更済みにして、少し待ってから保存 */
  touch(...sections) {
    for (const x of sections) this.dirty.add(x);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 250);
    for (const f of this.listeners) f(sections);
  }

  async flush() {
    clearTimeout(this.timer);
    if (!this.dirty.size) return;
    const obj = {};
    for (const k of this.dirty) obj[k] = this.state[k];
    this.dirty.clear();
    try {
      await this.backend.putMany(obj);
      this.lastSavedAt = now();
      this.saveError = null;
      if (obj.settings && typeof localStorage !== 'undefined') {
        try { localStorage.setItem(LS_PREFIX + 'settings-mirror', JSON.stringify(obj.settings)); } catch { /* 容量不足など */ }
      }
    } catch (e) {
      this.saveError = e.message;
      for (const k of Object.keys(obj)) this.dirty.add(k); // 次回もう一度
    }
  }

  onChange(f) { this.listeners.add(f); return () => this.listeners.delete(f); }

  // ---------- バックアップ ----------
  exportJSON() {
    return JSON.stringify({ format: 'it-quest-backup', schema: SCHEMA_VERSION, exportedAt: now().toISOString(), data: this.state }, null, 0);
  }

  /** 中身を確かめてから読み込む。失敗したら今のデータは変えない */
  static parseBackup(text) {
    let obj;
    try { obj = JSON.parse(text); } catch { throw new Error('JSONとして読めませんでした。'); }
    if (!obj || obj.format !== 'it-quest-backup' || !obj.data) throw new Error('IT QUEST のバックアップファイルではありません。');
    if (obj.schema > SCHEMA_VERSION) throw new Error('新しい版のアプリで作ったバックアップです。アプリを更新してから読み込んでください。');
    const d = migrate(obj.data);
    if (!Array.isArray(d.answers) || typeof d.units !== 'object') throw new Error('データの形が正しくありません。');
    return { data: d, exportedAt: obj.exportedAt };
  }

  async replaceAll(data) {
    this.state = migrate(data);
    for (const k of SECTIONS) this.dirty.add(k);
    await this.flush();
    for (const f of this.listeners) f(SECTIONS);
  }

  async resetAll() {
    await this.backend.clear();
    this.state = defaultState();
    for (const k of SECTIONS) this.dirty.add(k);
    await this.flush();
  }

  /** 計画の変更履歴（直前と同じ内容なら積まない） */
  logPlan(entry) {
    const h = this.state.planHistory;
    const last = h[h.length - 1];
    if (last && last.summary === entry.summary && last.status === entry.status && last.at.slice(0, 10) === today()) return false;
    h.push({ at: now().toISOString(), ...entry });
    if (h.length > 300) h.splice(0, h.length - 300);
    this.touch('planHistory');
    return true;
  }
}
