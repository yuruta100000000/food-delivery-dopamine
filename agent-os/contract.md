# contract.md — 行動範囲の契約(BUILD 2)

目的: AIの blast radius を事前に宣言する。conductorはこのファイルを毎tick読む。

<!-- HUMAN_DECISION_DRAFT: AIが単独実行してよい範囲 -->
## acts alone
AI may act alone on reversible work inside MVP scope, including:
- docs / README / comments の更新
- lint / typecheck error の修正
- テスト追加
- fixture追加
- parser prompt(`prompts/parse-screenshot.ts`)の改善
- 解析失敗ケースの追加
- report / share card / upload flow の小〜中規模改善
- モバイルUIの改善
- 既存コンポーネントの整理
- 既存の型定義・ユーティリティの改善
- 200行未満のMVP範囲内の実装
- 既存技術スタック内でのリファクタ
- issue整理
- user feedback の分類
- X投稿・LP・課金打診に使う文面案の作成(送信はしない)

AI should proceed without asking if:
- the change is reversible,
- the change is inside MVP scope,
- no forbidden system is touched,
- verification can be run.

<!-- HUMAN_DECISION_DRAFT: 人間レビュー必須 -->
## queues for me
- 200行以上の変更
- 400行以上になりそうな変更
- 新しい主要機能の追加
- DB schema変更(supabase/schema.sql 含む)
- Supabase Auth変更
- Supabase Storage方針変更
- Stripe / Payment Link / 課金導線
- 外部API追加
- dependency追加
- production deploy
- ユーザーに見えるコピーの大幅なブランド変更
- スクショ保存・削除ポリシー変更
- 個人情報の扱いに影響する変更
- 既存MVP方針の変更
- 自動実行ループの有効化(cron / auto-PR / auto-merge)

<!-- HUMAN_DECISION_DRAFT: 即停止・即確認 -->
## wakes me up
- secret / API key / token が必要になった
- 本番データ削除リスク
- 個人情報漏洩リスク
- 自動スクレイピングに近づく実装
- 課金・認証・DB・Storageに関わる失敗
- verifyが2回連続で失敗
- daily budget超過
- 8/4の先行課金1円目標から逸れる提案
- maker/checkerが2回対立した
- stop_reason: refusal が同一skillで再発した
