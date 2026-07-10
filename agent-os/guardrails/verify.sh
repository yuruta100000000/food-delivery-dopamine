#!/usr/bin/env bash
# verify.sh — 決定論的ゲート(BUILD 2)。最後の一票はこのスクリプトが持つ。
# 使い方: ./agent-os/guardrails/verify.sh  (または make verify)
# 注意: package.json に存在する script だけ実行する。
#   - build を先に実行する(next build が .next/types を再生成するため、
#     typecheck を build 前に走らせると古いキャッシュで偽の失敗が出る)。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

has_script() {
  node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$1'] ? 0 : 1)"
}

if [ -f package.json ]; then
  if has_script build; then
    echo "[verify] npm run build"
    npm run build
  fi
  if has_script typecheck; then
    echo "[verify] npm run typecheck"
    npm run typecheck
  fi
  if has_script lint; then
    echo "[verify] npm run lint"
    npm run lint
  fi
  if has_script test; then
    echo "[verify] npm test"
    npm test
  fi
else
  echo "No package.json found. Skipping npm checks."
fi

echo "[verify] OK"
