"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BottomNav from "@/components/BottomNav";
import { PLATFORMS, type Platform } from "@/lib/shift";
import { deleteShift, listShifts, storageMode, type Shift } from "@/lib/storage";
import { getWeeklyGoal } from "@/lib/goal";
import {
  addDays,
  computeStreak,
  weekStartOf,
  dailyTrend,
  formatMinutes,
  formatYen,
  monthlyTrend,
  overallHourlyRate,
  platformBreakdown,
  shiftsBetween,
  shiftsOn,
  sumMinutes,
  sumRevenue,
  todayIso,
  weeklyTrend,
  type TrendPoint,
} from "@/lib/stats";

// ダッシュボード: 日/週/月の売上推移、プラットフォーム別内訳、時給換算、連続稼働日数。
// 配色は検証済みカテゴリカルパレット(dataviz手法、ダークサーフェスで6チェック通過)。
// CVDがfloor帯のペアがあるため、内訳は必ず直接ラベル(色のみで識別させない)。

const PLATFORM_COLORS: Record<Platform, string> = {
  uber: "#3987e5",
  demaecan: "#199e70",
  menu: "#c98500",
  rocketnow: "#008300",
  other: "#9085e9",
};

const SERIES_1 = "#3987e5";
const GRID = "#2c2c2a";
const AXIS = "#383835";
const MUTED = "#898781";

type Range = "day" | "week" | "month";

function yenTick(v: number): string {
  if (v >= 10000) {
    const man = v / 10000;
    return `${Number.isInteger(man) ? man : man.toFixed(1)}万`;
  }
  return v.toLocaleString("ja-JP");
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#22242a] px-3 py-2 text-xs shadow-lg">
      <p className="text-white/50">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">
        {formatYen(payload[0].value)}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("day");
  const [goal, setGoal] = useState<number | null>(null);

  useEffect(() => {
    listShifts()
      .then(setShifts)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "記録の取得に失敗しました"),
      );
    setGoal(getWeeklyGoal());
  }, []);

  const today = todayIso();

  const stats = useMemo(() => {
    if (!shifts) return null;
    const weekStart = weekStartOf(today);
    const monthStart = `${today.slice(0, 7)}-01`;
    const last30Start = addDays(today, -29);
    const todayShifts = shiftsOn(shifts, today);
    const last30 = shiftsBetween(shifts, last30Start, today);
    return {
      todayRevenue: sumRevenue(todayShifts),
      todayMinutes: sumMinutes(todayShifts),
      weekRevenue: sumRevenue(shiftsBetween(shifts, weekStart, today)),
      monthRevenue: sumRevenue(shiftsBetween(shifts, monthStart, today)),
      hourly: overallHourlyRate(last30),
      streak: computeStreak(shifts, today),
      breakdown: platformBreakdown(last30),
      breakdownTotal: sumRevenue(last30),
    };
  }, [shifts, today]);

  const trend: TrendPoint[] = useMemo(() => {
    if (!shifts) return [];
    if (range === "day") return dailyTrend(shifts, today, 14);
    if (range === "week") return weeklyTrend(shifts, today, 8);
    return monthlyTrend(shifts, today, 6);
  }, [shifts, range, today]);

  async function handleDelete(id: string) {
    if (!shifts) return;
    const prev = shifts;
    setShifts(prev.filter((s) => s.id !== id));
    try {
      await deleteShift(id);
    } catch {
      setShifts(prev);
    }
  }

  const supportLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-28 pt-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
        {storageMode === "local" && (
          <p className="mt-1 text-xs text-white/30">
            記録はこの端末に保存されています
          </p>
        )}
      </header>

      {error && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!shifts && !error && (
        <p className="py-16 text-center text-sm text-white/40">読み込み中…</p>
      )}

      {shifts && shifts.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-3xl">📈</p>
          <p className="mt-3 font-semibold">まだ記録がありません</p>
          <p className="mt-1 text-sm text-white/50">
            最初のスクショを読み取って、ここに稼働を積み上げよう
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white active:bg-orange-600"
          >
            記録をはじめる
          </Link>
        </div>
      )}

      {shifts && shifts.length > 0 && stats && (
        <div className="space-y-4">
          {/* 週間目標(Studyplusの週間レポート風) */}
          {goal != null && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">今週の目標</span>
                <span className="font-bold">
                  {formatYen(stats.weekRevenue)}{" "}
                  <span className="text-white/40">/ {formatYen(goal)}</span>
                </span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700"
                  style={{
                    width: `${Math.min((stats.weekRevenue / goal) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs font-semibold text-orange-400">
                {stats.weekRevenue >= goal
                  ? "🎉 達成!来週も更新しよう"
                  : `あと ${formatYen(goal - stats.weekRevenue)}`}
              </p>
            </div>
          )}

          {/* サマリータイル */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50">今日の売上</p>
              <p className="mt-1 text-2xl font-black tracking-tight">
                {formatYen(stats.todayRevenue)}
              </p>
              {stats.todayMinutes > 0 && (
                <p className="mt-0.5 text-xs text-white/40">
                  {formatMinutes(stats.todayMinutes)}稼働
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50">連続稼働</p>
              <p className="mt-1 text-2xl font-black tracking-tight">
                {stats.streak > 0 ? `🔥 ${stats.streak}日` : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50">今週</p>
              <p className="mt-1 text-xl font-bold tracking-tight">
                {formatYen(stats.weekRevenue)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50">今月</p>
              <p className="mt-1 text-xl font-bold tracking-tight">
                {formatYen(stats.monthRevenue)}
              </p>
            </div>
          </div>

          {stats.hourly != null && (
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm text-white/50">時給換算(直近30日)</p>
              <p className="text-lg font-bold text-orange-400">
                {formatYen(stats.hourly)}
              </p>
            </div>
          )}

          {/* 売上推移 */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">売上推移</h2>
              <div className="flex rounded-lg bg-white/5 p-0.5">
                {(
                  [
                    { value: "day", label: "日" },
                    { value: "week", label: "週" },
                    { value: "month", label: "月" },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRange(r.value)}
                    className={`rounded-md px-3 py-1 text-xs transition ${
                      range === r.value
                        ? "bg-white/15 font-semibold text-white"
                        : "text-white/40"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trend}
                  margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke={GRID}
                    strokeWidth={1}
                  />
                  <XAxis
                    dataKey="key"
                    tick={{ fill: MUTED, fontSize: 10 }}
                    axisLine={{ stroke: AXIS }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    width={42}
                    tick={{ fill: MUTED, fontSize: 10 }}
                    tickFormatter={yenTick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.06)" }}
                  />
                  <Bar
                    dataKey="total"
                    fill={SERIES_1}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={26}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* プラットフォーム別内訳 */}
          {stats.breakdown.length > 0 && stats.breakdownTotal > 0 && (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-3 text-sm font-semibold">
                プラットフォーム別(直近30日)
              </h2>
              <ul className="space-y-3">
                {stats.breakdown.map(({ platform, total }) => {
                  const share = total / stats.breakdownTotal;
                  return (
                    <li key={platform}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ background: PLATFORM_COLORS[platform] }}
                          />
                          {PLATFORMS.find((p) => p.value === platform)?.label}
                        </span>
                        <span className="font-semibold">
                          {formatYen(total)}
                          <span className="ml-1.5 text-xs font-normal text-white/40">
                            {Math.round(share * 100)}%
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(share * 100, 2)}%`,
                            background: PLATFORM_COLORS[platform],
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* 今日のシェア */}
          {stats.todayRevenue > 0 && (
            <Link
              href={`/s?dt=${today}&r=${stats.todayRevenue}&st=${stats.streak}${
                stats.todayMinutes > 0 ? `&m=${stats.todayMinutes}` : ""
              }`}
              className="btn-chunky btn-orange"
            >
              今日の稼働をシェアする
            </Link>
          )}

          {/* 最近の記録 */}
          <section>
            <h2 className="mb-2 text-xs font-medium text-white/40">最近の記録</h2>
            <ul className="space-y-2">
              {shifts.slice(0, 10).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ background: PLATFORM_COLORS[s.platform] }}
                    />
                    <div>
                      <p className="font-medium">
                        {PLATFORMS.find((p) => p.value === s.platform)?.label}
                      </p>
                      <p className="text-xs text-white/40">
                        {s.date}
                        {s.deliveries != null && ` ・ ${s.deliveries}件`}
                        {s.minutes_worked != null &&
                          s.minutes_worked > 0 &&
                          ` ・ ${formatMinutes(s.minutes_worked)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatYen(s.revenue_yen)}</span>
                    <button
                      type="button"
                      aria-label="この記録を削除"
                      onClick={() => void handleDelete(s.id)}
                      className="text-white/25 transition hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* 応援プラン(Stripe Payment Link設定時のみ) */}
          {supportLink && (
            <a
              href={supportLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-center"
            >
              <p className="font-semibold text-orange-400">
                DeliLogを応援する ☕
              </p>
              <p className="mt-1 text-xs text-white/50">
                開発を支援して、新機能を一緒に作ろう
              </p>
            </a>
          )}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
