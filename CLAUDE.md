# IT QUEST（ITパスポート試験）

<!-- based-on: learning-app-rules v1 2026-11-06 -->

このプロジェクトは学習アプリ共通ルール `~/.claude/learning-apps/RULES.md` に従う。作業の最初に RULES.md を読む。

共通ルール（起動時に自動で読み込む）：@~/.claude/learning-apps/RULES.md

ここにはこのプロジェクト固有の事実・決定だけを書き、共通ルールを書き写さない。共通ルールと違う扱いをする場合は「共通ルールからの例外」に、本人の承認日と理由を書く。

## 対象

- 分類：資格試験
- 正式名称：ITパスポート試験（情報処理技術者試験）
- 実施機関：独立行政法人情報処理推進機構（IPA）
- 公式情報の最終確認日：2026-11-06（docs/OFFICIAL.md・docs/SOURCES.md）。2027年度に新試験制度の予定（シラバス案Ver.0.1、2026-08-31掲載）

## 場所

- フォルダ：`C:\Users\user\Downloads\トンワークス\it-quest\`
- 開発サーバー：`トンワークス\.claude\launch.json` の `it-quest`（8795）／`it-quest-subpath`（8796, /it-quest/）
- 公開先：https://daichiyutani-jpg.github.io/it-quest/ （repo daichiyutani-jpg/it-quest、Pages=main / root。公開は毎回本人の承認後）
- 保存キーの接頭辞：キャッシュ `it-quest-`／IndexedDB `it-quest`・`it-quest-past`／localStorage `itq:`
- 照合用のシラバス本文：`.local/syllabus/Uxx.txt`（`.local/` は git 管理外。公式PDF `.local/syllabus_ip_ver6_5.pdf` から pdftotext -enc UTF-8 で作成）

## 検証コマンド

- 形式チェック：`node tools/validate.mjs`
- 単体テスト：`node --test tests/*.test.mjs`
- 照合結果の反映：`node tools/merge-verify.mjs`（`src/data/verify/raw/*.json` → `verify/all.js`・`sources-extra.js`・docs/SOURCES.md・FACTCHECK.md の集計）
- 範囲の対応表：`node tools/build-coverage.mjs`（docs/COVERAGE.md、漏れがあれば失敗）
- 公開前：`node tools/build-sw.mjs`

## 現在の状態

- 学習開始条件（docs/READINESS.md）：スマートフォン実機での確認だけ未実施（ほかは2026-11-06にすべてOK）。そのためアプリは「準備中」
- 照合：2回＋追加分（raw/vA1〜vF2・w1〜w9b・x-integration）。照合済み1,383問・利用停止22問・教材63・図126。AIで照合、専門家の監修なし
- 未了・未確認：実機（iPhone・Android）、2027年度シラバス案の中身、個人情報保護法改正の施行（2027-01-17・2028-07-16）時の再照合
- 公開：0.3.0 を2026-11-06に公開（本人「公開して確認する」、commit 5b2d69b）。公開は毎回本人の承認後

## 決定事項（日付つき）

- 2026-11-06 本人「既存を合わせる」：既存の IT QUEST を共通ルール v1 に合わせて作り直す（別アプリは作らない）。
- 2026-11-06 共通ルール §4・§5 に合わせて、効果音・BGM（WebAudio）と JSON バックアップ（書き出し・読み込み）を削除。
- 2026-11-06 教材・問題・図は `status` と `sourceIds` を持ち、照合結果（`src/data/verify/`）で上書きする。出題は `verified` だけ。
- 2026-11-06 1単元22問以上（小テスト10問×2回＋予備）に増やす。追加は c7a〜c7f。
- 2026-11-06 公式の過去問（#/past）の回答も単元の理解度に数える（正答はIPAの解答例と照合済み）。
- 2026-11-06 ゲーム要素（経験値・称号・ピコ）は残す（共通ルールで禁止されていない）。
- 2026-11-06 2回照合しても根拠を確かめられない問題・範囲外のおそれがある問題は利用停止（直さずに出さない）。足りない単元は公的資料の事実で問う問題を追加（c7g）。使ってよい資料の追加の扱いは docs/FACTCHECK.md。

## 共通ルールからの例外

- なし
