# goal: no-scraping-deps

スクレイピング/自動ログイン系の依存がpackage.jsonに入っていない。
(CLAUDE.md NEVER: 規約リスクのため絶対にやらない)
注: playwright-coreはdevDependenciesにも入れていない(検証はグローバルの/opt/pw-browsersを使用)。
もし将来E2Eテスト用に追加する場合は、この述語を「dependenciesのみ検査」に人間が更新すること。

predicate: ! grep -qiE '"(puppeteer|playwright|selenium|cheerio|crawlee)' package.json
timeout: 10
severity: blocker
