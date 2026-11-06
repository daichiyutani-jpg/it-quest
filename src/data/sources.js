// 情報源の一覧（学習アプリ共通ルール §2）。教材・問題・図の sourceIds はここのIDを指す。
// 人が読む一覧は docs/SOURCES.md（tools/build-docs.mjs で、このファイルと照合結果から作る）。
// checked は実際にページ・PDFを開いて確認した日。開いていないURLは書かない。
// 照合で新しく使った情報源は src/data/sources-extra.js に追記する（照合担当の報告から作る）。
import EXTRA from './sources-extra.js';

const BASE = [
  {
    id: 'SRC-001',
    name: 'ITパスポート試験 シラバス Ver.6.5',
    publisher: '独立行政法人情報処理推進機構（IPA）',
    url: 'https://www.ipa.go.jp/shiken/syllabus/omgdg50000005kn1-att/syllabus_ip_ver6_5.pdf',
    where: '全体（大分類1〜9・小分類1〜63）',
    published: '2026-01-08（掲載日。改訂履歴では令和8年1月）',
    checked: '2026-11-06',
    status: '照合済み',
    note: 'PDF 66ページ。SHA-256 efa3e85a…c58c0。単元・項目・用語例の照合に使用。',
  },
  {
    id: 'SRC-002',
    name: 'ITパスポート試験 試験内容・出題範囲',
    publisher: 'IPA',
    url: 'https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html',
    where: '試験時間・出題数・出題形式・採点方式・合格基準・分野別出題数',
    published: '記載なし',
    checked: '2026-11-06',
    status: '照合済み',
    note: '120分・100問・四肢択一・IRT・総合600点以上かつ各分野300点以上（各1,000点満点）。2027年度（予定）のシラバス案Ver.0.1（2026-08-31掲載）の案内あり。',
  },
  {
    id: 'SRC-003',
    name: '試験要綱・シラバス（一覧）',
    publisher: 'IPA',
    url: 'https://www.ipa.go.jp/shiken/syllabus/gaiyou.html',
    where: 'ITパスポート試験 シラバス（Ver.6.5）の掲載日',
    published: '最終更新日 2026-07-10',
    checked: '2026-11-06',
    status: '照合済み',
    note: '試験要綱 Ver.5.6（2026-07-06掲載）。Ver.6.5は「下請法」を削除し「中小受託取引適正化法」を追加。',
  },
  {
    id: 'SRC-004',
    name: 'ITパスポート試験 よくある質問（過去問題の使用方法）',
    publisher: 'IPA',
    url: 'https://www3.jitec.ipa.go.jp/JitesCbt/html/reference/faq.html',
    where: '「過去問題の使用方法（申請方法、使用料等）」',
    published: '記載なし',
    checked: '2026-11-06',
    status: '照合済み',
    note: '許諾・使用料は不要、著作権は放棄していない、出典の明記が必要、改変したらその旨を明記。',
  },
  {
    id: 'SRC-005',
    name: 'ITパスポート試験 過去問題（公開問題）',
    publisher: 'IPA',
    url: 'https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html',
    where: '令和5〜8年度 問題冊子・解答例PDF',
    published: '各年度の公開日',
    checked: '2026-11-06',
    status: '照合済み',
    note: '#/past の正答（解答例）と出題数（重要度★）に使用。問題文はアプリに同梱しない。',
  },
  {
    id: 'SRC-006',
    name: '「国民の祝日」について',
    publisher: '内閣府',
    url: 'https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html',
    where: '2026年・2027年の祝日',
    published: '記載なし',
    checked: '2026-11-06',
    status: '照合済み',
    note: '学習計画の土日祝の判定に使用。',
  },
];

export const SOURCES = [...BASE, ...EXTRA];
export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s]));
