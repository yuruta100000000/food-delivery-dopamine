---
name: improve-upload-flow
description: アップロード導線の改善
when: 記録開始〜保存までに摩擦があるとき
tier: watch
---

## Steps
1. app/page.tsx の該当フローを読む\n2. タップ数・迷いを減らす最小変更\n3. 390pxで確認

## Never
- MVP範囲(スクショ取り込み/レポート/シェアカード/刺激レイヤー)の外に出ない
- auth / billing / schema / storage policy / secrets / スクレイピングに触れない
- テストを弱体化・削除しない
- 保存データの形(lib/storage.ts)を変えない

## Done when
- フローが1画面で完結し、verify.shが通る
