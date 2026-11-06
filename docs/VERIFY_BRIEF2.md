# 2回目の照合の手順（IT QUEST）

1回目の照合（`src/data/verify/raw/vA1〜vF2.json`）で `needs_review` になった問題・教材・図だけを、**1回目とも作成とも別の担当**が照合し直す。
基本の手順・判定の条件・出力の形は `docs/VERIFY_BRIEF.md` と `docs/FACTCHECK.md` と同じ（FACTCHECK.md の「1回目の照合を受けて決めた扱い」も守る）。違う点だけを書く。

## 対象の取り出し方
- 現在の内容は、1回目の patch を当てた後のもの。node で `src/data/content/index.js` の `CONTENT_FILES` を全部 import し、`indexContent(mods)`（照合結果は `src/data/verify/all.js`）を呼んで、`DB.allQuestions`・`DB.allLessons`・`DB.allFigures` から取り出す。
- 対象は、担当単元のうち `src/data/verify/all.js` の `items` で `status` が `verified` でないもの**だけ**。`note` に1回目で確かめられなかった理由が書いてある。まずそれを読む。
- 1回目の生の報告（`raw/v*.json`）の `sources` に、すでに開けた資料の一覧がある。使ってよいが、使う資料はあなたが自分で開いて確かめ、あなたの報告の `sources` に書く。

## 判定
- 資料で確かめられたら `verified`。
- 資料に書いてある事実に合わせて**問題を作り直せる**なら、`patch` で作り直して `verified` にしてよい（同じシラバス項目・同じ単元の範囲で。正解が1つに決まること）。例：定義を書いた公的資料が無い用語の問題を、公的資料に書いてある説明で問う問題に変える。
- 教材（lesson）は、確かめられない用語・記述を削るか、資料の言い方に直す `patch` を作って `verified` にしてよい（`terms` などは直した後の全体を入れる）。
- 範囲外のおそれがあるもの（FACTCHECK.md に一覧）は `needs_review` のままにする。
- 確かめられなければ `needs_review` のまま。`note` に、何を探してどこが開けなかったかを書く。

## 出力（1回目と違う点）
- ファイル：`src/data/verify/raw/<担当名>.json`（担当名はプロンプトで指定。`w` で始まるので、1回目の報告より後に読み込まれて上書きする）。
- `items` には**対象の項目だけ**を入れる（verified の項目は入れない）。
- **patch は元の作成データに対する差分**として書く。1回目の patch（`all.js` の `items[id].patch`）がある項目は、それを引き継いで、あなたの修正を足した**全体**を入れる（そうしないと1回目の修正が消える）。
- `sourceIds` は、あなたの報告の `sources` の key と `SRC-001`。
- 出力後、node で次を確かめる：JSON として読める／対象の項目がすべてある／patch を当てた後の問題が choices 4つ・why 4つ・answer 0〜3／verified はシラバス以外の資料を1つ以上持つ／`node tools/validate.mjs` を通る。
- `merge-verify.mjs` は実行しない。ほかのファイルは編集しない。
- 作業用ファイルは scratchpad の**自分専用のフォルダ**に置く（ほかの担当と共有なので、同じ名前のファイルを使わない）。
