#!/usr/bin/env bash
# cost-check.sh — 予算超過チェック(BUILD 6)
# usage: cost-check.sh          … 予算内なら0、超過なら1で終了(loop.shのゲート用)
#        cost-check.sh --render … 今日/今週の消費を表示
# 予算は agent-os/BUDGET.md と同期して更新すること。
set -euo pipefail
F="$(dirname "$0")/../memory/usage.log"
touch "$F"

DAILY_LIMIT=5.00    # USD/day   <!-- HUMAN_DECISION_DRAFT: 予算額 -->
WEEKLY_LIMIT=25.00  # USD/week

today=$(date +%Y-%m-%d)
week_start=$(date -d "last monday" +%Y-%m-%d 2>/dev/null || date -v-Mon +%Y-%m-%d)
# 月曜当日はlast mondayが先週を指すGNU date対策
[ "$(date +%u)" = 1 ] && week_start=$today

day_sum=$(awk -F'\t' -v d="$today" '$1 ~ "^"d {s+=$3} END{printf "%.2f", s}' "$F")
week_sum=$(awk -F'\t' -v w="$week_start" 'substr($1,1,10) >= w {s+=$3} END{printf "%.2f", s}' "$F")

if [ "${1:-}" = --render ]; then
  echo "today ($today):      \$$day_sum / \$$DAILY_LIMIT"
  echo "week  (from $week_start): \$$week_sum / \$$WEEKLY_LIMIT"
fi

over=0
awk -v a="$day_sum" -v b="$DAILY_LIMIT" 'BEGIN{exit !(a+0 > b+0)}' && { echo "BUDGET EXCEEDED: daily \$$day_sum > \$$DAILY_LIMIT" >&2; over=1; }
awk -v a="$week_sum" -v b="$WEEKLY_LIMIT" 'BEGIN{exit !(a+0 > b+0)}' && { echo "BUDGET EXCEEDED: weekly \$$week_sum > \$$WEEKLY_LIMIT" >&2; over=1; }
exit $over
