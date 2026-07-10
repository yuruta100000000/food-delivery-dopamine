# goal: deps-frozen

機能凍結(2026-07-10)。npm依存は deps.allowlist にあるものが全て。
追加したい場合は先に提案→人間承認→allowlist更新の順(CLAUDE.md NEVER)。

predicate: diff <(node -e "const p=require('./package.json');console.log([...Object.keys(p.dependencies||{}),...Object.keys(p.devDependencies||{})].sort().join(String.fromCharCode(10)))") agent-os/goals/deps.allowlist
timeout: 15
severity: blocker
