// ITパスポート試験 シラバスの学習単元（自動生成：tools/ からではなく、公式PDFの目次と見出しを元に作成）
// 出典：IPA「ITパスポート試験」シラバス Ver.6.5（2026年1月8日掲載）
// https://www.ipa.go.jp/shiken/syllabus/gaiyou.html
// 構成：分野 → 大分類 → 中分類 → 小分類（=本アプリの「単元」63個）→ 項目（シラバスの (1)(2)… 180個）
// weight（重要度 1〜3）は本アプリ独自の学習計画用の目安で、IPAの公表値ではありません。
// シラバスが改訂されたら、このファイルを差し替えてください（項目を勝手に削除しないこと）。
export const SYLLABUS_INFO = {
  name: 'ITパスポート試験 シラバス',
  version: 'Ver.6.5',
  published: '2026-01-08',
  checkedAt: '2026-11-05',
  url: 'https://www.ipa.go.jp/shiken/syllabus/gaiyou.html',
  pdf: 'https://www.ipa.go.jp/shiken/syllabus/omgdg50000005kn1-att/syllabus_ip_ver6_5.pdf',
  note: 'Ver.6.5は用語例の追加・見直し（下請法→中小受託取引適正化法など）。単元・項目の構成はPDFの目次・見出しと照合済み。',
};
export const FIELDS = [
  { id: 'S', name: 'ストラテジ系', area: '経営の大陸', color: '#e07a3f', examShare: 35 },
  { id: 'M', name: 'マネジメント系', area: '管理の大陸', color: '#3f8fe0', examShare: 20 },
  { id: 'T', name: 'テクノロジ系', area: '技術の大陸', color: '#3fb27f', examShare: 45 },
];
export const UNITS = [
 {
  "id": "U01",
  "no": 1,
  "field": "S",
  "dai": 1,
  "daiName": "企業と法務",
  "chu": 1,
  "chuName": "企業活動",
  "name": "経営・組織論",
  "weight": 3,
  "items": [
   {
    "id": "U01-1",
    "no": 1,
    "name": "企業活動と経営資源"
   },
   {
    "id": "U01-2",
    "no": 2,
    "name": "経営管理"
   },
   {
    "id": "U01-3",
    "no": 3,
    "name": "経営組織"
   },
   {
    "id": "U01-4",
    "no": 4,
    "name": "社会における IT 利活用の動向"
   }
  ]
 },
 {
  "id": "U02",
  "no": 2,
  "field": "S",
  "dai": 1,
  "daiName": "企業と法務",
  "chu": 1,
  "chuName": "企業活動",
  "name": "業務分析・データ利活用",
  "weight": 3,
  "items": [
   {
    "id": "U02-1",
    "no": 1,
    "name": "業務の把握"
   },
   {
    "id": "U02-2",
    "no": 2,
    "name": "業務分析と業務計画"
   },
   {
    "id": "U02-3",
    "no": 3,
    "name": "データ利活用"
   },
   {
    "id": "U02-4",
    "no": 4,
    "name": "意思決定"
   },
   {
    "id": "U02-5",
    "no": 5,
    "name": "問題解決手法"
   }
  ]
 },
 {
  "id": "U03",
  "no": 3,
  "field": "S",
  "dai": 1,
  "daiName": "企業と法務",
  "chu": 1,
  "chuName": "企業活動",
  "name": "会計・財務",
  "weight": 3,
  "items": [
   {
    "id": "U03-1",
    "no": 1,
    "name": "会計と財務"
   }
  ]
 },
 {
  "id": "U04",
  "no": 4,
  "field": "S",
  "dai": 1,
  "daiName": "企業と法務",
  "chu": 2,
  "chuName": "法務",
  "name": "知的財産権",
  "weight": 3,
  "items": [
   {
    "id": "U04-1",
    "no": 1,
    "name": "著作権法"
   },
   {
    "id": "U04-2",
    "no": 2,
    "name": "産業財産権関連法規"
   },
   {
    "id": "U04-3",
    "no": 3,
    "name": "不正競争防止法"
   },
   {
    "id": "U04-4",
    "no": 4,
    "name": "ソフトウェアライセンス"
   },
   {
    "id": "U04-5",
    "no": 5,
    "name": "その他の権利"
   }
  ]
 },
 {
  "id": "U05",
  "no": 5,
  "field": "S",
  "dai": 1,
  "daiName": "企業と法務",
  "chu": 2,
  "chuName": "法務",
  "name": "セキュリティ関連法規",
  "weight": 3,
  "items": [
   {
    "id": "U05-1",
    "no": 1,
    "name": "サイバーセキュリティ基本法"
   },
   {
    "id": "U05-2",
    "no": 2,
    "name": "不正アクセス行為の禁止等に関する法律"
   },
   {
    "id": "U05-3",
    "no": 3,
    "name": "個人情報保護法（個人情報の保護に関する法律）"
   },
   {
    "id": "U05-4",
    "no": 4,
    "name": "パーソナルデータの保護に関する国際的な動向"
   },
   {
    "id": "U05-5",
    "no": 5,
    "name": "その他の情報セキュリティ関連法規"
   }
  ]
 },
 {
  "id": "U06",
  "no": 6,
  "field": "S",
  "dai": 1,
  "daiName": "企業と法務",
  "chu": 2,
  "chuName": "法務",
  "name": "労働関連・取引関連法規",
  "weight": 3,
  "items": [
   {
    "id": "U06-1",
    "no": 1,
    "name": "労働関連法規"
   },
   {
    "id": "U06-2",
    "no": 2,
    "name": "取引関連法規"
   }
  ]
 },
 {
  "id": "U07",
  "no": 7,
  "field": "S",
  "dai": 1,
  "daiName": "企業と法務",
  "chu": 2,
  "chuName": "法務",
  "name": "その他の法律・ガイドライン・情報倫理",
  "weight": 3,
  "items": [
   {
    "id": "U07-1",
    "no": 1,
    "name": "コンプライアンス"
   },
   {
    "id": "U07-2",
    "no": 2,
    "name": "情報倫理"
   },
   {
    "id": "U07-3",
    "no": 3,
    "name": "コーポレートガバナンス"
   },
   {
    "id": "U07-4",
    "no": 4,
    "name": "行政機関への情報開示請求"
   },
   {
    "id": "U07-5",
    "no": 5,
    "name": "環境関連法"
   }
  ]
 },
 {
  "id": "U08",
  "no": 8,
  "field": "S",
  "dai": 1,
  "daiName": "企業と法務",
  "chu": 2,
  "chuName": "法務",
  "name": "標準化関連",
  "weight": 1,
  "items": [
   {
    "id": "U08-1",
    "no": 1,
    "name": "標準化"
   },
   {
    "id": "U08-2",
    "no": 2,
    "name": "IT における標準化の例"
   },
   {
    "id": "U08-3",
    "no": 3,
    "name": "標準化団体と規格"
   }
  ]
 },
 {
  "id": "U09",
  "no": 9,
  "field": "S",
  "dai": 2,
  "daiName": "経営戦略",
  "chu": 3,
  "chuName": "経営戦略マネジメント",
  "name": "経営戦略手法",
  "weight": 3,
  "items": [
   {
    "id": "U09-1",
    "no": 1,
    "name": "経営情報分析手法"
   },
   {
    "id": "U09-2",
    "no": 2,
    "name": "経営戦略に関する用語"
   }
  ]
 },
 {
  "id": "U10",
  "no": 10,
  "field": "S",
  "dai": 2,
  "daiName": "経営戦略",
  "chu": 3,
  "chuName": "経営戦略マネジメント",
  "name": "マーケティング",
  "weight": 3,
  "items": [
   {
    "id": "U10-1",
    "no": 1,
    "name": "マーケティングの基礎"
   },
   {
    "id": "U10-2",
    "no": 2,
    "name": "マーケティング手法"
   },
   {
    "id": "U10-3",
    "no": 3,
    "name": "Web マーケティング"
   },
   {
    "id": "U10-4",
    "no": 4,
    "name": "価格設定手法"
   }
  ]
 },
 {
  "id": "U11",
  "no": 11,
  "field": "S",
  "dai": 2,
  "daiName": "経営戦略",
  "chu": 3,
  "chuName": "経営戦略マネジメント",
  "name": "ビジネス戦略と目標・評価",
  "weight": 2,
  "items": [
   {
    "id": "U11-1",
    "no": 1,
    "name": "ビジネス戦略立案及び評価のための情報分析手法・目標設定手法"
   }
  ]
 },
 {
  "id": "U12",
  "no": 12,
  "field": "S",
  "dai": 2,
  "daiName": "経営戦略",
  "chu": 3,
  "chuName": "経営戦略マネジメント",
  "name": "経営管理システム",
  "weight": 2,
  "items": [
   {
    "id": "U12-1",
    "no": 1,
    "name": "経営管理システム"
   }
  ]
 },
 {
  "id": "U13",
  "no": 13,
  "field": "S",
  "dai": 2,
  "daiName": "経営戦略",
  "chu": 4,
  "chuName": "技術戦略マネジメント",
  "name": "技術開発戦略の立案・技術開発計画",
  "weight": 1,
  "items": [
   {
    "id": "U13-1",
    "no": 1,
    "name": "技術開発戦略・技術開発計画"
   }
  ]
 },
 {
  "id": "U14",
  "no": 14,
  "field": "S",
  "dai": 2,
  "daiName": "経営戦略",
  "chu": 5,
  "chuName": "ビジネスインダストリ",
  "name": "ビジネスシステム",
  "weight": 2,
  "items": [
   {
    "id": "U14-1",
    "no": 1,
    "name": "代表的なビジネス分野におけるシステム"
   },
   {
    "id": "U14-2",
    "no": 2,
    "name": "行政分野におけるシステム"
   },
   {
    "id": "U14-3",
    "no": 3,
    "name": "代表的なソフトウェアパッケージ"
   },
   {
    "id": "U14-4",
    "no": 4,
    "name": "AI（Artificial Intelligence：人工知能）の利活用"
   }
  ]
 },
 {
  "id": "U15",
  "no": 15,
  "field": "S",
  "dai": 2,
  "daiName": "経営戦略",
  "chu": 5,
  "chuName": "ビジネスインダストリ",
  "name": "エンジニアリングシステム",
  "weight": 1,
  "items": [
   {
    "id": "U15-1",
    "no": 1,
    "name": "エンジニアリング分野における IT 活用"
   },
   {
    "id": "U15-2",
    "no": 2,
    "name": "代表的なエンジニアリングシステム"
   }
  ]
 },
 {
  "id": "U16",
  "no": 16,
  "field": "S",
  "dai": 2,
  "daiName": "経営戦略",
  "chu": 5,
  "chuName": "ビジネスインダストリ",
  "name": "e-ビジネス",
  "weight": 3,
  "items": [
   {
    "id": "U16-1",
    "no": 1,
    "name": "電子商取引"
   },
   {
    "id": "U16-2",
    "no": 2,
    "name": "電子商取引の留意点"
   }
  ]
 },
 {
  "id": "U17",
  "no": 17,
  "field": "S",
  "dai": 2,
  "daiName": "経営戦略",
  "chu": 5,
  "chuName": "ビジネスインダストリ",
  "name": "IoT システム・組込みシステム",
  "weight": 2,
  "items": [
   {
    "id": "U17-1",
    "no": 1,
    "name": "IoT を利用したシステム"
   },
   {
    "id": "U17-2",
    "no": 2,
    "name": "組込みシステム"
   }
  ]
 },
 {
  "id": "U18",
  "no": 18,
  "field": "S",
  "dai": 3,
  "daiName": "システム戦略",
  "chu": 6,
  "chuName": "システム戦略",
  "name": "情報システム戦略",
  "weight": 2,
  "items": [
   {
    "id": "U18-1",
    "no": 1,
    "name": "情報システム戦略"
   },
   {
    "id": "U18-2",
    "no": 2,
    "name": "戦略目標"
   }
  ]
 },
 {
  "id": "U19",
  "no": 19,
  "field": "S",
  "dai": 3,
  "daiName": "システム戦略",
  "chu": 6,
  "chuName": "システム戦略",
  "name": "業務プロセス",
  "weight": 3,
  "items": [
   {
    "id": "U19-1",
    "no": 1,
    "name": "業務プロセス"
   },
   {
    "id": "U19-2",
    "no": 2,
    "name": "業務改善及び問題解決"
   },
   {
    "id": "U19-3",
    "no": 3,
    "name": "IT の有効活用"
   }
  ]
 },
 {
  "id": "U20",
  "no": 20,
  "field": "S",
  "dai": 3,
  "daiName": "システム戦略",
  "chu": 6,
  "chuName": "システム戦略",
  "name": "ソリューションビジネス",
  "weight": 2,
  "items": [
   {
    "id": "U20-1",
    "no": 1,
    "name": "ソリューションとは"
   },
   {
    "id": "U20-2",
    "no": 2,
    "name": "ソリューションの形態"
   }
  ]
 },
 {
  "id": "U21",
  "no": 21,
  "field": "S",
  "dai": 3,
  "daiName": "システム戦略",
  "chu": 6,
  "chuName": "システム戦略",
  "name": "システム活用促進・評価",
  "weight": 2,
  "items": [
   {
    "id": "U21-1",
    "no": 1,
    "name": "デジタルリテラシー"
   },
   {
    "id": "U21-2",
    "no": 2,
    "name": "普及啓発"
   },
   {
    "id": "U21-3",
    "no": 3,
    "name": "情報システム利用実態の評価・検証"
   }
  ]
 },
 {
  "id": "U22",
  "no": 22,
  "field": "S",
  "dai": 3,
  "daiName": "システム戦略",
  "chu": 7,
  "chuName": "システム企画",
  "name": "システム化計画",
  "weight": 2,
  "items": [
   {
    "id": "U22-1",
    "no": 1,
    "name": "システム化計画"
   }
  ]
 },
 {
  "id": "U23",
  "no": 23,
  "field": "S",
  "dai": 3,
  "daiName": "システム戦略",
  "chu": 7,
  "chuName": "システム企画",
  "name": "要件定義",
  "weight": 2,
  "items": [
   {
    "id": "U23-1",
    "no": 1,
    "name": "業務要件定義"
   }
  ]
 },
 {
  "id": "U24",
  "no": 24,
  "field": "S",
  "dai": 3,
  "daiName": "システム戦略",
  "chu": 7,
  "chuName": "システム企画",
  "name": "調達計画・実施",
  "weight": 2,
  "items": [
   {
    "id": "U24-1",
    "no": 1,
    "name": "調達の流れ"
   },
   {
    "id": "U24-2",
    "no": 2,
    "name": "情報提供依頼"
   },
   {
    "id": "U24-3",
    "no": 3,
    "name": "提案依頼書"
   },
   {
    "id": "U24-4",
    "no": 4,
    "name": "提案書"
   },
   {
    "id": "U24-5",
    "no": 5,
    "name": "見積書"
   }
  ]
 },
 {
  "id": "U25",
  "no": 25,
  "field": "M",
  "dai": 4,
  "daiName": "開発技術",
  "chu": 8,
  "chuName": "システム開発技術",
  "name": "システム開発技術",
  "weight": 2,
  "items": [
   {
    "id": "U25-1",
    "no": 1,
    "name": "システム開発のプロセス"
   },
   {
    "id": "U25-2",
    "no": 2,
    "name": "ソフトウェアの見積り"
   }
  ]
 },
 {
  "id": "U26",
  "no": 26,
  "field": "M",
  "dai": 4,
  "daiName": "開発技術",
  "chu": 9,
  "chuName": "ソフトウェア開発管理技術",
  "name": "開発プロセス・手法",
  "weight": 3,
  "items": [
   {
    "id": "U26-1",
    "no": 1,
    "name": "主なソフトウェア開発手法"
   },
   {
    "id": "U26-2",
    "no": 2,
    "name": "主なソフトウェア開発モデル"
   },
   {
    "id": "U26-3",
    "no": 3,
    "name": "アジャイル"
   },
   {
    "id": "U26-4",
    "no": 4,
    "name": "開発プロセスに関するフレームワーク"
   }
  ]
 },
 {
  "id": "U27",
  "no": 27,
  "field": "M",
  "dai": 5,
  "daiName": "プロジェクトマネジメント",
  "chu": 10,
  "chuName": "プロジェクトマネジメント",
  "name": "プロジェクトマネジメント",
  "weight": 3,
  "items": [
   {
    "id": "U27-1",
    "no": 1,
    "name": "プロジェクトマネジメント"
   }
  ]
 },
 {
  "id": "U28",
  "no": 28,
  "field": "M",
  "dai": 6,
  "daiName": "サービスマネジメント",
  "chu": 11,
  "chuName": "サービスマネジメント",
  "name": "サービスマネジメント",
  "weight": 3,
  "items": [
   {
    "id": "U28-1",
    "no": 1,
    "name": "サービスマネジメント"
   },
   {
    "id": "U28-2",
    "no": 2,
    "name": "ITIL"
   },
   {
    "id": "U28-3",
    "no": 3,
    "name": "サービスレベル合意書"
   }
  ]
 },
 {
  "id": "U29",
  "no": 29,
  "field": "M",
  "dai": 6,
  "daiName": "サービスマネジメント",
  "chu": 11,
  "chuName": "サービスマネジメント",
  "name": "サービスマネジメントシステム",
  "weight": 2,
  "items": [
   {
    "id": "U29-1",
    "no": 1,
    "name": "サービスマネジメントシステムの概要"
   },
   {
    "id": "U29-2",
    "no": 2,
    "name": "サービスデスク（ヘルプデスク）"
   }
  ]
 },
 {
  "id": "U30",
  "no": 30,
  "field": "M",
  "dai": 6,
  "daiName": "サービスマネジメント",
  "chu": 11,
  "chuName": "サービスマネジメント",
  "name": "ファシリティマネジメント",
  "weight": 1,
  "items": [
   {
    "id": "U30-1",
    "no": 1,
    "name": "システム環境整備"
   },
   {
    "id": "U30-2",
    "no": 2,
    "name": "ファシリティマネジメント"
   }
  ]
 },
 {
  "id": "U31",
  "no": 31,
  "field": "M",
  "dai": 6,
  "daiName": "サービスマネジメント",
  "chu": 12,
  "chuName": "システム監査",
  "name": "システム監査",
  "weight": 3,
  "items": [
   {
    "id": "U31-1",
    "no": 1,
    "name": "監査業務"
   },
   {
    "id": "U31-2",
    "no": 2,
    "name": "システム監査"
   }
  ]
 },
 {
  "id": "U32",
  "no": 32,
  "field": "M",
  "dai": 6,
  "daiName": "サービスマネジメント",
  "chu": 12,
  "chuName": "システム監査",
  "name": "内部統制",
  "weight": 3,
  "items": [
   {
    "id": "U32-1",
    "no": 1,
    "name": "内部統制"
   },
   {
    "id": "U32-2",
    "no": 2,
    "name": "IT ガバナンス"
   },
   {
    "id": "U32-3",
    "no": 3,
    "name": "IT マネジメント"
   }
  ]
 },
 {
  "id": "U33",
  "no": 33,
  "field": "T",
  "dai": 7,
  "daiName": "基礎理論",
  "chu": 13,
  "chuName": "基礎理論",
  "name": "離散数学",
  "weight": 2,
  "items": [
   {
    "id": "U33-1",
    "no": 1,
    "name": "数と表現"
   },
   {
    "id": "U33-2",
    "no": 2,
    "name": "集合"
   },
   {
    "id": "U33-3",
    "no": 3,
    "name": "論理演算"
   }
  ]
 },
 {
  "id": "U34",
  "no": 34,
  "field": "T",
  "dai": 7,
  "daiName": "基礎理論",
  "chu": 13,
  "chuName": "基礎理論",
  "name": "応用数学",
  "weight": 2,
  "items": [
   {
    "id": "U34-1",
    "no": 1,
    "name": "確率と統計"
   },
   {
    "id": "U34-2",
    "no": 2,
    "name": "数値計算，数値解析，数式処理"
   },
   {
    "id": "U34-3",
    "no": 3,
    "name": "グラフ理論"
   },
   {
    "id": "U34-4",
    "no": 4,
    "name": "待ち行列"
   },
   {
    "id": "U34-5",
    "no": 5,
    "name": "最適化問題"
   }
  ]
 },
 {
  "id": "U35",
  "no": 35,
  "field": "T",
  "dai": 7,
  "daiName": "基礎理論",
  "chu": 13,
  "chuName": "基礎理論",
  "name": "情報に関する理論",
  "weight": 3,
  "items": [
   {
    "id": "U35-1",
    "no": 1,
    "name": "情報量の単位"
   },
   {
    "id": "U35-2",
    "no": 2,
    "name": "デジタル化"
   },
   {
    "id": "U35-3",
    "no": 3,
    "name": "文字の表現"
   },
   {
    "id": "U35-4",
    "no": 4,
    "name": "論理的な記述"
   },
   {
    "id": "U35-5",
    "no": 5,
    "name": "AI（Artificial Intelligence：人工知能）の技術"
   }
  ]
 },
 {
  "id": "U36",
  "no": 36,
  "field": "T",
  "dai": 7,
  "daiName": "基礎理論",
  "chu": 14,
  "chuName": "アルゴリズムとプログラミング",
  "name": "データ構造",
  "weight": 2,
  "items": [
   {
    "id": "U36-1",
    "no": 1,
    "name": "データ及びデータ構造"
   }
  ]
 },
 {
  "id": "U37",
  "no": 37,
  "field": "T",
  "dai": 7,
  "daiName": "基礎理論",
  "chu": 14,
  "chuName": "アルゴリズムとプログラミング",
  "name": "アルゴリズムとプログラミング",
  "weight": 3,
  "items": [
   {
    "id": "U37-1",
    "no": 1,
    "name": "アルゴリズムの基本構造"
   },
   {
    "id": "U37-2",
    "no": 2,
    "name": "アルゴリズムの表現方法"
   },
   {
    "id": "U37-3",
    "no": 3,
    "name": "代表的なアルゴリズム"
   },
   {
    "id": "U37-4",
    "no": 4,
    "name": "プログラミング"
   }
  ]
 },
 {
  "id": "U38",
  "no": 38,
  "field": "T",
  "dai": 7,
  "daiName": "基礎理論",
  "chu": 14,
  "chuName": "アルゴリズムとプログラミング",
  "name": "プログラム言語",
  "weight": 2,
  "items": [
   {
    "id": "U38-1",
    "no": 1,
    "name": "プログラム言語"
   },
   {
    "id": "U38-2",
    "no": 2,
    "name": "コーディング標準やプログラム構造"
   }
  ]
 },
 {
  "id": "U39",
  "no": 39,
  "field": "T",
  "dai": 7,
  "daiName": "基礎理論",
  "chu": 14,
  "chuName": "アルゴリズムとプログラミング",
  "name": "その他の言語",
  "weight": 1,
  "items": [
   {
    "id": "U39-1",
    "no": 1,
    "name": "マークアップ言語"
   },
   {
    "id": "U39-2",
    "no": 2,
    "name": "その他の言語"
   }
  ]
 },
 {
  "id": "U40",
  "no": 40,
  "field": "T",
  "dai": 8,
  "daiName": "コンピュータシステム",
  "chu": 15,
  "chuName": "コンピュータ構成要素",
  "name": "プロセッサ",
  "weight": 2,
  "items": [
   {
    "id": "U40-1",
    "no": 1,
    "name": "コンピュータの構成"
   },
   {
    "id": "U40-2",
    "no": 2,
    "name": "プロセッサの基本的な仕組み"
   }
  ]
 },
 {
  "id": "U41",
  "no": 41,
  "field": "T",
  "dai": 8,
  "daiName": "コンピュータシステム",
  "chu": 15,
  "chuName": "コンピュータ構成要素",
  "name": "メモリ",
  "weight": 2,
  "items": [
   {
    "id": "U41-1",
    "no": 1,
    "name": "メモリの種類と特徴"
   },
   {
    "id": "U41-2",
    "no": 2,
    "name": "記録媒体の種類と特徴"
   },
   {
    "id": "U41-3",
    "no": 3,
    "name": "記憶階層"
   }
  ]
 },
 {
  "id": "U42",
  "no": 42,
  "field": "T",
  "dai": 8,
  "daiName": "コンピュータシステム",
  "chu": 15,
  "chuName": "コンピュータ構成要素",
  "name": "入出力デバイス",
  "weight": 2,
  "items": [
   {
    "id": "U42-1",
    "no": 1,
    "name": "入出力インタフェース"
   },
   {
    "id": "U42-2",
    "no": 2,
    "name": "IoT デバイス"
   },
   {
    "id": "U42-3",
    "no": 3,
    "name": "デバイスドライバ"
   }
  ]
 },
 {
  "id": "U43",
  "no": 43,
  "field": "T",
  "dai": 8,
  "daiName": "コンピュータシステム",
  "chu": 16,
  "chuName": "システム構成要素",
  "name": "システムの構成",
  "weight": 2,
  "items": [
   {
    "id": "U43-1",
    "no": 1,
    "name": "処理形態"
   },
   {
    "id": "U43-2",
    "no": 2,
    "name": "システム構成"
   },
   {
    "id": "U43-3",
    "no": 3,
    "name": "利用形態"
   }
  ]
 },
 {
  "id": "U44",
  "no": 44,
  "field": "T",
  "dai": 8,
  "daiName": "コンピュータシステム",
  "chu": 16,
  "chuName": "システム構成要素",
  "name": "システムの評価指標",
  "weight": 3,
  "items": [
   {
    "id": "U44-1",
    "no": 1,
    "name": "システムの性能"
   },
   {
    "id": "U44-2",
    "no": 2,
    "name": "システムの信頼性"
   },
   {
    "id": "U44-3",
    "no": 3,
    "name": "システムの経済性"
   }
  ]
 },
 {
  "id": "U45",
  "no": 45,
  "field": "T",
  "dai": 8,
  "daiName": "コンピュータシステム",
  "chu": 17,
  "chuName": "ソフトウェア",
  "name": "オペレーティングシステム",
  "weight": 2,
  "items": [
   {
    "id": "U45-1",
    "no": 1,
    "name": "OS の必要性"
   },
   {
    "id": "U45-2",
    "no": 2,
    "name": "OS の機能"
   },
   {
    "id": "U45-3",
    "no": 3,
    "name": "OS の種類"
   }
  ]
 },
 {
  "id": "U46",
  "no": 46,
  "field": "T",
  "dai": 8,
  "daiName": "コンピュータシステム",
  "chu": 17,
  "chuName": "ソフトウェア",
  "name": "ファイルシステム",
  "weight": 2,
  "items": [
   {
    "id": "U46-1",
    "no": 1,
    "name": "ファイル管理"
   },
   {
    "id": "U46-2",
    "no": 2,
    "name": "バックアップ"
   }
  ]
 },
 {
  "id": "U47",
  "no": 47,
  "field": "T",
  "dai": 8,
  "daiName": "コンピュータシステム",
  "chu": 17,
  "chuName": "ソフトウェア",
  "name": "オフィスツール",
  "weight": 1,
  "items": [
   {
    "id": "U47-1",
    "no": 1,
    "name": "ソフトウェアパッケージ"
   },
   {
    "id": "U47-2",
    "no": 2,
    "name": "文書作成ソフト"
   },
   {
    "id": "U47-3",
    "no": 3,
    "name": "表計算ソフト"
   },
   {
    "id": "U47-4",
    "no": 4,
    "name": "プレゼンテーションソフト"
   },
   {
    "id": "U47-5",
    "no": 5,
    "name": "Web ブラウザ"
   }
  ]
 },
 {
  "id": "U48",
  "no": 48,
  "field": "T",
  "dai": 8,
  "daiName": "コンピュータシステム",
  "chu": 17,
  "chuName": "ソフトウェア",
  "name": "オープンソースソフトウェア",
  "weight": 1,
  "items": [
   {
    "id": "U48-1",
    "no": 1,
    "name": "オープンソースソフトウェア"
   }
  ]
 },
 {
  "id": "U49",
  "no": 49,
  "field": "T",
  "dai": 8,
  "daiName": "コンピュータシステム",
  "chu": 18,
  "chuName": "ハードウェア",
  "name": "ハードウェア（コンピュータ・入出力装置）",
  "weight": 2,
  "items": [
   {
    "id": "U49-1",
    "no": 1,
    "name": "コンピュータ"
   },
   {
    "id": "U49-2",
    "no": 2,
    "name": "入出力装置"
   }
  ]
 },
 {
  "id": "U50",
  "no": 50,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 19,
  "chuName": "情報デザイン",
  "name": "情報デザイン",
  "weight": 1,
  "items": [
   {
    "id": "U50-1",
    "no": 1,
    "name": "情報デザインの考え方や手法"
   },
   {
    "id": "U50-2",
    "no": 2,
    "name": "ユニバーサルデザイン"
   }
  ]
 },
 {
  "id": "U51",
  "no": 51,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 19,
  "chuName": "情報デザイン",
  "name": "インタフェース設計",
  "weight": 2,
  "items": [
   {
    "id": "U51-1",
    "no": 1,
    "name": "ヒューマンインタフェース"
   },
   {
    "id": "U51-2",
    "no": 2,
    "name": "GUI"
   },
   {
    "id": "U51-3",
    "no": 3,
    "name": "画面設計・帳票設計"
   },
   {
    "id": "U51-4",
    "no": 4,
    "name": "Web デザイン"
   },
   {
    "id": "U51-5",
    "no": 5,
    "name": "人間中心設計"
   }
  ]
 },
 {
  "id": "U52",
  "no": 52,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 20,
  "chuName": "情報メディア",
  "name": "マルチメディア技術",
  "weight": 2,
  "items": [
   {
    "id": "U52-1",
    "no": 1,
    "name": "マルチメディア"
   },
   {
    "id": "U52-2",
    "no": 2,
    "name": "音声処理"
   },
   {
    "id": "U52-3",
    "no": 3,
    "name": "静止画処理"
   },
   {
    "id": "U52-4",
    "no": 4,
    "name": "動画処理"
   },
   {
    "id": "U52-5",
    "no": 5,
    "name": "情報の圧縮と伸長"
   }
  ]
 },
 {
  "id": "U53",
  "no": 53,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 20,
  "chuName": "情報メディア",
  "name": "マルチメディア応用",
  "weight": 1,
  "items": [
   {
    "id": "U53-1",
    "no": 1,
    "name": "グラフィックス処理"
   },
   {
    "id": "U53-2",
    "no": 2,
    "name": "マルチメディア技術の応用"
   }
  ]
 },
 {
  "id": "U54",
  "no": 54,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 21,
  "chuName": "データベース",
  "name": "データベース方式",
  "weight": 3,
  "items": [
   {
    "id": "U54-1",
    "no": 1,
    "name": "データベース"
   },
   {
    "id": "U54-2",
    "no": 2,
    "name": "データベース管理システム"
   }
  ]
 },
 {
  "id": "U55",
  "no": 55,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 21,
  "chuName": "データベース",
  "name": "データベース設計",
  "weight": 3,
  "items": [
   {
    "id": "U55-1",
    "no": 1,
    "name": "データ分析"
   },
   {
    "id": "U55-2",
    "no": 2,
    "name": "データの設計"
   },
   {
    "id": "U55-3",
    "no": 3,
    "name": "データの正規化"
   }
  ]
 },
 {
  "id": "U56",
  "no": 56,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 21,
  "chuName": "データベース",
  "name": "データ操作",
  "weight": 3,
  "items": [
   {
    "id": "U56-1",
    "no": 1,
    "name": "データ操作"
   }
  ]
 },
 {
  "id": "U57",
  "no": 57,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 21,
  "chuName": "データベース",
  "name": "トランザクション処理",
  "weight": 3,
  "items": [
   {
    "id": "U57-1",
    "no": 1,
    "name": "同時実行制御（排他制御）"
   },
   {
    "id": "U57-2",
    "no": 2,
    "name": "障害回復"
   }
  ]
 },
 {
  "id": "U58",
  "no": 58,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 22,
  "chuName": "ネットワーク",
  "name": "ネットワーク方式",
  "weight": 3,
  "items": [
   {
    "id": "U58-1",
    "no": 1,
    "name": "ネットワークの構成"
   },
   {
    "id": "U58-2",
    "no": 2,
    "name": "ネットワークの構成要素"
   },
   {
    "id": "U58-3",
    "no": 3,
    "name": "IoT ネットワークの構成要素"
   }
  ]
 },
 {
  "id": "U59",
  "no": 59,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 22,
  "chuName": "ネットワーク",
  "name": "通信プロトコル",
  "weight": 3,
  "items": [
   {
    "id": "U59-1",
    "no": 1,
    "name": "代表的なネットワークアーキテクチャ"
   },
   {
    "id": "U59-2",
    "no": 2,
    "name": "通信プロトコル"
   }
  ]
 },
 {
  "id": "U60",
  "no": 60,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 22,
  "chuName": "ネットワーク",
  "name": "ネットワーク応用",
  "weight": 3,
  "items": [
   {
    "id": "U60-1",
    "no": 1,
    "name": "インターネットの仕組み"
   },
   {
    "id": "U60-2",
    "no": 2,
    "name": "インターネットサービス"
   },
   {
    "id": "U60-3",
    "no": 3,
    "name": "通信サービス"
   }
  ]
 },
 {
  "id": "U61",
  "no": 61,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 23,
  "chuName": "セキュリティ",
  "name": "情報セキュリティ",
  "weight": 3,
  "items": [
   {
    "id": "U61-1",
    "no": 1,
    "name": "情報セキュリティの概念"
   },
   {
    "id": "U61-2",
    "no": 2,
    "name": "情報資産"
   },
   {
    "id": "U61-3",
    "no": 3,
    "name": "脅威と脆弱性"
   },
   {
    "id": "U61-4",
    "no": 4,
    "name": "攻撃手法"
   }
  ]
 },
 {
  "id": "U62",
  "no": 62,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 23,
  "chuName": "セキュリティ",
  "name": "情報セキュリティ管理",
  "weight": 3,
  "items": [
   {
    "id": "U62-1",
    "no": 1,
    "name": "リスクマネジメント"
   },
   {
    "id": "U62-2",
    "no": 2,
    "name": "情報セキュリティ管理"
   },
   {
    "id": "U62-3",
    "no": 3,
    "name": "個人情報保護"
   },
   {
    "id": "U62-4",
    "no": 4,
    "name": "情報セキュリティ組織・機関"
   },
   {
    "id": "U62-5",
    "no": 5,
    "name": "各種の基準・ガイドライン"
   }
  ]
 },
 {
  "id": "U63",
  "no": 63,
  "field": "T",
  "dai": 9,
  "daiName": "技術要素",
  "chu": 23,
  "chuName": "セキュリティ",
  "name": "情報セキュリティ対策・情報セキュリティ実装技術",
  "weight": 3,
  "items": [
   {
    "id": "U63-1",
    "no": 1,
    "name": "情報セキュリティ対策の種類"
   },
   {
    "id": "U63-2",
    "no": 2,
    "name": "暗号技術"
   },
   {
    "id": "U63-3",
    "no": 3,
    "name": "認証技術"
   },
   {
    "id": "U63-4",
    "no": 4,
    "name": "利用者認証"
   },
   {
    "id": "U63-5",
    "no": 5,
    "name": "生体認証（バイオメトリクス認証）"
   },
   {
    "id": "U63-6",
    "no": 6,
    "name": "公開鍵基盤"
   },
   {
    "id": "U63-7",
    "no": 7,
    "name": "アプリケーションソフトウェア・IoT システムのセキュリティ"
   }
  ]
 }
];
