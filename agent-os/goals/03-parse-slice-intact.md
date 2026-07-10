# goal: parse-slice-intact

MVPの心臓部「スクショ→AI解析」の縦一本が構造として存在する。
(実際のAPI呼び出しはこの環境からは届かないため、ファイル存在のみをread-onlyで確認)

predicate: test -f app/api/parse/route.ts && test -f prompts/parse-screenshot.ts && test -f lib/shift.ts
timeout: 10
severity: blocker
