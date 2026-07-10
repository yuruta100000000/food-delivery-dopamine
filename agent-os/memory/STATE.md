# STATE.md — Agentic OSの作業メモリ

書式:
- `## tick <ISO時刻>` の下にtriage結果
- `- review: <skill> in <worktree>` 人間レビュー待ち
- `- queued: <skill>` conductorが人間送りにした項目
- `- FAILED: <skill>` verify不合格
- `- ASSUMPTION: <内容>` AIが質問せず仮定したこと

---

## 2026-07-09 bootstrap
- Agentic OS scaffold created (BUILD 0-8).
- ASSUMPTION: 壊れていた `npm run lint`(Next 16でnext lint廃止)をpackage.jsonから削除し、`typecheck`(tsc --noEmit)を追加した。verify.shはbuild→typecheckの順で実行する(.next/typesの鮮度のため)。
- ASSUMPTION: loop.shの各モデルはclaude CLI経由(triage=haiku / conductor=fable-5 / worker=sonnet-5 / verifier=fable-5)。llm CLI/OpenRouterは導入しない(新規依存の禁止)。
- ASSUMPTION: コスト記録はstage別の概算値(triage $0.01 / conductor $0.35 / worker $0.10 / verifier $0.40)。実測ではない。

## 2026-07-10 BUILD 5-8 完了
- goals 7本(build/typecheck/解析縦一本/4タブ/OGカード/スクレイピング依存なし/secret未追跡)を述語化。パーサ回帰・E2E・「8/4に1円」はTODO_GOALS.mdへ。
- ASSUMPTION: typecheck failの原因が旧devサーバーのstale成果物(.next/dev/types → 削除済みapp/dashboard参照)だったため `.next/dev` を削除した。可逆(次のnext devで再生成)。再発時も同じ対処でよい。
- 初回 verify-goals.sh: 7/7 pass。verify.sh(build→typecheck): pass。

## 2026-07-10 機能凍結(ローンチモード)
- オーナー判断: 現状(タイムライン等MVP超過分を含む)で機能面を凍結し、ローンチに向かう。
- 実装: CLAUDE.md「機能凍結」節+NEVER 2本追加 / contract.md全面改訂 / goals 08-routes-frozen・09-deps-frozen(allowlist方式) / skills共通ルール。
- ASSUMPTION: 許可される変更を「バグ修正/解析精度/表示崩れ/文言/速度」の5種に限定した。凍結解除はallowlistの人間編集を証跡とする。
