# agent-os/ — DeliLogのAgentic OS

Fable 5ガイド「How to Build An Agentic OS」のBUILD 0〜8を、このリポジトリの実情
(Next.js MVP・8/4初課金ゴール・オーナー1人)に合わせて実装したもの。

**思想**: 人間は「何を作るか」と不可逆な判断だけをやる。
可逆で機械検証できる作業はAIが進め、bashの決定論ゲートが最終投票権を持つ。

## 地図

| パス | 役割 | BUILD |
|---|---|---|
| `ENGINE.md` | モデル配席・効き方・refusal処理の憲法 | 0 |
| `../CLAUDE.md` | プロジェクト憲法(NEVER/DISPATCH/AUTONOMY/DONE) | 1 |
| `contract.md` | acts alone / queues for me / wakes me up | 2 |
| `guardrails/verify.sh` | 決定論ゲート(build→typecheck→…) | 2 |
| `triage.md` `conductor.md` `workers/` `loop.sh` | 手動1周のループ | 3 |
| `skills/` + `scripts/trust-log.sh` + `memory/trust.tsv` | 雇用台帳とtier | 4 |
| `goals/` + `guardrails/verify-goals.sh` | standing goals(read-only検証) | 5 |
| `BUDGET.md` + `scripts/cost-check.sh` `log-cost.sh` | 予算ゲート | 6 |
| `optional/` | quorum/ratchet/sparring/compost(全部無効) | 7 |
| `../Makefile` `RUNBOOK.md` `30_DAY_TRUST_SCHEDULE.md` | 操作面 | 8 |
| `HUMAN_DECISIONS_DRAFT.md` | **AIが仮置きした判断の全一覧(最初に読む)** | — |
| `memory/` | STATE.md・dispatch.tsv・trust.tsv・goal-ledger.tsv・usage.log | — |

## 5分で始める
```
make goals    # 北極星が生きているか
make verify   # ビルド・型が通るか
make tick     # 手動1周
make queue    # レビュー待ち確認
```
詳細は `RUNBOOK.md`。仮置きの修正は `HUMAN_DECISIONS_DRAFT.md` から。

## 初期状態で無効なもの
cron自動tick / auto-PR / auto-merge / auto-deploy / optional 4モジュール。
有効化は人間の明示承認が必要(CLAUDE.md NEVER)。
