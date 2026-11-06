# 照合担当への手順（IT QUEST）

あなたは教材の**照合担当**です。教材・問題・図を作った担当とは別です。作成担当の判断をうのみにせず、出典を開いて確かめてください。

## 読むもの
1. `docs/FACTCHECK.md` — `verified` にする条件・使ってよい資料。**必ずこの条件で判定する。**
2. `docs/CONTENT_SCHEMA.md` — データの形（patch で直すときに形を崩さない）。
3. `.local/syllabus/Uxx.txt` — IPA公式シラバスVer.6.5の該当単元の本文（SRC-001）。範囲の確認に使う。
4. 担当単元の教材・問題・図：`src/data/content/` の全ファイル（c1〜c7f）から、担当単元の `lesson`・`questions`・`figures` を取り出す。node で import して一覧を作るとよい（例：`CONTENT_FILES` を `src/data/content/index.js` から読み、各ファイルの `default` を見る）。

`.local` の過去問PDF（*_qs.pdf）は開かない。市販の参考書・解説サイトは根拠にしない。

## やること
担当単元の**すべての**問題・図・教材（`lesson:Uxx`）について、1件ずつ判定する。
- 公的機関・規格団体・IPA などの資料を WebFetch で開いて、事実を確かめる。同じ資料は使い回してよい（単元ごとに1〜数個で足りることが多い）。
- 開けなかった資料、存在を確かめられなかった資料は使わない。URLを推測で書かない。
- 計算・トレース・SQL の問題は node で計算・実行して答えを確かめる。
- 正解が1つに決まらない・紛らわしい選択肢・解説の誤りは、直せるなら `patch` で直してから `verified`。直した内容も資料と照合する。
- 資料で確かめられなければ `needs_review`、誤りで直せなければ `suspended`。`note` に理由を短く書く。
- 教材（lesson）は本文・用語・具体例・補足・要点に誤りがないかを見る。誤りがある部分は `patch` に、その欄（例 `terms`）の**直した後の全体**を入れる。
- 図は、ラベル・順序・矢印の向き・数値が正しいか、誤解を招かないかを見る。直すなら `patch` に直した欄の全体を入れる。

## 出力
`src/data/verify/raw/<担当名>.json`（担当名はプロンプトで指定）。形：

```json
{
  "range": "U23-U33",
  "verifier": "照合担当C（作成とは別のAI）",
  "checkedAt": "2026-11-06",
  "sources": [
    { "key": "S1", "name": "資料名", "publisher": "発行元", "url": "https://…（実際に開いたURL）", "where": "章・節・条・ページ", "published": "資料に書かれた日付 or 記載なし", "checked": "2026-11-06" }
  ],
  "items": {
    "U23-q01": { "status": "verified", "sourceIds": ["SRC-001", "S1"], "note": "" },
    "U23-q02": { "status": "verified", "sourceIds": ["SRC-001", "S2"], "note": "選択肢ウが正しいとも読めたため修正", "patch": { "choices": ["…", "…", "…", "…"], "why": ["…", "…", "…", "…"] } },
    "lesson:U23": { "status": "verified", "sourceIds": ["SRC-001", "S1"] },
    "U23-f1": { "status": "needs_review", "sourceIds": ["SRC-001"], "note": "手順の順序を資料で確認できなかった" }
  }
}
```

- `sourceIds` には、シラバス `SRC-001`（範囲）と、事実を確かめた資料のキー（`S1` など。この報告の `sources` の key）を入れる。`verified` にするには、シラバス以外に事実を確かめた資料が少なくとも1つ必要（計算問題は、式や考え方を確かめた資料＋node での再計算）。
- `patch` に入れてよい欄：問題は `q` `choices` `answer` `explain` `why` `tags` `level` `format`、教材は `pages` `terms` `example` `beginner` `points`、図は `title` `caption` `nodes` `rows` `cols` `steps` `root` `children` `dir`。
- 出力後、node でJSONとして読めること、担当範囲の全ID（問題・図・`lesson:Uxx`）が items にそろっていること、patch の choices/why が4つ・answer が0〜3であることを確かめる。

## 報告
件数（verified / needs_review / suspended / patch あり）、主な修正、使った資料の数、確かめきれなかった点を短く。
