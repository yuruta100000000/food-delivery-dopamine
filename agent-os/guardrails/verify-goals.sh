#!/usr/bin/env bash
# verify-goals.sh — standing goalsのread-only検証(BUILD 5)
# goals/*.md の `predicate:` 行を順に実行し、結果を memory/goal-ledger.tsv に追記する。
# リポジトリの状態は変更しない(next buildの.next生成のみ副作用として許容)。
# usage: agent-os/guardrails/verify-goals.sh
set -uo pipefail
cd "$(dirname "$0")/../.."   # repo root
LEDGER="agent-os/memory/goal-ledger.tsv"
mkdir -p "$(dirname "$LEDGER")"
[ -f "$LEDGER" ] || printf "timestamp\tgoal\tresult\tseconds\n" > "$LEDGER"

violated=0
for f in agent-os/goals/[0-9]*.md; do
  goal=$(sed -n 's/^# goal: //p' "$f" | head -1)
  pred=$(sed -n 's/^predicate: //p' "$f" | head -1)
  t=$(sed -n 's/^timeout: //p' "$f" | head -1); t=${t:-60}
  sev=$(sed -n 's/^severity: //p' "$f" | head -1); sev=${sev:-blocker}
  [ -n "$goal" ] && [ -n "$pred" ] || { echo "SKIP (malformed): $f" >&2; continue; }

  start=$(date +%s)
  if timeout "$t" bash -c "$pred" >/dev/null 2>&1; then
    res=pass
  else
    res=fail
    if [ "$sev" = blocker ]; then violated=1; fi
    echo "VIOLATED($sev): $goal  [$pred]" >&2
  fi
  printf "%s\t%s\t%s\t%s\n" "$(date -Iseconds)" "$goal" "$res" "$(( $(date +%s) - start ))" >> "$LEDGER"
  echo "$res  $goal"
done

if [ "$violated" = 1 ]; then
  echo "" >&2
  echo "STANDING GOAL VIOLATED — 他の作業より優先して修復すること(agent-os/contract.md)" >&2
  exit 1
fi
