# BUDGET.md — Agentic OSの運用予算(BUILD 6)

<!-- HUMAN_DECISION_DRAFT: 予算額と運用形態。オーナーの資金状況に合わせて必ず見直すこと -->

## 上限(cost-check.shと同期)
- 1日: **$5.00**
- 1週: **$25.00**
- 超過したら loop.sh は起動を拒否する(cost-check.shがexit 1)

## Week 1の運用形態
- **手動ループのみ**。cron/自動tickは無効(CLAUDE.md NEVER準拠)
- 1 tick = triage→conductor→(worker→verifier)を最大1周(loop.sh MAX_ITERS=1)
- 1 tickの概算コスト: 約 $0.86(triage $0.01 + conductor $0.35 + worker $0.10 + verifier $0.40)
  - → 1日あたり最大 5〜6 tick が目安

## 記録
- `scripts/log-cost.sh <stage> <usd>` が `memory/usage.log` に追記
- `scripts/cost-check.sh --render` で今日/今週の消費を確認
- 数値はstage別の**概算**。実測トークン数が取れるようになったら置き換える(ASSUMPTION as STATE.md)

## 判断基準
予算を上げる前に問うこと: 「その支出は、8/4までに配達員から1円もらうために必要か?」
