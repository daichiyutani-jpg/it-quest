// データ：バックアップ（JSON書き出し・読み込み）、収録状況（不足を隠さない）、オフラインで使える機能
import { UNITS, SYLLABUS_INFO } from '../data/syllabus.js';
import { EXAM } from '../data/calendar.js';
import { inventory, TYPE_LABEL, DB } from '../data/content/index.js';
import { Store } from '../core/store.js';
import { today } from '../core/util.js';
import { esc, toast, confirmDialog } from './dom.js';

export function renderData(view, app) {
  const s = app.s;
  const inv = inventory();
  const nm = (id) => UNITS.find((u) => u.id === id)?.name || id;
  const lastBackup = localStorage.getItem('itq:lastBackup');
  view.innerHTML = `
  <section class="card"><h2>バックアップと復元</h2>
    <p class="small">学習データはこの端末の中（${esc(app.store.backend.kind)}）に保存されています。機種変更・再インストールの前に、JSONファイルに書き出してください。</p>
    <p class="small">最後に書き出した日：<b>${lastBackup || 'まだありません'}</b>${app.store.saveError ? `<br><span class="warn">保存エラー：${esc(app.store.saveError)}</span>` : ''}</p>
    <button class="btn primary wide" id="export">JSONに書き出す（バックアップ）</button>
    <label class="btn ghost wide file">JSONから読み込む（復元）<input type="file" id="import" accept="application/json,.json" hidden></label>
    <p class="tiny muted">読み込むと、今のデータは置き換わります（読み込む前に中身を確認する画面が出ます）。</p>
  </section>
  <section class="card"><h2>収録状況</h2>
    <table class="kv">
      <tr><th>シラバス</th><td>${esc(SYLLABUS_INFO.name)} ${esc(SYLLABUS_INFO.version)}（${SYLLABUS_INFO.published}掲載・${SYLLABUS_INFO.checkedAt}確認）</td></tr>
      <tr><th>単元・項目</th><td>${UNITS.length}単元・${UNITS.reduce((a, u) => a + u.items.length, 0)}項目（シラバスの小分類・項目に対応）</td></tr>
      <tr><th>教材（説明）</th><td>${UNITS.length - inv.missingLessons.length}/${UNITS.length}単元</td></tr>
      <tr><th>問題 合計</th><td>${inv.total}問</td></tr>
      ${Object.entries(TYPE_LABEL).map(([k, l]) => `<tr><th>　${l}</th><td>${inv.byType[k] || 0}問${k === 'official' ? '（未収録：出典と利用条件を確認した問題だけを入れる方針）' : k === 'mock' ? '（模擬試験専用問題は未作成。模擬試験はオリジナル問題から出題）' : ''}</td></tr>`).join('')}
      <tr><th>問題がある項目</th><td>${inv.itemsCovered}/${inv.itemsTotal}項目</td></tr>
    </table>
    ${inv.missingLessons.length ? `<p class="warn">教材が未作成の単元：${inv.missingLessons.map(nm).map(esc).join('、')}</p>` : ''}
    ${inv.noQuestionUnits.length ? `<p class="warn">問題が未作成の単元：${inv.noQuestionUnits.map(nm).map(esc).join('、')}</p>` : ''}
    ${inv.uncoveredItems.length ? `<details><summary class="small">問題が未作成のシラバス項目（${inv.uncoveredItems.length}）</summary><ul class="small">${inv.uncoveredItems.map((id) => { const u = UNITS.find((x) => id.startsWith(x.id + '-')); const it = u.items.find((i) => i.id === id); return `<li>${esc(u.name)}：${esc(it.name)}</li>`; }).join('')}</ul></details>` : ''}
    ${DB.loadErrors.length ? `<p class="warn">読み込めなかったデータ：${DB.loadErrors.map(esc).join(' / ')}</p>` : ''}
    <p class="tiny muted">問題はすべて本アプリ用のオリジナルで、実際の試験問題ではありません。法律名などはシラバス${esc(SYLLABUS_INFO.version)}の用語に合わせています。</p>
  </section>
  <section class="card"><h2>オフラインで使える機能</h2>
    <p class="small">一度開いたあとは、通信なしで次の機能が使えます：学習コンテンツの閲覧、問題演習、正答率の集計、進捗の保存、復習、ゲーム要素、学習計画の更新、バックアップ（書き出し・読み込み）。</p>
    <p class="small">通信が必要なもの：IPAの公式サイト（シラバス・試験の案内）へのリンクを開くこと。アプリの更新の取得。</p>
    <ul class="small"><li><a href="${SYLLABUS_INFO.url}" target="_blank" rel="noopener">IPA 試験要綱・シラバス</a>（要通信）</li><li><a href="${EXAM.url}" target="_blank" rel="noopener">ITパスポート試験 試験の概要</a>（要通信）</li></ul>
  </section>
  <section class="card"><h2>データの初期化</h2>
    <p class="small">学習記録をすべて消して最初からやり直します。元に戻せません。先にバックアップを取ってください。</p>
    <button class="btn danger wide" id="reset">すべての学習データを消す</button>
  </section>
  <section class="card tiny muted"><p>IT QUEST 0.1.0 ／ 学習データはサーバーに送信しません。</p>
    <p>ITパスポート試験は、独立行政法人情報処理推進機構（IPA）が実施する国家試験です。本アプリはIPAとは関係のない個人制作の学習用アプリです。</p></section>`;

  view.querySelector('#export').addEventListener('click', async () => {
    await app.store.flush();
    const blob = new Blob([app.store.exportJSON()], { type: 'application/json' });
    const name = `it-quest-backup-${today()}.json`;
    const file = typeof File !== 'undefined' ? new File([blob], name, { type: 'application/json' }) : null;
    // スマホでは共有メニュー（ファイルに保存・メール・クラウドなど）を優先
    if (file && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'IT QUEST バックアップ' }); localStorage.setItem('itq:lastBackup', today()); toast('バックアップを書き出しました。'); renderData(view, app); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    localStorage.setItem('itq:lastBackup', today());
    toast('バックアップを書き出しました。');
    renderData(view, app);
  });

  view.querySelector('#import').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const { data, exportedAt } = Store.parseBackup(await f.text());
      const nAns = data.answers.length; const nUnits = Object.keys(data.units).length;
      const ok = await confirmDialog({
        title: 'このバックアップを読み込みますか？',
        body: `<p class="small">書き出した日時：${esc((exportedAt || '').slice(0, 16).replace('T', ' '))}<br>回答 ${nAns}件・取り組んだ単元 ${nUnits}個・受験日 ${esc(data.settings.examDate || '未定')}</p><p class="warn small">今の端末のデータ（回答${s.answers.length}件）は置き換わります。</p>`,
        ok: '読み込む', danger: true,
      });
      if (!ok) return;
      await app.store.replaceAll(data);
      app.replan('バックアップから復元');
      toast('復元しました。');
      app.go('#/home');
    } catch (err) { toast(`読み込めませんでした：${esc(err.message)}`, 4000); }
  });

  view.querySelector('#reset').addEventListener('click', async () => {
    if (!(await confirmDialog({ title: '本当に消しますか？', body: '<p>すべての学習記録・設定が消えます。元に戻せません。</p>', ok: '次へ', danger: true }))) return;
    if (!(await confirmDialog({ title: '最終確認', body: '<p>バックアップは取りましたか？　消すと復元できません。</p>', ok: 'すべて消す', danger: true }))) return;
    await app.store.resetAll();
    app.quiz = null;
    app.refresh();
    toast('初期化しました。');
    app.go('#/setup');
  });
}
