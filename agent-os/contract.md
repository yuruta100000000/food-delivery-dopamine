# contract.md — 行動範囲の契約(BUILD 2 / 2026-07-10 ローンチモード改訂)

目的: AIの blast radius を事前に宣言する。conductorはこのファイルを毎tick読む。

**前提: 機能凍結中(CLAUDE.md「機能凍結」)。**
すべての変更はまず「バグ修正/解析精度/表示崩れ/文言/速度 のどれか?」を自問する。
どれでもなければ、それは機能追加であり、acts aloneの対象外。

<!-- HUMAN_DECISION_DRAFT: AIが単独実行してよい範囲(凍結版) -->
## acts alone
AI may act alone on reversible work inside the frozen surface, including:
- docs / README / comments の更新
- lint / typecheck error の修正
- バグ修正(挙動が明らかに意図と異なるもの)
- テスト追加・fixture追加(既存挙動の固定のみ。仕様の新設はしない)
- parser prompt(`prompts/parse-screenshot.ts`)の精度改善・失敗ケース追加
- 既存画面の表示崩れ修正・文言改善・視認性改善(**新規UI要素・新規メカニクスは追加しない**)
- モバイル実機での崩れ修正
- 既存コンポーネント・型・ユーティリティの整理(挙動同一、前後でverify green)
- パフォーマンス改善(依存追加なしの範囲)
- 200行未満の上記に該当する変更
- issue整理 / user feedback の分類
- X投稿・LP・課金打診に使う文面案の作成(送信はしない)

AI should proceed without asking only if ALL of:
- the change is reversible,
- the change is a bugfix / parse-accuracy / layout-fix / copy / performance change (not a new feature),
- routes-frozen and deps-frozen goals still pass,
- no forbidden system is touched,
- verification can be run.

<!-- HUMAN_DECISION_DRAFT: 人間レビュー必須(凍結版) -->
## queues for me
- **新しいroute / タブ / 画面(routes.allowlistの変更を伴うもの全部)**
- **新しいゲーミフィケーション要素・フィード機能・実績の追加**
- **データモデルの新エンティティ・新カラム**
- タイムラインの実フィード化(W3・オーナー同席)
- 200行以上の変更 / 400行以上になりそうな変更
- DB schema変更(supabase/schema.sql 含む)
- Supabase Auth変更 / Storage方針変更
- Stripe / Payment Link / 課金導線
- 外部API追加 / dependency追加(deps.allowlistの変更を伴うもの全部)
- production deploy
- ユーザーに見えるコピーの大幅なブランド変更
- スクショ保存・削除ポリシー変更 / 個人情報の扱いに影響する変更
- 既存機能の削除(凍結は「増やさない」だけでなく「勝手に減らさない」も含む)
- 既存MVP方針の変更
- 自動実行ループの有効化(cron / auto-PR / auto-merge)

## wakes me up
<!-- HUMAN_DECISION_DRAFT: 即停止・即確認 -->
- secret / API key / token が必要になった
- 本番データ削除リスク
- 個人情報漏洩リスク
- 自動スクレイピングに近づく実装
- 課金・認証・DB・Storageに関わる失敗
- **routes-frozen / deps-frozen の違反を検出した(=誰かが凍結を破った)**
- verifyが2回連続で失敗
- daily budget超過
- 8/4の先行課金1円目標から逸れる提案
- maker/checkerが2回対立した
- stop_reason: refusal が同一skillで再発した
