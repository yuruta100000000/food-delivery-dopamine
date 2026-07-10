# sparring.md — 敵対レビュー(optional / **無効**)

status: DISABLED

## 何をするか
worker成果物に対し、別席のモデルが「壊す側」として攻撃(エッジケース、規約違反、
個人情報の混入、スコープ逸脱)を列挙し、conductorが反映可否を判断する。

## 導入条件
- skill が queue tier に昇格し始めた(=人間レビューが薄くなる)タイミング
- 特に improve-parser-prompt(個人情報リスク)と draft-payment-ask-copy(事業リスク)が対象

## なぜ今入れないか
全skillがwatch tierで人間が全件レビューするため、敵対役は人間が兼ねる方が安い。
