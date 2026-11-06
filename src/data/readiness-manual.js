// 学習開始前の品質確認のうち、人（開発側）が実施して記録するもの（共通ルール §16）。
// 実施していない確認を ok にしない。結果の詳細は docs/READINESS.md。
// result: 'ok' | 'ng' | null（未実施）
export default {
  recordedAt: '2026-11-06',
  checks: [
    { id: 'official', label: '公式情報との整合性（シラバス・試験要項を最新版と照合）', date: '2026-11-06', method: 'IPAのシラバスVer.6.5 PDF（SHA-256記録）・試験内容・試験要綱・FAQを取得し、63単元・180項目と試験要項の数値を照合', result: 'ok', note: '2027年度のシラバス案Ver.0.1は案の段階のため未照合（docs/OFFICIAL.md）' },
    { id: 'offline', label: 'オフライン動作（SW登録後に通信を切って全画面を確認）', date: '2026-11-06', method: 'PCのアプリ内ブラウザ（Chromium）でSW登録（61ファイル、照合反映後に62ファイルで再確認）後に開発サーバーを止め、再読み込みしてホーム・マップ・演習・記録・データ・単元・過去問の画面が開くことを確認', result: 'ok', note: 'スマートフォン実機では未確認' },
    { id: 'storage', label: '学習履歴の保存（再読み込み・再起動後も残る）', date: '2026-11-06', method: 'PCのアプリ内ブラウザで小テストを解いた後、サーバー停止・再読み込みしてIndexedDB（schema 2）に回答14件と小テスト記録が残ることを確認', result: 'ok', note: 'iPhoneのSafari（7日間使わないと消える場合がある）は実機未確認。データ画面に注意を表示' },
    { id: 'logic', label: '採点・復習・進捗管理の動作（自動テスト）', date: '2026-11-06', method: 'node --test tests/*.test.mjs（30件すべて成功）', result: 'ok', note: '' },
    { id: 'mobile', label: 'スマートフォンでの表示と操作性', date: null, method: '', result: null, note: 'PCで幅375pxの表示を確認しただけ。実機（iPhone・Android）は未実施' },
  ],
};
