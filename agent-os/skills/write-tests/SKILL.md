---
name: write-tests
description: テストの追加
when: 重要ロジックにテストがないとき
tier: watch
---

## Steps
1. 対象関数の仕様を読む(lib/stats, lib/level等)\n2. 既存スタックのみでテストを書く(新規依存は提案止まり)\n3. 実行して緑を確認

## Never
- MVP範囲(スクショ取り込み/レポート/シェアカード/刺激レイヤー)の外に出ない
- auth / billing / schema / storage policy / secrets / スクレイピングに触れない
- テストを弱体化・削除しない
- テスト用に新規依存を勝手に追加しない(提案のみ)

## Done when
- 追加テストが実行され、passする
