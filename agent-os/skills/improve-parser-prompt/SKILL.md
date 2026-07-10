---
name: improve-parser-prompt
description: 解析プロンプトの改善
when: 解析ミス(金額/日付/件数/時間)が報告されたとき
tier: watch
---

## Steps
1. 誤読の実例を確認\n2. prompts/parse-screenshot.ts のルール/few-shotを修正\n3. 変更理由をコミットメッセージに残す

## Never
- MVP範囲(スクショ取り込み/レポート/シェアカード/刺激レイヤー)の外に出ない
- auth / billing / schema / storage policy / secrets / スクレイピングに触れない
- テストを弱体化・削除しない
- 出力スキーマ(lib/shift.ts)を勝手に変えない(変える場合はqueue)

## Done when
- 該当の誤読ケースがルール/例でカバーされている
