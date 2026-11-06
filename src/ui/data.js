// データと準備状況：保存先と保存の状態（端末の制約を正直に表示）、学習開始前の品質確認、収録・照合状況、情報源、初期化
// 学習アプリ共通ルール §4：学習履歴は端末内だけ。外部送信・クラウド同期・バックアップ機能は設けない。
import { UNITS, SYLLABUS_INFO } from '../data/syllabus.js';
import { EXAM } from '../data/calendar.js';
import { inventory, TYPE_LABEL, DB } from '../data/content/index.js';
import { SOURCES } from '../data/sources.js';
import { readiness } from '../core/readiness.js';
import { esc, toast, confirmDialog } from './dom.js';
import { APP_VERSION } from '../version.js';

export function renderData(view, app) {
  const inv = inventory();
  const R = readiness(DB);
  const nm = (id) => UNITS.find((u) => u.id === id)?.name || id;
  view.innerHTML = `
  <section class="card"><h2>学習データの保存</h2>
    <p class="small">学習データはこの端末の中（${esc(app.store.backend.kind)}）だけに保存されます。サーバーへの送信・クラウド同期・バックアップはありません。</p>
    <p class="small">保存の状態：<b id="persist">確認中…</b>${app.store.saveError ? `<br><span class="warn">保存エラー：${esc(app.store.saveError)}</span>` : ''}</p>
    <ul class="small">
      <li><b>消えて元に戻せない場合があります。</b>端末の空き容量が少ないときや、長い間アプリを開かなかったとき、ブラウザが保存データを消すことがあります。バックアップ機能はないため、消えたデータは復元できません。</li>
      <li>iPhoneでは、Safariで開いたときとホーム画面のアイコンから開いたときで、保存場所が別になることがあります。<b>学習はいつもホーム画面のアイコンから</b>開いてください。</li>
      <li>ホーム画面への追加は、iPhoneはSafariの共有ボタン →「ホーム画面に追加」、AndroidはChromeのメニュー →「アプリをインストール」から行います（アプリから自動では追加できません）。</li>
      <li>アプリを閉じている間は、教材の更新も計画の更新も行われません。次に開いたときに反映されます。</li>
    </ul>
  </section>

  <section class="card"><h2>学習開始前の品質確認</h2>
    <p class="${R.ready ? 'ok' : 'warn'}"><b>${R.ready ? '準備完了：30日間の学習計画を始められます。' : '準備中：すべての確認が済むまで、30日間の学習計画は始められません。'}</b></p>
    <ul class="check-list small">${R.checks.map((c) => `<li>${c.ok ? '✅' : '⬜'} ${esc(c.label)}<br><span class="tiny muted">${esc(c.detail || '')}</span></li>`).join('')}</ul>
  </section>

  <section class="card"><h2>収録・照合状況</h2>
    <table class="kv">
      <tr><th>シラバス</th><td>${esc(SYLLABUS_INFO.name)} ${esc(SYLLABUS_INFO.version)}（${SYLLABUS_INFO.published}掲載・${SYLLABUS_INFO.checkedAt}確認）</td></tr>
      <tr><th>単元・項目</th><td>${UNITS.length}単元・${UNITS.reduce((a, u) => a + u.items.length, 0)}項目</td></tr>
      <tr><th>教材（説明）</th><td>照合済み ${UNITS.length - inv.missingLessons.length}/${UNITS.length}単元</td></tr>
      <tr><th>図解</th><td>照合済み ${inv.figures}/${inv.figuresAll}個</td></tr>
      <tr><th>問題（出題するもの）</th><td>${inv.total}問（照合済みだけ）</td></tr>
      ${Object.entries(TYPE_LABEL).filter(([k]) => k !== 'official').map(([k, l]) => `<tr><th>　${l}</th><td>${inv.byType[k] || 0}問</td></tr>`).join('')}
      <tr><th>問題（全件）</th><td>${inv.totalAll}問：照合済み ${inv.byStatus.verified || 0}・未照合 ${inv.byStatus.needs_review || 0}・利用停止 ${inv.byStatus.suspended || 0}</td></tr>
      <tr><th>照合の方法</th><td>${DB.verify.checkedAt ? `${esc(DB.verify.checkedAt)}・${esc(DB.verify.method || '')}` : 'まだ照合していません'}。${DB.verify.expert ? '専門家の監修あり' : '<b>AIで照合、専門家の監修なし</b>'}</td></tr>
    </table>
    ${inv.fewUnits.length ? `<p class="warn small">照合済みの問題が20問（小テスト2回分）に足りない単元：${inv.fewUnits.map(nm).map(esc).join('、')}</p>` : ''}
    ${inv.suspended.length ? `<details><summary class="small">利用停止中の教材・問題（${inv.suspended.length}）</summary><ul class="small">${inv.suspended.map((x) => `<li>${esc(x.id)}（${esc(nm(x.unit))}）${x.note ? `：${esc(x.note)}` : ''}</li>`).join('')}</ul></details>` : ''}
    ${DB.loadErrors.length ? `<p class="warn small">読み込めなかったデータ：${DB.loadErrors.map(esc).join(' / ')}</p>` : ''}
    <p class="tiny muted">問題はすべて本アプリ用のオリジナルです（実際の試験問題・市販教材の問題ではありません）。IPAの公開問題は「公式の過去問」で、各自がIPAのサイトから入手したPDFを端末の中で読み込んで使います。</p>
  </section>

  <section class="card"><h2>情報源</h2>
    <details><summary class="small">教材の根拠にした資料（${SOURCES.length}件）</summary>
      <ul class="small">${SOURCES.map((x) => `<li><b>${esc(x.id)}</b> ${esc(x.name)}（${esc(x.publisher)}）${x.where ? `／${esc(x.where)}` : ''}／確認 ${esc(x.checked)}<br><span class="tiny muted">${esc(x.url)}</span></li>`).join('')}</ul>
    </details>
  </section>

  <section class="card"><h2>オフラインで使える機能</h2>
    <p class="small">一度開いたあとは、通信なしで次の機能が使えます：教材・図解の閲覧、問題演習、採点・解説、小テスト、理解度の判定、苦手分野の分析、復習問題の選択と間隔の調整、学習計画の調整、学習時間の記録、模擬試験、合格の目安の表示。</p>
    <p class="small">通信が必要なもの：照合済みの新しい教材（アプリの更新）の取得、IPAの公式サイトを開くこと。</p>
    <ul class="small"><li><a href="${SYLLABUS_INFO.url}" target="_blank" rel="noopener">IPA 試験要綱・シラバス</a>（要通信）</li><li><a href="${EXAM.url}" target="_blank" rel="noopener">ITパスポート試験 試験の概要</a>（要通信）</li></ul>
  </section>

  <section class="card"><h2>データの初期化</h2>
    <p class="small">学習記録をすべて消して最初からやり直します。元に戻せません。</p>
    <button class="btn danger wide" id="reset">すべての学習データを消す</button>
  </section>
  <section class="card tiny muted"><p>IT QUEST ${APP_VERSION} ／ 学習データはサーバーに送信しません。</p>
    <p>ITパスポート試験は、独立行政法人情報処理推進機構（IPA）が実施する国家試験です。本アプリはIPAとは関係のない個人制作の学習用アプリです。合格を保証するものではありません。</p></section>`;

  const el = view.querySelector('#persist');
  if (navigator.storage?.persisted) {
    navigator.storage.persisted().then((p) => {
      el.textContent = p ? '消されにくい設定になっています（端末の判断で消えることはあります）' : '消されにくい設定にできませんでした（ブラウザが容量不足のときに消すことがあります）';
    }).catch(() => { el.textContent = '確認できませんでした'; });
  } else el.textContent = 'この端末では確認できません';

  view.querySelector('#reset').addEventListener('click', async () => {
    if (!(await confirmDialog({ title: '本当に消しますか？', body: '<p>すべての学習記録・設定が消えます。バックアップはないため、元に戻せません。</p>', ok: '次へ', danger: true }))) return;
    if (!(await confirmDialog({ title: '最終確認', body: '<p>消すと復元できません。</p>', ok: 'すべて消す', danger: true }))) return;
    await app.store.resetAll();
    app.quiz = null;
    app.refresh();
    toast('初期化しました。');
    app.go('#/setup');
  });
}
