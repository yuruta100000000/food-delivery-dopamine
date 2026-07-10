# Agentic OS 操作面(BUILD 8) — 詳細は agent-os/RUNBOOK.md
.PHONY: tick queue trust audit goals verify budget

# 手動1周: triage→conductor→(worker→verifier)。自動PR/deployはしない
tick:
	bash agent-os/loop.sh

# 人間レビュー待ちの一覧
queue:
	@grep -E "^- (review|queued|FAILED):" agent-os/memory/STATE.md || echo "(queue empty)"

# skill別の信頼台帳
trust:
	@bash agent-os/scripts/trust-log.sh --render

# 直近のdispatch(どの席がいつ何をしたか)
audit:
	@tail -30 agent-os/memory/dispatch.tsv | column -t -s "	"

# standing goalsのread-only検証
goals:
	bash agent-os/guardrails/verify-goals.sh

# 決定論ゲート(build→typecheck→lint→test、存在するものだけ)
verify:
	bash agent-os/guardrails/verify.sh

# 今日/今週のコスト
budget:
	@bash agent-os/scripts/cost-check.sh --render
