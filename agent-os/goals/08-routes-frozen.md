# goal: routes-frozen

機能凍結(2026-07-10 オーナー判断・CLAUDE.md参照)。
画面とAPIは routes.allowlist にあるものが全て。増えても減ってもfail。
変更したい場合は人間がallowlistを更新する(=承認の証跡になる)。

predicate: diff <(find app \( -name page.tsx -o -name route.ts -o -name route.tsx \) | sort) agent-os/goals/routes.allowlist
timeout: 10
severity: blocker
