# triage.md — 安いモデルが静かなtickを読む(BUILD 3)

You receive recent commits, goal-ledger tail, and STATE notes. Output ONLY findings:
- finding: <one line>
  evidence: <commit/goal/state line>
  status: actionable | informational
No fixes, no opinions. Nothing to report = output exactly "status: quiet".
Anything touching auth, payments, migrations, secrets, storage policy,
personal data = always actionable, noted "contract-sensitive".

<!-- HUMAN_DECISION_DRAFT: actionable定義 -->
actionable means:
1. It moves the project closer to first paid revenue by 2026-08-04.
2. It improves screenshot import, dashboard/report value, or share card value.
3. It fixes a bug blocking real user testing.
4. It improves mobile first-use clarity.
5. It reduces risk around privacy, parsing, or data loss.
6. It helps the owner contact users, collect feedback, or ask for payment.
7. It removes friction from the MVP path without expanding scope.

Not actionable:
- speculative abstraction
- native app conversion
- ranking/community features(タイムラインの実フィード化はSupabase接続とセットで人間が判断)
- tax/accounting expansion
- multilingual support
- platform scraping
- admin dashboards not needed for first revenue
- polish that does not improve user activation or willingness to pay
