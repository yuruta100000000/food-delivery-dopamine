---
name: fix-mobile-layout
description: モバイルUI崩れの修正
when: 390px幅で崩れ・はみ出しが見つかったとき
tier: watch
---

## Steps
1. 該当画面を390px相当で確認\n2. 最小の修正を行う\n3. スクリーンショットで確認

## Never
- MVP範囲(スクショ取り込み/レポート/シェアカード/刺激レイヤー)の外に出ない
- auth / billing / schema / storage policy / secrets / スクレイピングに触れない
- テストを弱体化・削除しない
- デザイン言語(モノクローム夜景+ember)から外れない

## Done when
- 390px幅で崩れが解消している
