# skills/ — 繰り返し作業の雇用台帳(BUILD 4)

各skillは1ディレクトリ+SKILL.md。trust台帳(memory/trust.tsv)がtierを決める。

<!-- HUMAN_DECISION_DRAFT: trust昇格条件 -->
## Tierルール
- watch:
  - 初期状態(全skillはここから)
  - AI may create local changes and drafts(MVP内・可逆なローカル変更は許可)
  - no auto PR, no auto merge, no production deploy
- queue:
  - 10 runs以上 かつ 90%以上pass
  - AI may prepare PR draft text or branch instructions
  - human review required before merge
- auto:
  - 20 runs以上 かつ 95%以上pass
  - still no production deploy
  - auto PR may be enabled later by human approval
  - auto merge remains disabled unless explicitly approved

昇格は `scripts/trust-log.sh --tier <skill>` が機械的に判定する。
降格(fail増加でwatch落ち)は自動で、stderrにALERTが出る。

## 自動化禁止(dangerous skills)
以下は何runパスしてもauto化しない。常に人間が実行・承認する:
- change-auth
- change-billing
- change-database-schema
- change-storage-policy
- deploy-production
- send-user-email
- create-payment-link
- scrape-platform-data
- delete-user-data
- modify-production-config
