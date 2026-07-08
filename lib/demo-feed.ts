import type { Platform } from "@/lib/shift";
import type { RideStyle, Vehicle } from "@/lib/profile";
import { addDays } from "@/lib/stats";

// タイムラインのβプレビュー用サンプルライダー。
// ⚠️ これはデモデータ。Supabase接続(W3)後に実ユーザーのフィードへ差し替える。
// UI上でも「サンプル」であることを必ず明示すること(偽のソーシャルプルーフにしない)。

export type FeedItem = {
  id: string;
  riderName: string;
  isDemo: boolean;
  isMe: boolean;
  rankTitle: string;
  style: RideStyle;
  vehicle: Vehicle;
  platform: Platform;
  date: string; // YYYY-MM-DD
  hoursAgo: number;
  revenue_yen: number;
  deliveries: number | null;
  minutes_worked: number | null;
  weeklyGoal: number;
  weekProgress: number; // 0..1超あり
};

type DemoRider = {
  name: string;
  rankTitle: string;
  style: RideStyle;
  vehicle: Vehicle;
  weeklyGoal: number;
  platform: Platform;
};

const RIDERS: DemoRider[] = [
  { name: "夜行のケンタ", rankTitle: "ハイウェイスター", style: "fulltime", vehicle: "motorcycle", weeklyGoal: 80000, platform: "uber" },
  { name: "ママチャリ小雪", rankTitle: "街のランナー", style: "side", vehicle: "bicycle", weeklyGoal: 30000, platform: "demaecan" },
  { name: "西口のタカ", rankTitle: "ロードランナー", style: "fulltime", vehicle: "moped", weeklyGoal: 60000, platform: "uber" },
  { name: "副業リョウ", rankTitle: "かけだし配達員", style: "side", vehicle: "bicycle", weeklyGoal: 20000, platform: "menu" },
  { name: "週末ノリコ", rankTitle: "街のランナー", style: "weekend", vehicle: "moped", weeklyGoal: 25000, platform: "rocketnow" },
  { name: "軽貨物ゴロー", rankTitle: "配達マスター", style: "fulltime", vehicle: "kei", weeklyGoal: 120000, platform: "other" },
  { name: "つばさ", rankTitle: "かけだし配達員", style: "side", vehicle: "bicycle", weeklyGoal: 15000, platform: "uber" },
];

// 擬似乱数(日付+indexで決定的に。リロードで変わらない)
function det(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function buildDemoFeed(today: string): FeedItem[] {
  const daySeed = Number(today.replaceAll("-", ""));
  const items: FeedItem[] = [];

  RIDERS.forEach((r, i) => {
    // 各ライダー、直近2日で1〜2件
    const count = det(daySeed + i) > 0.45 ? 2 : 1;
    for (let n = 0; n < count; n++) {
      const back = n === 0 ? 0 : 1;
      const base = 4000 + det(daySeed + i * 7 + n * 3) * (r.weeklyGoal / 4);
      const revenue = Math.round(base / 10) * 10;
      const minutes = 120 + Math.round(det(daySeed + i * 13 + n) * 240);
      const weekProgress =
        (0.25 + det(daySeed + i * 5 + n) * 0.85) * (n === 0 ? 1 : 0.8);
      items.push({
        id: `demo-${i}-${n}`,
        riderName: r.name,
        isDemo: true,
        isMe: false,
        rankTitle: r.rankTitle,
        style: r.style,
        vehicle: r.vehicle,
        platform: r.platform,
        date: addDays(today, -back),
        hoursAgo: back * 24 + 1 + Math.round(det(daySeed + i * 3 + n) * 10),
        revenue_yen: revenue,
        deliveries: Math.max(3, Math.round(revenue / 550)),
        minutes_worked: minutes,
        weeklyGoal: r.weeklyGoal,
        weekProgress: Math.min(weekProgress, 1.3),
      });
    }
  });

  return items.sort((a, b) => a.hoursAgo - b.hoursAgo);
}
