# RUNBOOK.md — Agentic OSの日常運用(BUILD 8)

オーナー(人間)がやることは1日5分。全コマンドはrepo直下で実行。

## 毎日のルーティン
```
make goals     # standing goalsが生きているか(壊れていたら最優先で修復)
make budget    # 予算内か
make tick      # 手動1周(やることが無ければtriageが空で終わる)
make queue     # 人間レビュー待ちを確認 → 承認 or 却下
```

## 週次のルーティン
```
make trust     # skill別の成績。昇格候補(10runs/90%)がいるか確認
make audit     # dispatch履歴に不審な動きがないか
```
- `agent-os/memory/STATE.md` のASSUMPTION行を読み、間違った仮定を訂正する
- `HUMAN_DECISIONS_DRAFT.md` を1セクションでも「確定」に変える

## レビューの仕方(make queueに出たら)
1. worktreeのdiffを読む(`git -C <worktree> diff main`)
2. 良ければ手動でmerge、ダメなら `trust-log.sh <skill> fail` を記録して破棄
3. merge後 `trust-log.sh <skill> pass` を記録

## 事故対応
- **standing goal VIOLATED**: 他の全作業を止めて修復。直せない場合はrevert
- **予算超過(BUDGET EXCEEDED)**: その日はtickしない。翌日BUDGET.mdを見直す
- **ALERT: demoted to watch**: そのskillの直近failのdiffを読み、SKILL.mdのStepsを修正

## 絶対にやらないこと(CLAUDE.md NEVER)
cron自動tick / auto-PR / auto-merge / auto-deploy / auth・billing・schema無人変更 /
スクレイピング / スコープ外機能。これらは「便利そう」でも8/4ゴールに寄与しない。

## ローンチモード(2026-07-10〜)
機能は凍結済み(goals 08/09が番人)。tickに渡してよい仕事は
**バグ修正/解析精度/表示崩れ/文言/速度** と、W3(Supabase・同席)/W4(Stripe・承認)の準備だけ。
「この機能があれば売れるのでは」と思ったら、それは営業から逃げているサイン。CLAUDE.md冒頭を読み直す。
