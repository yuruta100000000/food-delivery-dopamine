# goal: typecheck-clean

TypeScriptの型エラーがゼロ。
注意: `.next/types` の鮮度に依存するため、01-app-builds(=next build)の後に走る前提。
ファイル名順で実行されるので順序は保たれる。

predicate: npm run typecheck
timeout: 180
severity: blocker
