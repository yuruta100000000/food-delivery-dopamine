---
name: triage-user-feedback
description: ユーザーフィードバック分類
when: テストユーザーの声が届いたとき
tier: watch
---

## Steps
1. 声をactionable / informational に分類\n2. actionableはMVP直結かを判定\n3. memory/STATE.md に要約を記録

## Never
- MVP範囲(スクショ取り込み/レポート/シェアカード/刺激レイヤー)の外に出ない
- auth / billing / schema / storage policy / secrets / スクレイピングに触れない
- テストを弱体化・削除しない
- 勝手にユーザーへ返信しない

## Done when
- STATE.mdに分類済みリストが残っている
