// 教材・問題データの読み込み。ファイルが欠けていてもアプリは動き、その単元を「教材未作成」として扱う。
import { UNITS } from '../syllabus.js';

export const CONTENT_FILES = ['c1', 'c2', 'c3', 'c4', 'c5'];

export const TYPE_LABEL = {
  official: '公式公開問題',
  original: 'オリジナル学習問題',
  applied: '応用問題',
  mock: '模擬試験問題',
};
export const FORMAT_LABEL = { term: '用語・知識', calc: '計算', case: '事例・読解' };

export const DB = {
  lessons: {}, // unitId -> lesson
  questions: {}, // qid -> question（unit, field を付与）
  byUnit: {}, // unitId -> [qid]
  loadErrors: [],
};

export function indexContent(modules) {
  const fieldOf = Object.fromEntries(UNITS.map((u) => [u.id, u.field]));
  for (const u of UNITS) DB.byUnit[u.id] = [];
  for (const list of modules) {
    for (const entry of list) {
      if (!fieldOf[entry.unit]) continue;
      if (entry.lesson) DB.lessons[entry.unit] = entry.lesson;
      for (const q of entry.questions || []) {
        DB.questions[q.id] = { ...q, unit: entry.unit, field: fieldOf[entry.unit] };
        DB.byUnit[entry.unit].push(q.id);
      }
    }
  }
  return DB;
}

export async function loadContent(base = './') {
  const mods = [];
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

/** 収録状況（水増しせず、未作成も数える） */
export function inventory() {
  const qs = Object.values(DB.questions);
  const byType = { official: 0, original: 0, applied: 0, mock: 0 };
  const byField = { S: 0, M: 0, T: 0 };
  for (const q of qs) { byType[q.type] = (byType[q.type] || 0) + 1; byField[q.field]++; }
  const missingLessons = UNITS.filter((u) => !DB.lessons[u.id]).map((u) => u.id);
  const noQuestionUnits = UNITS.filter((u) => !DB.byUnit[u.id]?.length).map((u) => u.id);
  const covered = new Set(qs.map((q) => q.item));
  const allItems = UNITS.flatMap((u) => u.items.map((i) => i.id));
  return {
    total: qs.length, byType, byField, missingLessons, noQuestionUnits,
    itemsCovered: allItems.filter((i) => covered.has(i)).length, itemsTotal: allItems.length,
    uncoveredItems: allItems.filter((i) => !covered.has(i)),
  };
}
