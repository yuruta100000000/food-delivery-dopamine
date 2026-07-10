# 30_DAY_TRUST_SCHEDULE.md — 信頼を段階的に広げる30日計画(BUILD 8)

<!-- HUMAN_DECISION_DRAFT: 昇格ペースと対象skill。オーナーのレビュー余力に合わせて調整 -->

前提: 起点は 2026-07-10。全skillは watch tier から開始。
昇格は台帳(trust.tsv)の実績が条件を満たしたときのみ。日付が来ても実績が無ければ昇格しない。

## Week 1 (07/10–07/16): 全skill watch・手動tickのみ
- 目的: verify.sh / goals / trust台帳の配管が正しく回るかの確認
- 人間: 全成果物をレビューし、pass/failを必ず記録する(台帳が空だと何も学習されない)
- 期待: fix-typecheck, update-docs あたりが5-8 runs貯まる

## Week 2 (07/17–07/23): 低リスクskillのqueue昇格を検討
- 対象候補: fix-typecheck / fix-lint / update-docs(コード影響が機械検証で完結するもの)
- 条件: 10 runs以上 かつ 90%以上pass(trust-log.sh --tierが機械判定)
- 変化: queue昇格したskillはPR草稿文の準備まで自走。mergeは引き続き人間

## Week 3 (07/24–07/30): UI系skillの実績づくり
- 対象: fix-mobile-layout / improve-upload-flow / improve-dashboard-clarity
- 注意: UIは機械検証が弱い(ビルドが通っても見た目は壊れうる)。実機iPhone確認をpass条件に含める
- 8/4が近い。**新しい自動化より、決済導線(W4)の人間作業を優先**

## Week 4 (07/31–08/06): 凍結と収穫
- 07/31以降、tier昇格を凍結(リリース直前に権限を広げない)
- draft-payment-ask-copy は何runあってもwatchのまま(事業判断そのもの)
- 8/4: 先行課金の獲得に全リソース。Agentic OSはverify/goalsの番人に徹する

## 永久にautoにしないもの
skills/README.md「自動化禁止」リスト参照(auth/billing/schema/deploy/メール送信/決済リンク等)。
