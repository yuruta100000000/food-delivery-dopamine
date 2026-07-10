---
name: add-parser-fixture
description: 解析fixtureの追加
when: 実スクショの解析成功/失敗例が得られたとき
tier: watch
---

## Steps
1. 実例から個人情報を除去した記述を作る\n2. prompts/parse-screenshot.ts のfew-shotに追加\n3. 既存例と矛盾しないか確認

## Never
- MVP範囲(スクショ取り込み/レポート/シェアカード/刺激レイヤー)の外に出ない
- auth / billing / schema / storage policy / secrets / スクレイピングに触れない
- テストを弱体化・削除しない
- スクショ原本に含まれる注文者情報を書き写さない

## Done when
- few-shotが増え、既存例と整合している
