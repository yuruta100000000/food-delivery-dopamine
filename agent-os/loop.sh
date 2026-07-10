#!/usr/bin/env bash
# loop.sh — ハートビート(BUILD 3)。手動実行専用: `make tick`
#
# 初期状態の安全設定:
#   - 自動PR作成: 無効 / 自動push: 無効 / production deploy: 絶対にしない
#   - workerはMVP範囲の変更をworktreeに作るが、review queueに残す(コミットしない)
#   - cronは設定しない(Week 2以降の手順は 30_DAY_TRUST_SCHEDULE.md 参照)
#
# 自動PRを将来有効化する場合(人間の承認後):
#   GATE通過後のブロックで、下記のコメントを外す。
#     # (cd "$WT" && git add -A && git commit -m "loop: $SKILL" && git push -u origin "$BRANCH")
#   auto-merge / auto-deploy はこのスクリプトでは今後も有効化しない。
#
# 必要なもの: claude CLI(Claude Code)。無ければ手順を表示して終了する。
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"

MAX_ITERS="${MAX_ITERS:-1}"
DAILY_BUDGET_USD="${DAILY_BUDGET_USD:-5}"
TRIAGE_MODEL="${TRIAGE_MODEL:-claude-haiku-4-5}"
CONDUCTOR_MODEL="${CONDUCTOR_MODEL:-claude-fable-5}"
WORKER_MODEL="${WORKER_MODEL:-claude-sonnet-5}"
VERIFIER_MODEL="${VERIFIER_MODEL:-claude-fable-5}"

command -v claude >/dev/null 2>&1 || {
  echo "claude CLI が見つかりません。Claude Code をインストール/ログインしてから make tick を実行してください。"
  exit 4
}
command -v jq >/dev/null 2>&1 || { echo "jq が必要です"; exit 4; }

./scripts/cost-check.sh --budget "$DAILY_BUDGET_USD" || { echo "budget exceeded" >> memory/STATE.md; exit 3; }

for ((i = 1; i <= MAX_ITERS; i++)); do
  # 1 TRIAGE: 静かなtickは安く読む
  SIGNALS="$( (cd "$ROOT" && git log --oneline -15); echo '--- goal ledger tail:'; tail -5 memory/goal-ledger.tsv 2>/dev/null || true; echo '--- state tail:'; tail -10 memory/STATE.md )"
  TRIAGE_OUT=$(claude -p "$(cat triage.md)

SIGNALS:
$SIGNALS" --model "$TRIAGE_MODEL" 2>/dev/null || echo "status: quiet")
  ./scripts/log-cost.sh triage 0.01
  echo "## tick $(date -Is)" >> memory/STATE.md
  echo "$TRIAGE_OUT" >> memory/STATE.md
  echo "$TRIAGE_OUT" | grep -q "status: actionable" || { echo "quiet"; exit 0; }

  # 2 CONDUCT: top model・fresh context・read-only・JSON out
  claude -p "$(cat conductor.md)

STATE:
$(tail -60 memory/STATE.md)

TRUST:
$(./scripts/trust-log.sh --render)

CONTRACT:
$(cat contract.md)

GOALS:
$(grep -l 'status: VIOLATED' goals/*.md 2>/dev/null || echo 'all goals hold')" \
    --model "$CONDUCTOR_MODEL" --allowedTools "Read" \
    --output-format json > /tmp/conductor.json
  ./scripts/log-cost.sh conductor 0.35

  # refusal / reroute チェック(stop_reasonはHTTP 200で返る)
  if grep -q '"refusal"' /tmp/conductor.json 2>/dev/null; then
    echo "- REFUSAL: conductor declined. RUNBOOK参照" >> memory/STATE.md
    exit 2
  fi
  SERVED=$(jq -r '.modelUsage | keys[0] // ""' /tmp/conductor.json 2>/dev/null || echo "")
  if [ -n "$SERVED" ] && [[ "$SERVED" != *"${CONDUCTOR_MODEL#claude-}"* ]]; then
    echo "- rerouted: conductor served by $SERVED" >> memory/STATE.md
    exit 2
  fi

  jq -r '.result' /tmp/conductor.json > work-order.json
  SKILL=$(jq -r '.skill // "unknown"' work-order.json)
  ACTION=$(jq -r '.action // "stop"' work-order.json)
  echo -e "$(date -Is)\tconductor\t$CONDUCTOR_MODEL\t$SKILL\t$ACTION" >> memory/dispatch.tsv
  [ "$ACTION" = stop ] && { echo "conductor: stop"; exit 0; }
  [ "$ACTION" = queue ] && { echo "- queued: $SKILL ($(jq -r .item work-order.json))" >> memory/STATE.md; continue; }

  # 3 EXECUTE: workerはworktreeで作業(mainに触らない)
  TS=$(date +%s)
  BRANCH="agent/$SKILL-$TS"
  WT="$ROOT/../delilog-wt-$TS"
  (cd "$ROOT" && git worktree add "$WT" -b "$BRANCH" >/dev/null)
  (cd "$WT" && claude -p "$(cat "$ROOT/agent-os/workers/implement.md")

WORK ORDER:
$(cat "$ROOT/agent-os/work-order.json" 2>/dev/null || cat "$ROOT/agent-os/work-order.example.json")" \
      --model "$WORKER_MODEL" > IMPLEMENTATION.md 2>&1) || true
  ./scripts/log-cost.sh worker 0.10
  echo -e "$(date -Is)\tworker\t$WORKER_MODEL\t$SKILL\texecute" >> memory/dispatch.tsv

  # 4 VERIFY: fresh context・ツールなし・spec+diffのみ
  VERDICT=$(claude -p "$(cat workers/verify.md)

SPEC:
$(jq -r .spec work-order.json)
DONE_WHEN:
$(jq -r '.done_when | join("\n")' work-order.json)

DIFF:
$(cd "$WT" && git diff | head -800)" \
    --model "$VERIFIER_MODEL" --allowedTools "" 2>/dev/null | tail -1)
  ./scripts/log-cost.sh verifier 0.40

  # 5 GATE: 決定論的verify → trust台帳 → review queue(自動shipなし)
  if [[ "$VERDICT" == PASS* ]] && (cd "$WT" && ./agent-os/guardrails/verify.sh); then
    ./scripts/trust-log.sh "$SKILL" pass
    echo "- review: $SKILL in $WT (branch $BRANCH) — human review required" >> memory/STATE.md
    # 自動PRは初期無効。有効化手順はこのファイル冒頭のコメント参照。
  else
    ./scripts/trust-log.sh "$SKILL" fail
    echo "- FAILED: $SKILL in $WT — $VERDICT" >> memory/STATE.md
  fi

  ./scripts/cost-check.sh --budget "$DAILY_BUDGET_USD" || { echo "budget exceeded" >> memory/STATE.md; exit 3; }
done
exit 0
# exit map: 0 quiet/done, 2 refusal/reroute, 3 budget, 4 missing tools
