---
name: improve-share-card-copy
description: シェアカード文言の改善
when: X投稿時の見栄え・文言に改善余地があるとき
tier: watch
---

## Steps
1. app/api/og/route.tsx と /s の文言を読む\n2. 数字が主役のまま文言を磨く\n3. OG画像を生成して目視確認

## Never
- MVP範囲(スクショ取り込み/レポート/シェアカード/刺激レイヤー)の外に出ない
- auth / billing / schema / storage policy / secrets / スクレイピングに触れない
- テストを弱体化・削除しない
- 日本語をOG画像に入れない(フォント未対応でtofu化する)

## Done when
- /api/og が200で意図した画像を返す
