# ENGINE.md — Agentic OS エンジン設定(BUILD 0)

目的: このリポジトリでAIを動かすときのモデル設定・API作法・裁量方針。
使い方: loop.sh・skills・人間のClaude Codeセッション、すべてこの設定に従う。

<!-- HUMAN_DECISION_DRAFT: モデル役割分担。あとで人間が修正可能 -->
## Model Dispatch
- Fable 5 / Opus級(top reasoning):
  - 事業判断
  - 設計レビュー
  - Agentic OSのconductor(1タスク選定)
  - maker/checker standoff解決
  - ユーザーに見えるUI/UX/コピーの最終品質レビュー
  - 独立verifier(fresh context)
- Sonnet級(worker):
  - 実装
  - テスト追加
  - リファクタ
  - 小〜中規模のUI修正
  - parser / report / share card 周辺のMVP実装
- cheap model(Haiku級):
  - triage(静かなtickの読み取り)
  - ログ要約
  - issue / user feedback 分類
- bash / tests(deterministic gate):
  - 最終判定。`agent-os/guardrails/verify.sh` が最後の一票を持つ
  - done判定・standing goal検証(`agent-os/verify-goals.sh`)

## Effort方針
- conductor: high(ループ内でxhighは使わない。xhighは単発の設計レビューのみ)
- worker: medium〜high
- triage: low
- verifier: high

## max_tokens方針
- conductor / verifier の `claude -p` 呼び出しは大きめに(目安64k)。
  Fable系はthinking+本文の合計がmax_tokensでキャップされるため、
  低すぎると途中で切れる。

## Refusal時の扱い
- Fable 5のrefusalは **HTTP 200 + stop_reason: "refusal"** で返る。
  exit codeではなくstop_reasonを見ること(loop.shはjson出力を確認する)。
- 発生したら: そのitemを止め、STATE.mdに記録し、Opus級に振り直す
  (自動フォールバックは設定しない。手動tick運用の間は人間が確認)。
- 同じskillで再発する場合: そのskillのプロンプトを監査する(下記)。

## Reasoning Echo禁止
- どのプロンプト・skillにも「思考過程を見せて」「reasoningを説明して」を
  書かない。Fable 5では reasoning_extraction カテゴリのrefusalを誘発する。
- 出力に必要なのは結論・差分・PASS/FAILだけ。

## 旧プロンプト監査方針
- 旧モデル向けに書かれた過剰に手続き的なskill/プロンプトはFable 5の出力を
  劣化させる。skillが2回連続failしたら、手順を削る方向で監査する
  (足すのではなく削る)。

## このプロジェクトでのAI裁量方針
- 可逆・MVP範囲内・検証可能なら、質問せず進める。
- 仮定したことは `agent-os/memory/STATE.md` または
  `agent-os/HUMAN_DECISIONS_DRAFT.md` に必ず残す。
- 不可逆・高リスク(secret / DB schema / Auth / Billing / Storage方針 /
  本番deploy / スクレイピング / 個人情報方針)は止める。
  詳細は `agent-os/contract.md`。
