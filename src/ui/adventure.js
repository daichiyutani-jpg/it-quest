// 冒険（ゲーム要素）：大陸と町、合格への試験塔、相棒ピコ、称号
import { levelInfo, rankOf, RANKS, TITLES, fieldTitles, titleName, worldMap, towerState, currentStreak } from '../core/game.js';
import { esc, bar } from './dom.js';
import { pico, AREA_ICON } from './art.js';

export function renderAdventure(view, app) {
  app.refresh();
  const { s, A, P } = app;
  const lv = levelInfo(s.game.xp);
  const rank = rankOf(lv.lv);
  const world = worldMap(A);
  const tower = towerState(s, A, P);
  const allTitles = [...TITLES, ...fieldTitles(A)];
  view.innerHTML = `
  <section class="card hero">
    <div class="hero-row">${pico(rank.stage, 'happy', 90)}
      <div class="hero-txt"><b>相棒のピコ</b><div class="small">ランク：${rank.name}　Lv.${lv.lv}</div>${bar(lv.cur / lv.need, 'var(--gold)', '経験値')}
      <div class="tiny">次のレベルまで ${lv.need - lv.cur}XP　🔥 ${currentStreak(s)}日連続（最長${s.game.bestStreak}日）</div></div></div>
    <p class="tiny muted">レベルは努力の記録です。試験範囲の理解度は「進捗」と「単元の状態」で確認してください。次のランク：${(RANKS.find((r) => r.min > lv.lv) || { name: '最高ランク', min: lv.lv }).name}（Lv.${(RANKS.find((r) => r.min > lv.lv) || { min: lv.lv }).min}）</p>
    <details><summary class="small">経験値のもらい方</summary><ul class="tiny">
      <li>単元の説明を読み終える 20XP／初見で正解 5XP</li><li>復習の予定日に正解 8XP／前に間違えた問題に正解 8XP</li>
      <li>間違えた理由を記録 1XP／重要用語カード 1語1XP</li><li>その日はじめて意味のある学習（5分・5問・単元1つ・復習3問のどれか）15XP</li><li>模擬試験 30XP＋正解数</li></ul></details>
  </section>
  ${world.map((c) => `<section class="card land" style="--land:${c.color}">
    <h2>${AREA_ICON[c.id]} ${esc(c.area)}<small>（${esc(c.name)}）</small></h2>${bar(c.progress, c.color, c.area)}
    <div class="towns">${c.towns.map((t) => `<a class="town ${t.state}" href="#/learn"><span>${t.state === 'cleared' ? '🏳️' : t.state === 'visited' ? '🏠' : '🌫️'}</span><small>${esc(t.name)}</small></a>`).join('')}</div>
    <p class="tiny muted">🌫️未踏　🏠訪問中　🏳️解放（その町の全単元が基礎理解済み以上）</p>
  </section>`).join('')}
  <section class="card tower ${tower.open ? 'open' : ''}"><h2>🗼 合格への試験塔</h2>
    ${tower.open ? `<p>塔の扉が開いています。総合模擬試験で上の階をめざしましょう。</p>
      <div class="floors">${[4, 3, 2, 1].map((f) => `<div class="${tower.floor >= f ? 'lit' : ''}">${f}F ${['', '正答率40%未満でも挑戦で到達', '正答率60%以上', '正答率70%以上', '正答率80%以上'][f]}</div>`).join('')}</div>
      <a class="btn primary wide" href="#/practice">模擬試験へ</a>` : '<p>3つの大陸の進捗がそれぞれ35%を超えるか、直前対策期間に入ると扉が開きます。（模擬試験自体は演習メニューからいつでも受けられます）</p>'}
    <p class="tiny muted">階は模擬試験の正答率の記録で、合格可能性ではありません。</p>
  </section>
  <section class="card"><h2>🏅 称号 ${s.game.titles.length}/${allTitles.length}</h2>
    <ul class="titles">${allTitles.map((t) => { const got = s.game.titles.includes(t.id); return `<li class="${got ? 'got' : ''}"><b>${got ? esc(titleName(t.id)) : '？？？'}</b><small>${esc(t.desc)}</small></li>`; }).join('')}</ul>
  </section>`;
}
