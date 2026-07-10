# SECURITY.md — DeliLogのセキュリティ対策(2026-07-10)

## 実装済みの対策

### データアクセス(Supabase)
- **RLS(Row Level Security)全テーブル有効**。`shifts` は `auth.uid() = user_id` の
  select/insert/delete のみ許可 — 他人の記録は仕組み上読めない
- `parse_logs` はポリシーを一切作らない=anonキーでは読み書き不可。
  書き込みはサーバー側の service_role のみ
- `service_role` キーはサーバー専用環境変数(`SUPABASE_SERVICE_ROLE_KEY`)。
  `NEXT_PUBLIC_` を付けない=クライアントに配られない

### 解析API(/api/parse)— 費用面の攻撃対象
- IP別レート制限: 10回/分(超過は429)
- 画像サイズ上限: 8MB(超過は413)
- MIMEタイプ検査: JPEG/PNG/WebP/GIFのみ受理
- 出力はOpenAI structured outputs + Zodで二重検証。不正な形は422で破棄

### HTTPヘッダー(next.config.ts)
- `X-Content-Type-Options: nosniff` / `X-Frame-Options: DENY`(クリックジャッキング)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: camera/microphone/geolocation/payment 全遮断
- `Strict-Transport-Security`(HTTPS強制)

### 個人情報
- スクショは**保存しない**(解析後に破棄)。抽出するのは売上関連フィールドのみ、
  注文者情報のテキスト抽出はプロンプトで明示的に禁止
- `.env.local` はgit追跡外(standing goal 07が機械検証)

### 秘密情報
- APIキーはすべてVercel環境変数。リポジトリにコミットしない
- 決済はStripe Payment Link=カード情報は当サービスを一切通らない

## 既知の限界(正直に)
- レート制限はサーバーレスのインスタンス内メモリ(ベストエフォート)。
  分散攻撃には弱い → 被害はOpenAIクレジットの消費に限定される。
  OpenAI側でも**月額上限(Usage limits)を必ず設定しておくこと**
- CSPは未導入(Next/OG画像のinline要件と衝突しやすいため段階導入)
- 匿名サインインが有効な限り、誰でもDBに行を作れる(自分の行だけ)。
  スパム行が問題になったらSupabase側のRate Limits(Auth)を締める

## インシデント時
1. Vercelの環境変数からキーを即ローテート(OpenAI/Supabase両方)
2. Supabase → Authentication → ユーザー凍結
3. `agent-os/contract.md` の wakes me up に該当 → 作業を全停止して原因調査
