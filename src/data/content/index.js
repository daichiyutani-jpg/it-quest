// 教材・問題データの読み込み。ファイルが欠けていてもアプリは動き、その単元を「教材未作成」として扱う。
// 学習アプリ共通ルール §15：通常の学習に出すのは status が 'verified' のものだけ。
//   - 照合結果（src/data/verify/all.js）の status・sourceIds・patch（照合で直した内容）を、データに重ねて使う。
//   - DB.questions / DB.byUnit / DB.lessons / DB.figures には verified だけが入る（アプリの各画面はこれだけを見る）。
//   - DB.all* には照合前・停止中も含めた全件が入る（収録状況・準備状況の表示用）。
import { UNITS } from '../syllabus.js';
import VERIFY from '../verify/all.js';

export const CONTENT_FILES = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6a', 'c6b', 'c6c', 'c7a', 'c7b', 'c7c', 'c7d', 'c7e', 'c7f', 'c7g'];

export const TYPE_LABEL = {
  official: '公式公開問題',
  original: 'オリジナル学習問題',
  applied: '応用問題',
  mock: '模擬試験問題',
};
export const FORMAT_LABEL = { term: '用語・知識', calc: '計算', case: '事例・読解' };
export const STATUS_LABEL = { verified: '照合済み', needs_review: '未照合・確認中', suspended: '利用停止' };

export const DB = {
  lessons: {}, // unitId -> lesson（verified のみ）
  questions: {}, // qid -> question（verified のみ。unit, field を付与）
  byUnit: {}, // unitId -> [qid]（verified のみ）
  figures: {}, // unitId -> [figure]（verified のみ）
  allQuestions: {}, // qid -> question（全件）
  allLessons: {}, // unitId -> lesson（全件）
  allFigures: {}, // unitId -> [figure]（全件）
  verify: { checkedAt: null, method: null, expert: false },
  loadErrors: [],
};

let V = VERIFY;
function overlay(key, obj) {
  const v = V.items?.[key];
  const out = { ...obj, status: obj.status || 'needs_review', sourceIds: obj.sourceIds || [] };
  if (!v) return out;
  if (v.patch) Object.assign(out, v.patch);
  if (v.status) out.status = v.status;
  if (v.sourceIds) out.sourceIds = v.sourceIds;
  if (v.note) out.verifyNote = v.note;
  out.verifiedAt = v.at || V.checkedAt || null;
  return out;
}

function reset() {
  for (const k of ['lessons', 'questions', 'byUnit', 'figures', 'allQuestions', 'allLessons', 'allFigures']) DB[k] = {};
}

/** verify：照合結果（省略時は src/data/verify/all.js）。テストでは差し替えて使う */
export function indexContent(modules, verify = VERIFY) {
  V = verify;
  reset();
  DB.verify = { checkedAt: V.checkedAt || null, method: V.method || null, expert: !!V.expert };
  const fieldOf = Object.fromEntries(UNITS.map((u) => [u.id, u.field]));
  for (const u of UNITS) { DB.byUnit[u.id] = []; DB.figures[u.id] = []; DB.allFigures[u.id] = []; }
  for (const list of modules) {
    for (const entry of list) {
      if (!fieldOf[entry.unit]) continue;
      if (entry.lesson && !DB.allLessons[entry.unit]) {
        const L = overlay(`lesson:${entry.unit}`, entry.lesson);
        DB.allLessons[entry.unit] = L;
        if (L.status === 'verified') DB.lessons[entry.unit] = L;
      }
      for (const f of entry.figures || []) {
        const F = overlay(f.id, f);
        DB.allFigures[entry.unit].push(F);
        if (F.status === 'verified') DB.figures[entry.unit].push(F);
      }
      for (const q of entry.questions || []) {
        const Q = overlay(q.id, { ...q, unit: entry.unit, field: fieldOf[entry.unit] });
        DB.allQuestions[q.id] = Q;
        if (Q.status === 'verified') { DB.questions[q.id] = Q; DB.byUnit[entry.unit].push(q.id); }
      }
    }
  }
  return DB;
}

export async function loadContent(base = './') {
  const mods = [];
  DB.loadErrors = [];
  for (const f of CONTENT_FILES) {
    try {
      const m = await import(`${base}${f}.js`);
      mods.push(m.default || []);
    } catch (e) {
      DB.loadErrors.push(`${f}.js: ${e.message}`);
    }
  }
  return indexContent(mods);
}

/** 収録状況（水増しせず、未作成・未照合・停止も数える） */
export function inventory() {
  const all = Object.values(DB.allQuestions);
  const qs = Object.values(DB.questions);
  const byType = { official: 0, original: 0, applied: 0, mock: 0 };
  const byField = { S: 0, M: 0, T: 0 };
  const byStatus = { verified: 0, needs_review: 0, suspended: 0 };
  for (const q of qs) { byType[q.type] = (byType[q.type] || 0) + 1; byField[q.field]++; }
  for (const q of all) byStatus[q.status] = (byStatus[q.status] || 0) + 1;
  const missingLessons = UNITS.filter((u) => !DB.lessons[u.id]).map((u) => u.id);
  const noQuestionUnits = UNITS.filter((u) => !DB.byUnit[u.id]?.length).map((u) => u.id);
  const fewUnits = UNITS.filter((u) => (DB.byUnit[u.id]?.length || 0) < 20).map((u) => u.id);
  const noFigureUnits = UNITS.filter((u) => !DB.figures[u.id]?.length).map((u) => u.id);
  const covered = new Set(qs.map((q) => q.item));
  const allItems = UNITS.flatMap((u) => u.items.map((i) => i.id));
  const suspended = [
    ...all.filter((q) => q.status === 'suspended').map((q) => ({ id: q.id, unit: q.unit, note: q.verifyNote || '' })),
    ...Object.entries(DB.allLessons).filter(([, L]) => L.status === 'suspended').map(([u, L]) => ({ id: `lesson:${u}`, unit: u, note: L.verifyNote || '' })),
  ];
  return {
    total: qs.length, totalAll: all.length, byType, byField, byStatus, missingLessons, noQuestionUnits, fewUnits, noFigureUnits, suspended,
    figures: Object.values(DB.figures).reduce((a, x) => a + x.length, 0),
    figuresAll: Object.values(DB.allFigures).reduce((a, x) => a + x.length, 0),
    itemsCovered: allItems.filter((i) => covered.has(i)).length, itemsTotal: allItems.length,
    uncoveredItems: allItems.filter((i) => !covered.has(i)),
  };
}
