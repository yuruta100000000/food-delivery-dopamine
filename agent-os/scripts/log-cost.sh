#!/usr/bin/env bash
# log-cost.sh — API利用コストの記録(BUILD 6)
# usage: log-cost.sh <stage> <usd>
# 例: log-cost.sh conductor 0.35
# 注: 値はstage別の概算(ENGINE.md参照)。実測が取れる環境になったら置き換える。
set -euo pipefail
F="$(dirname "$0")/../memory/usage.log"
[ $# -ge 2 ] || { echo "usage: log-cost.sh <stage> <usd>" >&2; exit 1; }
printf "%s\t%s\t%s\n" "$(date -Iseconds)" "$1" "$2" >> "$F"
