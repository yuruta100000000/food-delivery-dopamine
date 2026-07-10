---
name: fix-typecheck
description: TypeScriptエラーの修正
when: npm run typecheck が落ちたとき
tier: watch
---

## Steps
1. tsc出力の該当ファイルを読む\n2. 型を正しく直す(anyで逃げない)\n3. verify.shを再実行

## Never
- MVP範囲(スクショ取り込み/レポート/シェアカード/刺激レイヤー)の外に出ない
- auth / billing / schema / storage policy / secrets / スクレイピングに触れない
- テストを弱体化・削除しない
- any / ts-ignore で握りつぶさない

## Done when
- npm run typecheck が通る
