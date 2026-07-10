# SETUP.md — Supabase接続・ログイン・課金を有効にする手順(オーナー作業)

コードは実装済み。このファイルの手順を上から実行すると、
localStorage運用 → クラウド保存+Googleログイン+先行課金 に切り替わります。
**所要時間: 約30分。**

## 1. Supabaseプロジェクト作成(5分)
1. https://supabase.com → New project(リージョンは Tokyo / Northeast Asia)
2. Project Settings → API から以下2つをコピー:
   - `Project URL` → Vercel環境変数 `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` キー → `SUPABASE_SERVICE_ROLE_KEY`(parse_logs書き込み用。**絶対に公開しない**)

## 2. スキーマ適用(2分)
1. Supabaseダッシュボード → SQL Editor
2. このリポジトリの `supabase/schema.sql` の中身を貼り付けて Run
3. Table Editor に `shifts` と `parse_logs` が出ればOK

## 3. 認証の有効化(5分)
1. Authentication → Sign In / Providers:
   - **Anonymous sign-ins** を ON(初回アクセスで自動ゲスト化するため)
   - **Google** を ON(下記4のクライアントID/シークレットが必要)
2. Authentication → Settings で **Manual Linking** を ON
   (ゲストの記録を失わずにGoogleログインへ昇格させるため。忘れると
   ログイン時に別アカウント扱いになる→コードは自動フォールバックするが記録は引き継がれない)

## 4. Google OAuth設定(10分)
1. https://console.cloud.google.com → APIとサービス → 認証情報 → OAuthクライアントID(Webアプリ)
2. 承認済みリダイレクトURIに Supabaseが表示する `https://<project>.supabase.co/auth/v1/callback` を追加
3. 発行された Client ID / Client Secret を Supabase の Googleプロバイダ設定に貼る
4. OAuth同意画面のアプリ名は「DeliLog」に

## 5. Vercel環境変数(3分)
Vercel → Settings → Environment Variables に追加して **Redeploy**:
```
NEXT_PUBLIC_SUPABASE_URL      = (1でコピー)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (1でコピー)
SUPABASE_SERVICE_ROLE_KEY     = (1でコピー・Sensitive扱い)
```
※ 名前を1文字でも間違えるとlocalStorageモードのまま動きます(エラーは出ない設計)。

## 6. 先行課金 — Stripe Payment Link(5分)
1. https://dashboard.stripe.com → 商品カタログ → 商品を作成
   - **価格はオーナー判断**(HUMAN_DECISIONS_DRAFT #15参照。例: ¥500 買い切り)
2. Payment Links → 新規作成 → その商品を選択
3. 発行URLを Vercel環境変数 `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` に設定して Redeploy
4. マイページに「先行サポーターになる」カードが出現する
   (**環境変数を設定するまでカードは一切表示されない** = 文言・価格をオーナーが承認してから公開)

## 7. 動作確認チェックリスト(実機iPhone)
- [ ] 記録→保存→リロードで記録が残る(クラウド保存の確認)
- [ ] マイページ→「Googleでログインして記録を守る」→ ログイン後、**ゲスト時代の記録が残っている**
- [ ] ログアウト→再ログインで記録が戻る
- [ ] 別端末で同じGoogleアカウントでログイン→記録が同期される
- [ ] スクショ解析が動く(parse_logsにも行が増える)
- [ ] サポーターカード→Stripeページが開く→テスト決済

## 移行の仕組み(参考)
接続後の初回読み込み時に、この端末のlocalStorageに残っている記録を
自動でSupabaseへ1回だけコピーします(localStorage側はバックアップとして残る)。
オーナーが今まで実機で貯めた記録も消えません。
