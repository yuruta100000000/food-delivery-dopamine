import type { Shift } from "@/lib/storage";
import { computeStreak, sumDistance } from "@/lib/stats";

// レベル&実績システム(ゲーミフィケーションの核)。
// XP = 累計売上(円)。1円稼ぐ = 1XP。データはshiftsから毎回導出する
// (別途の保存を持たないので、記録の修正・削除とも常に整合する)。

// レベルnに上がるのに必要な累計XP。序盤は数日でポンポン上がり、後半は重くなる曲線
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round((10000 * Math.pow(level - 1, 1.55)) / 1000) * 1000;
}

const TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: "ルーキー" },
  { minLevel: 3, title: "かけだし配達員" },
  { minLevel: 5, title: "街のランナー" },
  { minLevel: 8, title: "ロードランナー" },
  { minLevel: 12, title: "ハイウェイスター" },
  { minLevel: 16, title: "配達マスター" },
  { minLevel: 22, title: "伝説の配達員" },
  { minLevel: 30, title: "配達の神" },
];

export type LevelInfo = {
  level: number;
  title: string;
  totalXp: number;
  // 現レベル帯での進捗
  intoLevel: number;
  toNext: number;
  progress: number; // 0..1
};

export function computeLevel(totalXp: number): LevelInfo {
  let level = 1;
  while (totalXp >= xpForLevel(level + 1)) level += 1;
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const title = [...TITLES].reverse().find((t) => level >= t.minLevel)!.title;
  return {
    level,
    title,
    totalXp,
    intoLevel: totalXp - floor,
    toNext: ceil - totalXp,
    progress: Math.min((totalXp - floor) / (ceil - floor), 1),
  };
}

// ---- 実績(マイルストーン) ----

export type Milestone = {
  id: string;
  emoji: string;
  label: string;
  achieved: (agg: Aggregates) => boolean;
};

export type Aggregates = {
  totalRevenue: number;
  totalDeliveries: number;
  totalDistance: number;
  totalRecords: number;
  streak: number;
};

export function aggregate(shifts: Shift[], today: string): Aggregates {
  return {
    totalRevenue: shifts.reduce((a, s) => a + s.revenue_yen, 0),
    totalDeliveries: shifts.reduce((a, s) => a + (s.deliveries ?? 0), 0),
    totalDistance: sumDistance(shifts),
    totalRecords: shifts.length,
    streak: computeStreak(shifts, today),
  };
}

const yen = (n: number) => n.toLocaleString("ja-JP");

export const MILESTONES: Milestone[] = [
  { id: "first", emoji: "🎬", label: "はじめての記録", achieved: (a) => a.totalRecords >= 1 },
  { id: "rev-10k", emoji: "💰", label: "累計 ¥10,000", achieved: (a) => a.totalRevenue >= 10_000 },
  { id: "rev-50k", emoji: "💰", label: "累計 ¥50,000", achieved: (a) => a.totalRevenue >= 50_000 },
  { id: "rev-100k", emoji: "💎", label: "累計 ¥100,000", achieved: (a) => a.totalRevenue >= 100_000 },
  { id: "rev-300k", emoji: "💎", label: "累計 ¥300,000", achieved: (a) => a.totalRevenue >= 300_000 },
  { id: "rev-1m", emoji: "👑", label: `累計 ¥${yen(1_000_000)}`, achieved: (a) => a.totalRevenue >= 1_000_000 },
  { id: "del-50", emoji: "📦", label: "配達 50件", achieved: (a) => a.totalDeliveries >= 50 },
  { id: "del-100", emoji: "📦", label: "配達 100件", achieved: (a) => a.totalDeliveries >= 100 },
  { id: "del-500", emoji: "🚀", label: "配達 500件", achieved: (a) => a.totalDeliveries >= 500 },
  { id: "del-1000", emoji: "🚀", label: "配達 1,000件", achieved: (a) => a.totalDeliveries >= 1_000 },
  { id: "km-50", emoji: "🛵", label: "走行 50km", achieved: (a) => a.totalDistance >= 50 },
  { id: "km-200", emoji: "🛵", label: "走行 200km", achieved: (a) => a.totalDistance >= 200 },
  { id: "km-1000", emoji: "🌏", label: "走行 1,000km", achieved: (a) => a.totalDistance >= 1_000 },
  { id: "streak-3", emoji: "🔥", label: "3日連続稼働", achieved: (a) => a.streak >= 3 },
  { id: "streak-7", emoji: "🔥", label: "7日連続稼働", achieved: (a) => a.streak >= 7 },
  { id: "streak-30", emoji: "🌋", label: "30日連続稼働", achieved: (a) => a.streak >= 30 },
];

export function unlockedIds(agg: Aggregates): Set<string> {
  return new Set(MILESTONES.filter((m) => m.achieved(agg)).map((m) => m.id));
}

// 保存前後の集計を比べて「今回新しく解除された実績」を返す
export function newlyUnlocked(before: Aggregates, after: Aggregates): Milestone[] {
  const prev = unlockedIds(before);
  return MILESTONES.filter((m) => !prev.has(m.id) && m.achieved(after));
}
