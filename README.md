# DeliLog(仮称)

フードデリバリー配達員向けの稼働記録・可視化Webアプリ。「働く人のStrava」。
プロジェクト定義・スコープ・開発ルールは [CLAUDE.md](./CLAUDE.md) を参照。

**絶対制約: 2026-08-04までに先行課金で1円の売上。スコープ外の機能追加は禁止。**

## セットアップ

```bash
npm install
cp .env.example .env.local   # OPENAI_API_KEY を設定
npm run dev
```

- `OPENAI_API_KEY` 未設定でも起動する(AI解析は失敗し、手動入力フォームにフォールバック)
- Supabase未設定時、記録は端末のlocalStorageに保存される(1人で使う分には十分)
- 動作確認は必ずiPhone幅(390px)で行うこと

### Vercelに設定する環境変数

| 変数 | 必須 | 用途 |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | スクショ解析 |
| `OPENAI_MODEL` | — | 解析モデル(省略時 gpt-4.1-mini) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | クラウド保存(未設定ならlocalStorage) |
| `SUPABASE_SERVICE_ROLE_KEY` | — | parse_logs(解析生ログ)の保存 |
| `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` | — | 応援プランボタン(W4の課金導線) |

### Supabaseを有効にする手順(任意・W3の複数ユーザー公開前に)

1. supabase.com でプロジェクト作成
2. SQL Editor で `supabase/schema.sql` を実行
3. Authentication → Sign In / Up → **Anonymous sign-ins を有効化**
4. 上記の環境変数3つをVercelに設定して再デプロイ

## MVP実装状況(〜2026-08-04)

### ✅ Step 1: スクショ → AI解析 → 結果表示
- OpenAI(gpt-4.1-mini, vision + structured outputs)で日付・プラットフォーム・売上・件数・時間を抽出
- 解析失敗/APIキー未設定/非売上画像 → 手動修正フォームにフォールバック
- プロンプト+few-shotは `prompts/parse-screenshot.ts` に分離(UI変更時はここだけ差し替え)

### ✅ Step 2: 保存
- localStorage(既定)/ Supabase(env設定時・匿名Auth)の二段構え
- 解析生出力は parse_logs に保存(Supabase設定時。未設定時はサーバーログ)

### ✅ Step 3: ダッシュボード
- 日/週/月の売上推移(Recharts)、プラットフォーム別内訳(直近30日)
- 今日/今週/今月サマリー、時給換算(直近30日)、連続稼働日数、記録の削除

### ✅ Step 4: シェアカード
- `/api/og` でStrava風カード画像を生成(1200×630)
- `/s` シェアページ + ワンタップX投稿導線(og:imageでタイムラインにカード展開)
- 応援プラン導線(`NEXT_PUBLIC_STRIPE_PAYMENT_LINK` 設定で表示)

### ✅ 追加(2026-07-07): 刺激レイヤー+走行距離
- レベル・称号システム(XP=累計売上、`lib/level.ts`)、実績解除(売上/件数/距離/連続日数)
- 記録完了セレブレーション(紙吹雪・カウントアップ・レベルアップ演出・自己ベスト)
- 週間目標リング(ホーム)+目標カード(ダッシュボード)
- 走行距離: 手動入力+スクショ抽出、ダッシュボードに30日合計と14日グラフ、シェアカードにDISTANCE
- GPS自動記録はPhase 2(ネイティブ化とセット。Webはバックグラウンド位置取得不可)

### ✅ 追加(2026-07-08): Studyplus型4タブ再設計
- **タイムライン**(`/timeline`): 仲間の走行ログ+エール+目標/売上帯フィルタ。
  Supabase接続までは「βプレビュー」(サンプルライダー表示、UI上に明示)
- **記録する**(`/`): 従来の記録→リザルト体験
- **レポート**(`/report`): 走った証。売上カレンダー(残り火ヒートマップ)を新設。
  旧 `/dashboard` はリダイレクト
- **マイページ**(`/me`): 表示名・自己紹介・使用アプリ・稼働スタイル・車両・
  週間目標・累計・Rank称号・実績図鑑。将来の公開プロフィール前提

### 🔜 残タスク(コードより検証)
- [ ] 本番で実スクショ4社分を解析し、`prompts/parse-screenshot.ts` のfew-shotを実データ準拠に更新
- [ ] Supabaseプロジェクト作成 + 環境変数設定(W3の無料登録20人前)
- [ ] Stripe Payment Link作成 → 環境変数設定(W4)→ **1円の売上**

## 構成

| パス | 役割 |
|---|---|
| `app/page.tsx` | 記録フロー(アップロード → 解析 → 確認・修正 → 保存) |
| `app/dashboard/page.tsx` | ダッシュボード |
| `app/s/page.tsx` + `app/api/og/route.tsx` | シェアページとカード画像生成 |
| `app/api/parse/route.ts` | スクショ解析API(OpenAI vision + structured outputs) |
| `prompts/parse-screenshot.ts` | 解析プロンプト + few-shot(差し替えポイント) |
| `lib/storage.ts` | 保存レイヤー(localStorage / Supabase) |
| `lib/stats.ts` | 集計(推移・内訳・時給・連続稼働) |
| `supabase/schema.sql` | DBスキーマ(shifts / parse_logs, RLS) |
