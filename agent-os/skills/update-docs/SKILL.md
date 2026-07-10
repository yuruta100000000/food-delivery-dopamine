---
name: update-docs
description: ドキュメント更新
when: 実装と文書がズレたとき
tier: watch
---

## Steps
1. README / CLAUDE.md / agent-os内の該当箇所を特定\n2. 実態に合わせ最小差分で更新

## Never
- MVP範囲(スクショ取り込み/レポート/シェアカード/刺激レイヤー)の外に出ない
- auth / billing / schema / storage policy / secrets / スクレイピングに触れない
- テストを弱体化・削除しない
- CLAUDE.mdのNEVER/スコープを勝手に緩めない

## Done when
- 文書が現状と一致している
