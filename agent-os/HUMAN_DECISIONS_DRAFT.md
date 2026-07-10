# HUMAN_DECISIONS_DRAFT

このファイルは、本来人間が決めるべきだが、Agentic OS構築のためにClaudeが仮置きした項目の一覧です。
オーナーは後でここだけ見れば、判断を修正できます。
この初期版は「AIに広めの裁量を与えるが、不可逆領域は止める」方針で作成されています。

---

## 1. Model Dispatch
仮置き: 判断・調停・検証=Fable 5(claude-fable-5)/実装=Sonnet 5/振り分け=Haiku 4.5/最終ゲート=bash(agent-os/ENGINE.md、loop.sh)。llm CLIやOpenRouterは使わず、既存のclaude CLI経由で呼ぶ。
理由: 「新しい依存関係を追加しない」ルールに従いつつ、高い判断力が必要な席にだけ高いモデルを置くとコストが1/3以下になる。決定論で判定できるもの(ビルド・型)はモデルに聞かない。
修正するなら: agent-os/ENGINE.md の Model Dispatch表 と agent-os/loop.sh 冒頭のモデル変数を書き換える。

## 2. Autonomy Level
仮置き: 可逆・MVP範囲内・機械検証可能な変更は質問せず実行。不可逆(secret/schema/auth/billing/deploy/個人情報方針)は必ず停止。仮定した判断は STATE.md にASSUMPTION、恒久的なものは本ファイルに追記。
理由: オーナーの指示「可逆な判断は質問せずに進める。ただし不可逆・高リスクは止める」をそのまま成文化した。
修正するなら: CLAUDE.md の AUTONOMY節 と agent-os/contract.md を書き換える。

## 3. Never Rules
仮置き: ①8/4初課金ゴール外のスコープ拡大禁止 ②スクレイピング・自動ログイン禁止 ③auth/billing/schema/migration/本番設定/storage方針の無人変更禁止 ④依存追加は事前提案必須 ⑤スクショ由来の不要な個人情報保存禁止 ⑥cron/auto-PR/auto-merge/auto-deploy/auto-決済の無承認有効化禁止。
理由: オーナー指定のNon-Negotiable Rulesを、既存CLAUDE.mdの「スコープ外」と矛盾しない形で統合した。
修正するなら: CLAUDE.md の NEVER節。緩める場合は1項目ずつ、理由を書いて。

## 4. Acts Alone
仮置き: MVP範囲内のコード修正・リファクタ/ドキュメント更新/型・ビルドエラー修正/プロンプト改善案の作成/ローカルworktreeでの実装・検証/STATE.md・台帳の記録。
理由: すべてgit revertで巻き戻せる、かつverify.shで機械検証できる領域だけを選んだ。
修正するなら: agent-os/contract.md の「acts alone」リスト。

## 5. Queues For Me
仮置き: PR作成・merge/依存追加の提案/UIの大きな方向転換/新skillの追加/課金文言(draft-payment-ask-copy)の使用/tier昇格の最終承認。
理由: 可逆だが「事業の顔」に触れるもの、またはレビューなしで積み重なると方向がずれるものを人間の前に置いた。
修正するなら: agent-os/contract.md の「queues for me」リスト。

## 6. Wakes Me Up
仮置き: standing goal VIOLATED/secretの露出疑い/個人情報の混入疑い/予算超過/auth・billing・schemaに触れる必要が生じた時/8/4ゴールと矛盾する指示を検出した時。
理由: 放置すると不可逆な損害(信用・金銭・法務)になるものだけに絞り、通知疲れを防ぐ。
修正するなら: agent-os/contract.md の「wakes me up」リスト。

## 7. Done Definition
仮置き: ①要求された挙動が実装されている ②MVPスコープ内に収まっている ③agent-os/guardrails/verify.sh がpass ④禁止領域に触れていない。UI変更はさらに「実機iPhone幅で確認」を人間側のmerge条件とする。
理由: 「動いた」ではなく「壊していない証明付きで動いた」を完了とするため。
修正するなら: CLAUDE.md の DONE節。

## 8. Verify Commands
仮置き: build → typecheck → lint → test の順で、package.jsonに存在するscriptだけ実行(現状はbuildとtypecheckのみ)。壊れていた `next lint` はpackage.jsonから削除し、`typecheck`(tsc --noEmit)を追加した。buildを先に走らせるのは .next/types の鮮度のため。
理由: Next 16で `next lint` が廃止されておりCIとして嘘になる。存在しないtestを偽装しない。
修正するなら: package.json のscriptsに lint/test を追加すれば verify.sh が自動で拾う(verify.sh自体の変更は不要)。

## 9. Standing Goals
仮置き: ①buildが通る ②typecheckが通る ③解析縦一本のファイルが存在 ④4タブ構造が存在 ⑤OGカードが存在 ⑥スクレイピング依存なし ⑦.env.local未追跡、の7つ。パーサ回帰・ビジュアル・E2E・「8/4に1円」は述語が作れないため goals/TODO_GOALS.md に前提条件付きで退避。
理由: 「存在しないテストを偽のpassing goalにしない」という指示に従い、今日の時点で正直に機械検証できるものだけを述語化した。
修正するなら: agent-os/goals/ に `# goal:` / `predicate:` / `timeout:` 形式の.mdを足すだけで verify-goals.sh が拾う。

## 10. Skills
仮置き: 13 skill(fix-lint / fix-typecheck / fix-mobile-layout / write-tests / add-parser-fixture / improve-parser-prompt / improve-upload-flow / improve-dashboard-clarity / improve-share-card-copy / triage-user-feedback / prepare-user-interview-notes / draft-payment-ask-copy / update-docs)。全部watch tierから開始。
理由: 過去2週間で実際に繰り返した作業+8/4までに確実に発生する作業(課金文言・ユーザーヒアリング)だけを雇用した。
修正するなら: agent-os/skills/<名前>/SKILL.md を追加/削除。危険skillリストは skills/README.md。

## 11. Trust Graduation
仮置き: watch(初期)→ queue(10runs以上かつ90%pass)→ auto(20runsかつ95%pass)。判定は trust-log.sh が機械的に行う。autoでも本番deployは不可。auth/billing/schema/deploy/メール/決済リンク系は永久にauto化しない。
理由: 昇格を「印象」でなく台帳の数字で決めることで、疲れている日の甘い判断を防ぐ。
修正するなら: agent-os/scripts/trust-log.sh の tier_of() のしきい値と、skills/README.md。

## 12. Budget
仮置き: $5/日・$25/週。超過時はloop.shが起動拒否。Week 1は手動tickのみ(1 tick≈$0.86の概算)。コストはstage別概算値で記録(実測ではない)。
理由: MVP前の収入ゼロ期に、無人ループの暴走で数万円溶かす事故を構造的に不可能にするため。
修正するなら: agent-os/scripts/cost-check.sh の DAILY_LIMIT/WEEKLY_LIMIT と agent-os/BUDGET.md(両方同時に)。

## 13. Optional Loop Install Conditions
仮置き: quorum(多数決検証)=verifierの誤PASSが月2回以上/ratchet=goals全passが2週間継続/sparring(敵対レビュー)=queue昇格skillの出現時/compost(記憶圧縮)=STATE.md 200行超。すべて初期無効。
理由: どれも「問題が実際に起きてから」入れる方が安く、8/4前の複雑化を避けられる。
修正するなら: agent-os/optional/*.md の導入条件を書き換え、導入時に status: ENABLED に変更。

## 14. 30-Day Schedule
仮置き: W1=全skill watch・配管確認/W2=fix-typecheck等の低リスクskillのqueue昇格検討/W3=UI系の実績づくり(実機確認をpass条件に含む)/W4=07/31で昇格凍結、8/4の課金獲得に全振り。
理由: リリース直前に権限を広げるのは事故のもと。信頼拡大の山をW2-3に置き、W4は収穫に使う。
修正するなら: agent-os/30_DAY_TRUST_SCHEDULE.md。日付はオーナーの稼働日に合わせてずらしてよい。

## 16. Feature Freeze — ローンチモード(2026-07-10追加)
仮置き: オーナーの「MVPを超えているのでローンチまで進む」判断を、①現状の5画面+API2本で凍結(routes.allowlist)②npm依存凍結(deps.allowlist)③許可される変更は「バグ修正/解析精度/表示崩れ/文言/速度」の5種のみ④既存機能の削除も人間承認制、として成文化した。凍結解除の手続き=人間がallowlistを直接編集する(編集自体が承認の証跡)。
理由: 凍結を「気持ち」でなくstanding goal(08/09)で機械検証できる形にしないと、改善という名の機能追加が再発する(オーナーの過去5回の燃え尽きパターン)。
修正するなら: agent-os/goals/routes.allowlist・deps.allowlist を編集(追加を許可する時)。5種の許可リストを変えるなら CLAUDE.md「ローンチモード」の定義とcontract.mdを同時に。

## 15. Remaining Human Decisions
まだ人間が決めるべきこと:
- **価格**: 先行課金の金額(例: ¥500買い切り? ¥300/月?)と、何を約束して売るか。draft-payment-ask-copyはこれが決まらないと最終化できない
- **Supabase本番化のタイミング**: 現在localStorageフォールバック運用。タイムラインを本物にするにはauth+schema適用が必要で、これは無人変更禁止領域
- **Stripe Payment Linkの作成**: 決済リンク発行はオーナーのStripeアカウントでしかできない(W4予定)
- **最初の10人の配達員に会う方法**: X/現場/知人。プロダクトでなく営業の判断
- **OpenAIクレジットの残高管理**: 解析1回あたりのコスト実測と、ユーザー増加時の上限設定
