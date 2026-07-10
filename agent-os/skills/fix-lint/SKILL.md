---
name: fix-lint
description: lint/型エラーの修正
when: verify.shがlint/typecheckで落ちたとき
tier: watch
---

## Steps
1. エラー出力を読む\n2. 挙動を変えずに修正\n3. verify.shを再実行

## Never
- MVP範囲(スクショ取り込み/レポート/シェアカード/刺激レイヤー)の外に出ない
- auth / billing / schema / storage policy / secrets / スクレイピングに触れない
- テストを弱体化・削除しない
- lint設定自体を緩めない

## Done when
- npm run typecheck が通る
