# CLAUDE.md — 配達員向け刺激×記録アプリ(仮称: DeliLog)

## このプロジェクトは何か

フードデリバリー配達員(Uber Eats/出前館/menu/ロケットナウ掛け持ち)向けの、稼働記録・可視化Webアプリ。
「働く人のStrava」。売上画面のスクリーンショットをAIが読み取り、複数社横断のダッシュボードと、X投稿用の美麗なシェアカードを生成する。

**事業上の絶対制約: 2026-08-04までに先行課金で1円の売上を取る。それまでスコープ外の機能追加は一切禁止。**
開発者(オーナー)は過去に「作り込んで売る前に燃え尽きる」失敗を5回している。Claudeはスコープ拡大の提案を求められても、まずこの制約を思い出させること。

## アプリ構成(2026-07-08 オーナー判断でStudyplus型4タブに再設計)

下部ナビ: **タイムライン / 記録する / レポート / マイページ**。
タイムライン(コミュニティ)はPhase 2予定をオーナー判断で前倒し。ただし
**Supabase接続までは「βプレビュー」としてサンプルライダーを表示**し、UI上に
サンプルである旨を必ず明示する(偽のソーシャルプルーフにしない)。
実フィード化・公開プロフィール化はSupabase接続(W3)とセット。

## MVPスコープ(これだけ作る)

1. **スクショ取り込み**: 配達アプリの売上画面のスクショをアップロード → Claude API(vision)で解析 → 日付・プラットフォーム・売上・件数・時間を構造化して保存。解析失敗時は手動修正フォームにフォールバック
2. **ダッシュボード**: 日/週/月の売上推移、プラットフォーム別内訳、時給換算、連続稼働日数、走行距離(手動/スクショ抽出)。モバイルで美しく見えることが最優先
3. **シェアカード**: 「今日の稼働」を1枚の画像に(売上・件数・稼働時間・距離・連続日数・レベル)。Strava風の格好良さ。ワンタップでX投稿導線
4. **刺激レイヤー**(2026-07-07 オーナー判断で追加): 週間目標、レベル・称号(XP=累計売上)、実績解除、記録完了セレブレーション。Duolingo/Studyplusのメカニクスを移植

### スコープ外(触るな)
- ネイティブアプリ化(まずWeb) / 自動スクレイピング・アプリ連携(規約リスク、絶対にやらない) / 経費・確定申告機能(Phase 2) / ランキング・コミュニティ(Phase 2) / 多言語対応
- GPS自動走行距離記録(Phase 2・ネイティブ化とセット。Webはバックグラウンドで位置取得が止まるため成立しない)

## 機能凍結(2026-07-10 オーナー判断・ローンチモード)

**今ある機能面が最終形。初売上まで機能は1つも増やさない。**
現状は既にMVPを超えている(タイムライン前倒し等)。ここからは「増やす」ではなく「磨いて売る」。

- 画面は現状で凍結: `/`(記録)・`/timeline`・`/report`・`/me`・`/s`(シェア)+ `/api/parse`・`/api/og`。新route・新タブ・新画面の追加禁止(`agent-os/goals/routes.allowlist` が機械検証)
- 依存パッケージも凍結(`agent-os/goals/deps.allowlist`)。追加は必ず事前提案
- ゲーミフィケーション(レベル・称号・実績・演出)は現状の仕様のまま。新メカニクス追加禁止
- タイムラインはβプレビューのまま凍結。実フィード化(Supabase接続)はオーナー同席のW3判断
- 既存機能の削除もしない(オーナーが残すと判断済み)。やってよいのは**バグ修正・解析精度・表示崩れ・文言・速度**だけ

### ローンチまでの残作業(これ以外やらない)
1. 解析精度: 実スクショの失敗ケース収集→プロンプト改善(parse_logsを見る)
2. 実機仕上げ: iPhone実機での表示崩れ・操作性の修正
3. W3: Supabase接続(auth/schema適用。**オーナー同席必須**)
4. W4: Stripe Payment Link+課金打診文言(**オーナー承認必須**)
5. 獲得: シェアカード→X導線の磨き込み。最初の10人への声かけはオーナーの仕事

## 技術スタック(変更しない)

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Auth(まずGoogle/匿名)、Postgres、Storage(スクショ画像)。未設定時はlocalStorageにフォールバック
- OpenAI API: スクショ解析(gpt-4.1-mini既定・`OPENAI_MODEL`で変更可、structured outputs)※2026-07-06 オーナー判断でAnthropicから変更
- Recharts(グラフ) / @vercel/og または satori(シェアカード画像生成)
- Vercel デプロイ
- 決済(W4で追加): Stripe Payment Links(実装最小)

## データモデル(初期)

- `users`: id, created_at
- `shifts`: id, user_id, date, platform(enum: uber/demaecan/menu/rocketnow/other), revenue_yen, deliveries, minutes_worked, source(screenshot/manual), raw_screenshot_url
- `parse_logs`: スクショ解析の生出力(プロンプト改善用に必ず残す)

## 開発ルール

- モバイルファースト。全画面をiPhone幅で先に確認
- スクショ解析はプロンプト+few-shot例を `prompts/` に分離し、UI変更で壊れた時に差し替えやすくする
- 個人情報注意: スクショに注文者情報が写り込む可能性。解析後は売上部分以外を保存しない方針をコードコメントに明記
- コミットは機能単位で細かく。動く状態を常に維持
- 完了報告の前に必ずローカルで実行確認(オーナーの端末は実機iPhone)

## 判断に迷ったら

「その実装は、8/4までに配達員から1円もらうために必要か?」で判断する。Noなら書かない。

---

# Agentic OS 憲法(2026-07-09追加)

詳細は `agent-os/` 以下(ENGINE.md / contract.md / RUNBOOK.md)。ここは法律だけ。

## NEVER
- Never expand scope beyond the 2026-08-04 first-paid-user goal unless explicitly approved.
- Never add features outside screenshot import, dashboard, and share card before first revenue.
- Never implement scraping or automated platform login.
- Never touch auth, billing, Supabase schema, migrations, production config, or storage policy unattended.
- Never add a dependency without proposing it first.
- Never store unnecessary personal information from screenshots.
- Never report work as done without verification.
- Never edit, weaken, or delete tests to make a task pass.
- Never enable cron, auto-merge, auto-deploy, or auto-payment flows without human approval.
- Never echo or explain internal reasoning in response text(Fable 5のreasoning_extraction refusalを誘発する).
- Never add a new route, tab, or screen after the 2026-07-10 feature freeze(`goals/routes.allowlist`).
- Never add new gamification mechanics, feed features, data model entities, or npm dependencies before first revenue(`goals/deps.allowlist`).

## DISPATCH
ルーティング詳細は `agent-os/ENGINE.md` の Model Dispatch。要点:
1. 判断・レビュー・standoff → top reasoning model(read-only)
2. 実装・テスト → worker(Sonnet級)
3. triage・分類 → cheap model
4. 最終判定 → bash(`agent-os/guardrails/verify.sh`)。モデルの自己申告は完了ではない
ルーティングは `agent-os/memory/dispatch.tsv` に記録する。

## WORDS
- 「done」= predicateが通ること。それ以外の何物でもない
- 「small」= 変更200行未満 /「large」= 400行以上(→人間レビュー必須)
- 「cleanup」= 挙動同一、前後でverify.sh green
- 「MVP範囲」= スクショ取り込み・ダッシュボード(レポート)・シェアカード・刺激レイヤー(CLAUDE.md上部のスコープ定義)
- 「ローンチモード」(2026-07-10〜)= 機能凍結下の運転。許可される変更は バグ修正/解析精度/表示崩れ/文言/速度 の5種のみ。「改善」はこの5種に翻訳できなければ却下

## AUTONOMY
AI should not wait for human input on reversible implementation choices.
If the task is within MVP scope, technically reversible, and verifiable, proceed.
Log assumptions in `agent-os/memory/STATE.md` or `agent-os/HUMAN_DECISIONS_DRAFT.md`.
The human should only be required for irreversible, high-risk, or business-critical decisions.
境界の具体リストは `agent-os/contract.md`(acts alone / queues for me / wakes me up)。

## DONE
<!-- HUMAN_DECISION_DRAFT: 完了定義。あとで人間が修正する -->
Done means:
1. The requested behavior is implemented.
2. The implementation stays inside the MVP scope.
3. `agent-os/guardrails/verify.sh` passes.
4. No forbidden area was touched.
5. User-visible changes are checked for mobile-first behavior.
6. Any assumption made without asking is logged.
7. Any unfinished or unverified part is explicitly marked.

## HUMAN_DECISION_DRAFT
人間が本来決めるべき判断をAIが仮置きした場合、必ず
`agent-os/HUMAN_DECISIONS_DRAFT.md` に「仮置き/理由/修正するなら」を追記する。
オーナーはそのファイルだけ読めば全仮置きを修正できる状態を維持する。
