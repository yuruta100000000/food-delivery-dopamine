import type { Shift } from "@/lib/storage";
import type { Platform } from "@/lib/shift";

// ダッシュボード・シェアカード共通の集計ロジック。
// 日付はすべて Asia/Tokyo の YYYY-MM-DD 文字列で扱う。

export function todayIso(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatYen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return `${mm}分`;
  return `${h}時間${mm > 0 ? `${mm}分` : ""}`;
}

export function hourlyRate(revenueYen: number, minutes: number): number {
  return Math.round((revenueYen / minutes) * 60);
}

export function sumRevenue(shifts: Shift[]): number {
  return shifts.reduce((acc, s) => acc + s.revenue_yen, 0);
}

export function sumDeliveries(shifts: Shift[]): number {
  return shifts.reduce((acc, s) => acc + (s.deliveries ?? 0), 0);
}

export function sumMinutes(shifts: Shift[]): number {
  return shifts.reduce((acc, s) => acc + (s.minutes_worked ?? 0), 0);
}

export function sumDistance(shifts: Shift[]): number {
  return (
    Math.round(shifts.reduce((acc, s) => acc + (s.distance_km ?? 0), 0) * 10) / 10
  );
}

// 直近N日の日別走行距離
export function dailyDistance(
  shifts: Shift[],
  today: string,
  days: number,
): { key: string; total: number }[] {
  const totals = new Map<string, number>();
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    keys.push(date);
    totals.set(date, 0);
  }
  for (const s of shifts) {
    if (totals.has(s.date)) {
      totals.set(s.date, totals.get(s.date)! + (s.distance_km ?? 0));
    }
  }
  return keys.map((d) => ({
    key: `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`,
    total: Math.round(totals.get(d)! * 10) / 10,
  }));
}

export function shiftsOn(shifts: Shift[], dateIso: string): Shift[] {
  return shifts.filter((s) => s.date === dateIso);
}

export function shiftsBetween(
  shifts: Shift[],
  fromIso: string,
  toIso: string,
): Shift[] {
  return shifts.filter((s) => s.date >= fromIso && s.date <= toIso);
}

// その週の月曜日(週間集計・週間目標の起点)
export function weekStartOf(today: string): string {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=日
  return addDays(today, dow === 0 ? -6 : 1 - dow);
}

// 連続稼働日数: 今日から遡って連続で記録がある日数。
// 今日まだ記録がない場合は昨日からの連続を数える(その日の稼働前に0に見えないように)。
export function computeStreak(shifts: Shift[], today: string): number {
  const days = new Set(shifts.map((s) => s.date));
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// 全体の時給換算: 稼働時間が記録されているシフトのみで計算
export function overallHourlyRate(shifts: Shift[]): number | null {
  const withMinutes = shifts.filter(
    (s) => s.minutes_worked != null && s.minutes_worked > 0,
  );
  const minutes = sumMinutes(withMinutes);
  if (minutes === 0) return null;
  return hourlyRate(sumRevenue(withMinutes), minutes);
}

export type TrendPoint = {
  key: string; // 表示ラベル
  total: number;
  byPlatform: Partial<Record<Platform, number>>;
};

function accumulate(
  points: Map<string, TrendPoint>,
  key: string,
  shift: Shift,
) {
  const point = points.get(key);
  if (!point) return;
  point.total += shift.revenue_yen;
  point.byPlatform[shift.platform] =
    (point.byPlatform[shift.platform] ?? 0) + shift.revenue_yen;
}

// 直近N日の日別売上
export function dailyTrend(shifts: Shift[], today: string, days: number): TrendPoint[] {
  const points = new Map<string, TrendPoint>();
  const dateKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    dateKeys.push(date);
    points.set(date, {
      key: `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`,
      total: 0,
      byPlatform: {},
    });
  }
  for (const s of shifts) {
    if (points.has(s.date)) accumulate(points, s.date, s);
  }
  return dateKeys.map((d) => points.get(d)!);
}

// 直近N週の週別売上(月曜始まり)
export function weeklyTrend(shifts: Shift[], today: string, weeks: number): TrendPoint[] {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=日
  const monday = addDays(today, dow === 0 ? -6 : 1 - dow);
  const points = new Map<string, TrendPoint>();
  const weekStarts: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(monday, -7 * i);
    weekStarts.push(start);
    points.set(start, {
      key: `${Number(start.slice(5, 7))}/${Number(start.slice(8, 10))}〜`,
      total: 0,
      byPlatform: {},
    });
  }
  for (const s of shifts) {
    for (let i = weekStarts.length - 1; i >= 0; i--) {
      if (s.date >= weekStarts[i] && s.date <= addDays(weekStarts[i], 6)) {
        accumulate(points, weekStarts[i], s);
        break;
      }
    }
  }
  return weekStarts.map((w) => points.get(w)!);
}

// 直近Nか月の月別売上
export function monthlyTrend(shifts: Shift[], today: string, months: number): TrendPoint[] {
  const points = new Map<string, TrendPoint>();
  const monthKeys: string[] = [];
  const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const key = d.toISOString().slice(0, 7); // YYYY-MM
    monthKeys.push(key);
    points.set(key, { key: `${d.getUTCMonth() + 1}月`, total: 0, byPlatform: {} });
  }
  for (const s of shifts) {
    const key = s.date.slice(0, 7);
    if (points.has(key)) accumulate(points, key, s);
  }
  return monthKeys.map((k) => points.get(k)!);
}

// プラットフォーム別の売上内訳(期間指定)
export function platformBreakdown(shifts: Shift[]): { platform: Platform; total: number }[] {
  const totals = new Map<Platform, number>();
  for (const s of shifts) {
    totals.set(s.platform, (totals.get(s.platform) ?? 0) + s.revenue_yen);
  }
  return [...totals.entries()]
    .map(([platform, total]) => ({ platform, total }))
    .sort((a, b) => b.total - a.total);
}
