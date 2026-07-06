// 週間目標(Duolingoのdaily goal相当の刺激メカニクス)。
// 端末ローカルに保存する軽量実装。

const KEY = "delilog.weeklyGoal.v1";

export const GOAL_PRESETS = [10000, 20000, 30000, 50000] as const;

export function getWeeklyGoal(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function setWeeklyGoal(yen: number): void {
  if (yen > 0) window.localStorage.setItem(KEY, String(Math.floor(yen)));
}
