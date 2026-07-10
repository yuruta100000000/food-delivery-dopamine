# compost.md — 記憶の堆肥化(optional / **無効**)

status: DISABLED

## 何をするか
STATE.md・dispatch.tsv・goal-ledger.tsvが肥大したら、古いエントリを
週次で要約して `memory/compost/YYYY-WW.md` に圧縮し、現役ファイルを軽く保つ。

## 導入条件
- STATE.md が 200行 を超えた、または tick履歴が30日分を超えた

## なぜ今入れないか
まだbootstrap直後で記憶がほぼ空。圧縮する対象がない。
