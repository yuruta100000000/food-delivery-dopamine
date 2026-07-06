# DeliLog(仮称)

フードデリバリー配達員向けの稼働記録・可視化Webアプリ。「働く人のStrava」。
プロジェクト定義・スコープ・開発ルールは [CLAUDE.md](./CLAUDE.md) を参照。

**絶対制約: 2026-08-04までに先行課金で1円の売上。スコープ外の機能追加は禁止。**

## セットアップ

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY を設定
npm run dev
```

`ANTHROPIC_API_KEY` 未設定でも起動する(AI解析は失敗し、手動入力フォームにフォールバック)。
動作確認は必ずiPhone幅(390px)で行うこと。

## MVP実装計画(〜2026-08-04)

### ✅ Step 1: 縦一本スライス「スクショ → AI解析 → 結果表示」(今ここ)
- スクショアップロード(クライアント側で長辺2576pxに縮小してから送信)
- `/api/parse`: Claude(claude-sonnet-5, vision + structured outputs)で
  日付・プラットフォーム・売上・件数・稼働時間を抽出
- 解析結果を修正可能なフォームに表示 → 確定(現状メモリ保持のみ)
- 解析失敗・API未設定・売上画面でない画像 → 手動入力フォームにフォールバック
- プロンプトは `prompts/parse-screenshot.ts` に分離(UI変更時はここだけ差し替え)

### Step 2: Supabase接続(永続化)
- Auth: 匿名ログイン → Googleログイン
- `shifts` テーブルに確定データを保存 / `parse_logs` に解析生出力を必ず保存
- Storage にスクショ原本を保存(`raw_screenshot_url`)
- 同日・同プラットフォームの重複取り込みガード

### Step 3: ダッシュボード
- 日/週/月の売上推移(Recharts)、プラットフォーム別内訳
- 時給換算、連続稼働日数
- モバイルで美しいことが最優先

### Step 4: シェアカード + 課金
- 「今日の稼働」1枚画像(@vercel/og)、Strava風
- ワンタップX投稿導線
- Stripe Payment Links で先行課金(月300〜500円 or 買い切り応援)→ **1円の売上**

### 並行タスク(コード外)
- Vercelデプロイは Step 1 完了時点から常時(動くURLを配達員に見せる)
- 実スクショ(Uber/出前館/menu/ロケットナウ)で解析精度を検証し、
  `prompts/parse-screenshot.ts` の few-shot を実データ準拠に更新

## 構成

- Next.js (App Router) + TypeScript + Tailwind CSS
- Anthropic API(スクショ解析)/ Supabase(Step 2〜)/ Vercel

| パス | 役割 |
|---|---|
| `app/page.tsx` | アップロード → 解析結果の確認・修正 → 確定(モバイルファースト) |
| `app/api/parse/route.ts` | スクショ解析API(vision + structured outputs) |
| `prompts/parse-screenshot.ts` | 解析プロンプト + few-shot(UI変更時の差し替えポイント) |
| `lib/shift.ts` | 稼働記録の型・zodスキーマ・JSON Schema |
