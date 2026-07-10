# TODO_GOALS.md — 述語(predicate)がまだ作れないゴール

原則: 存在しないテストを偽のpassing goalにしない。
ここに挙げたゴールは「先にテスト/計測手段を作る」ことが前提条件。

## Needs Predicate

### parser-regression-suite
- 内容: 実スクショのfixtureに対して解析結果(日付/売上/件数/時間)が期待値と一致する
- 作れない理由: この開発環境からOpenAI APIに到達できない(proxyが403)。fixtureとexpected JSONの仕組み自体も未作成
- 前提条件: `add-parser-fixture` skillでfixture+期待値を貯める → Vercel/ローカル(オーナー環境)で回すスクリプトを作る
- 暫定の代替: parse_logs(Supabase)を人間が目視レビュー

### share-card-visual-check
- 内容: OG画像が1200x630で描画され、売上/距離/RANKが崩れず表示される
- 作れない理由: 画像のスナップショットテスト基盤が未導入(新規依存の追加は人間承認が必要)
- 前提条件: 依存追加の承認(例: playwright screenshot比較) or 手動チェックリスト運用の継続

### mobile-layout-no-overflow
- 内容: iPhone幅(390px)で横スクロールが発生しない
- 作れない理由: E2Eテストがpackage.jsonに存在しない(検証はこれまでアドホックなplaywrightスクリプトで実施)
- 前提条件: `write-tests` skillでscripts/e2e/として整備し、`npm test` を定義する

### first-yen-by-0804
- 内容: 2026-08-04までに配達員から1円の先行課金を得る(北極星)
- 作れない理由: 機械述語にできない(Stripe決済の発生は外部イベント)
- 前提条件: W4でStripe Payment Link導入後、人間が支払い通知を確認して手動で記録する
