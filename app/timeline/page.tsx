"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import { IconFlame } from "@/components/icons";
import { PLATFORMS } from "@/lib/shift";
import { listShifts, type Shift } from "@/lib/storage";
import { getWeeklyGoal } from "@/lib/goal";
import { getProfile, styleLabel, vehicleLabel, type Profile } from "@/lib/profile";
import { computeLevel } from "@/lib/level";
import { buildDemoFeed, type FeedItem } from "@/lib/demo-feed";
import {
  formatMinutes,
  formatYen,
  hourlyRate,
  shiftsBetween,
  sumRevenue,
  todayIso,
  weekStartOf,
} from "@/lib/stats";

// タイムライン: 同じ夜を走る仲間のログが流れる。
// ⚠️ βプレビュー: 仲間のログはサンプル。Supabase接続後に実ユーザーへ差し替える。

type Filter = "all" | "goal" | "revenue";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "goal", label: "目標が近い" },
  { value: "revenue", label: "同じ売上帯" },
];

function timeAgo(hoursAgo: number): string {
  if (hoursAgo < 1) return "いま";
  if (hoursAgo < 24) return `${Math.round(hoursAgo)}時間前`;
  return `${Math.floor(hoursAgo / 24)}日前`;
}

function FeedCard({
  item,
  cheered,
  onCheer,
  delay,
}: {
  item: FeedItem;
  cheered: boolean;
  onCheer: () => void;
  delay: number;
}) {
  const hourly =
    item.minutes_worked && item.minutes_worked > 0
      ? hourlyRate(item.revenue_yen, item.minutes_worked)
      : null;
  const platformLabel = PLATFORMS.find((p) => p.value === item.platform)?.label;

  return (
    <li
      className="hairline-b anim-rise py-5"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center gap-3">
        <Avatar name={item.riderName} me={item.isMe} />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2 text-sm font-bold text-white">
            <span className="truncate">{item.riderName}</span>
            {item.isMe && (
              <span className="kicker shrink-0 text-orange-400/90">You</span>
            )}
            {item.isDemo && (
              <span className="kicker shrink-0 text-white/20">Sample</span>
            )}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-white/35">
            {item.rankTitle}・{styleLabel(item.style)}・{vehicleLabel(item.vehicle)}
          </p>
        </div>
        <p className="num shrink-0 text-[10px] text-white/25">
          {timeAgo(item.hoursAgo)}
        </p>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <p className="num text-[26px] leading-none text-white">
          <span className="mr-0.5 text-base text-white/45">¥</span>
          {item.revenue_yen.toLocaleString("ja-JP")}
        </p>
        <p className="num text-[10px] text-white/35">
          {platformLabel}
          {item.deliveries != null && ` ・ ${item.deliveries}件`}
          {item.minutes_worked != null &&
            item.minutes_worked > 0 &&
            ` ・ ${formatMinutes(item.minutes_worked)}`}
          {hourly != null && ` ・ 時給${formatYen(hourly)}`}
        </p>
      </div>

      {/* 週目標の進み */}
      <div className="mt-3.5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10">
          <div
            className="h-px bg-orange-500/80"
            style={{
              width: `${Math.min(item.weekProgress * 100, 100)}%`,
              boxShadow: "0 0 6px rgba(249,115,22,0.45)",
            }}
          />
        </div>
        <p className="num text-[10px] text-white/35">
          週目標 {Math.round(item.weekProgress * 100)}%
        </p>
        <button
          type="button"
          onClick={onCheer}
          aria-label="エールを送る"
          className={`row-press flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
            cheered
              ? "border-orange-500/60 text-orange-400"
              : "border-white/12 text-white/40"
          }`}
        >
          <IconFlame size={13} />
          エール
        </button>
      </div>
    </li>
  );
}

export default function Timeline() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [cheers, setCheers] = useState<Set<string>>(new Set());

  const today = todayIso();

  useEffect(() => {
    listShifts()
      .then(setShifts)
      .catch(() => setShifts([]));
    setProfile(getProfile());
    setGoal(getWeeklyGoal());
  }, []);

  const feed = useMemo(() => {
    const weekTotal = sumRevenue(shiftsBetween(shifts, weekStartOf(today), today));
    const myGoal = goal ?? 0;
    const rankTitle = computeLevel(sumRevenue(shifts)).title;
    const name = profile?.name ?? "あなた";

    // 自分の直近ログ(本物)
    const mine: FeedItem[] = shifts.slice(0, 3).map((s, i) => ({
      id: `me-${s.id}`,
      riderName: name,
      isDemo: false,
      isMe: true,
      rankTitle,
      style: profile?.style ?? "side",
      vehicle: profile?.vehicle ?? "bicycle",
      platform: s.platform,
      date: s.date,
      hoursAgo: s.date === today ? 0.5 + i : 20 + i * 8,
      revenue_yen: s.revenue_yen,
      deliveries: s.deliveries,
      minutes_worked: s.minutes_worked,
      weeklyGoal: myGoal,
      weekProgress: myGoal > 0 ? weekTotal / myGoal : 0,
    }));

    const demo = buildDemoFeed(today);

    // フィルタ(自分は常に表示)
    const myAvgDaily =
      shifts.length > 0
        ? sumRevenue(shifts) / new Set(shifts.map((s) => s.date)).size
        : 8000;
    const filtered = demo.filter((d) => {
      if (filter === "goal") {
        if (myGoal === 0) return true;
        return Math.abs(d.weeklyGoal - myGoal) <= 15000;
      }
      if (filter === "revenue") {
        return (
          d.revenue_yen >= myAvgDaily * 0.6 && d.revenue_yen <= myAvgDaily * 1.6
        );
      }
      return true;
    });

    return [...mine, ...filtered].sort((a, b) => a.hoursAgo - b.hoursAgo);
  }, [shifts, profile, goal, filter, today]);

  function cheer(id: string) {
    setCheers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-28 pt-6">
      <div className="stars absolute inset-x-0 top-0 h-56" aria-hidden />

      <header className="anim-rise relative mb-6">
        <p className="kicker text-white/35">Timeline</p>
        <h1 className="display mt-1.5 text-[32px] text-white">仲間の走り</h1>
        <p className="mt-2 text-[11px] leading-relaxed text-white/30">
          βプレビュー — 仲間のログはサンプルです。正式公開後、
          ここに本物の配達員の記録が流れます。
        </p>
      </header>

      {/* フィルタ */}
      <div className="anim-rise mb-2 flex gap-2" style={{ animationDelay: "0.08s" }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`row-press rounded-full border px-4 py-1.5 text-[11px] font-bold transition ${
              filter === f.value
                ? "border-orange-500/70 text-orange-400"
                : "border-white/12 text-white/45"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="relative">
        {feed.map((item, i) => (
          <FeedCard
            key={item.id}
            item={item}
            cheered={cheers.has(item.id)}
            onCheer={() => cheer(item.id)}
            delay={0.12 + Math.min(i, 8) * 0.05}
          />
        ))}
      </ul>

      {feed.length === 0 && (
        <p className="py-16 text-center text-sm text-white/30">
          この条件のライダーはまだいません
        </p>
      )}

      <BottomNav />
    </main>
  );
}
