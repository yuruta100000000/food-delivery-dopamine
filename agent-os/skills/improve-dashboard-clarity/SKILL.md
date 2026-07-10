---
name: improve-dashboard-clarity
description: レポートの明瞭化
when: 数字の意味が一目で伝わらないとき
tier: watch
---

## Steps
1. app/report/page.tsx の該当セクションを読む\n2. ラベル・桁・比較の見せ方を改善\n3. 390pxで確認

## Never
- MVP範囲(スクショ取り込み/レポート/シェアカード/刺激レイヤー)の外に出ない
- auth / billing / schema / storage policy / secrets / スクレイピングに触れない
- テストを弱体化・削除しない
- チャートの1軸原則を守る(2軸チャート禁止)

## Done when
- 変更セクションが390pxで読みやすい
