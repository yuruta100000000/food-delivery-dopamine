# goal: four-tabs-intact

4タブ構造(タイムライン/記録する/レポート/マイページ)が壊れていない。
(2026-07-08 オーナー指示の再設計。CLAUDE.md参照)

predicate: test -f app/timeline/page.tsx && test -f app/page.tsx && test -f app/report/page.tsx && test -f app/me/page.tsx && test -f components/BottomNav.tsx
timeout: 10
severity: blocker
