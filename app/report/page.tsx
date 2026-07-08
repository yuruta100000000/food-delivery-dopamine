"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BottomNav from "@/components/BottomNav";
import NumberTicker from "@/components/NumberTicker";
import ProgressRing from "@/components/ProgressRing";
import RevenueCalendar from "@/components/RevenueCalendar";
import { IconFlame } from "@/components/icons";
import { PLATFORMS, type Platform } from "@/lib/shift";
import { deleteShift, listShifts, storageMode, type Shift } from "@/lib/storage";
import { getWeeklyGoal } from "@/lib/goal";
import { computeLevel } from "@/lib/level";
import {
  addDays,
  computeStreak,
  weekStartOf,
  dailyDistance,
  dailyTrend,
  formatMinutes,
  formatYen,
  monthlyTrend,
  overallHourlyRate,
  platformBreakdown,
  shiftsBetween,
  shiftsOn,
  sumDistance,
  sumMinutes,
  sumRevenue,
  todayIso,
  weeklyTrend,
  type TrendPoint,
} from "@/lib/stats";

// 旅の記録: スペックシートのように、線と数字で綴る。
// チャートはモノクローム。「今」のバーだけが残り火色に灯る。

const EMBER = "#f97316";
const BAR = "rgba(255,255,255,0.72)";
const BAR_DIM = "rgba(255,255,255,0.3)";
const GRID = "rgba(255,255,255,0.06)";
const MUTED = "rgba(255,255,255,0.32)";

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
  unit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit?: "yen" | "km";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#101218] px-3 py-2 text-xs shadow-xl">
      <p className="text-white/40">{label}</p>
      <p className="num mt-0.5 text-sm text-white">
        {unit === "km" ? `${payload[0].value}km` : formatYen(payload[0].value)}
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
      distance30: sumDistance(last30),
      distanceTrend: dailyDistance(shifts, today, 14),
      level: computeLevel(sumRevenue(shifts)),
      totals: {
        revenue: sumRevenue(shifts),
        deliveries: shifts.reduce((a, s) => a + (s.deliveries ?? 0), 0),
        distance: sumDistance(shifts),
      },
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
  const lastTrendIndex = trend.length - 1;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-28 pt-6">
      <div className="stars absolute inset-x-0 top-0 h-56" aria-hidden />

      <header className="anim-rise relative mb-8">
        <p className="kicker text-white/35">Report</p>
        <h1 className="display mt-1.5 text-[32px] text-white">走った証</h1>
        {storageMode === "local" && (
          <p className="mt-1 text-[10px] text-white/20">
            記録はこの端末に保存されています
          </p>
        )}
      </header>

      {error && (
        <p className="hairline-t hairline-b mb-4 py-3 text-xs text-red-300/90">
          {error}
        </p>
      )}

      {!shifts && !error && (
        <p className="py-16 text-center text-sm text-white/30">読み込み中…</p>
      )}

      {shifts && shifts.length === 0 && (
        <div className="anim-rise py-14 text-center">
          <p className="kicker text-white/30">No Records</p>
          <p className="display mt-3 text-xl text-white">
            まだ、旅は始まっていない。
          </p>
          <p className="mt-2 text-xs text-white/35">
            最初のスクショを読み取って、ここに軌跡を刻もう
          </p>
          <Link
            href="/"
            className="btn-primary mx-auto mt-8 max-w-[240px]"
          >
            記録をはじめる
          </Link>
        </div>
      )}

      {shifts && shifts.length > 0 && stats && (
        <div className="relative space-y-10">
          {/* 冒険の累計 — スペックシート */}
          <section className="anim-rise">
            <p className="kicker text-white/35">Total Journey</p>
            <div className="hairline-b mt-3 grid grid-cols-3 pb-5">
              <div>
                <p className="num text-[22px] leading-tight text-white">
                  <NumberTicker value={stats.totals.revenue} format={formatYen} />
                </p>
                <p className="mt-1 text-[10px] text-white/35">総売上</p>
              </div>
              <div className="border-l border-white/8 pl-4">
                <p className="num text-[22px] leading-tight text-white">
                  <NumberTicker value={stats.totals.deliveries} />
                  <span className="text-sm text-white/40">件</span>
                </p>
                <p className="mt-1 text-[10px] text-white/35">総配達</p>
              </div>
              <div className="border-l border-white/8 pl-4">
                <p className="num text-[22px] leading-tight text-white">
                  <NumberTicker value={Math.round(stats.totals.distance)} />
                  <span className="text-sm text-white/40">km</span>
                </p>
                <p className="mt-1 text-[10px] text-white/35">旅した距離</p>
              </div>
            </div>

            {/* ランク行 */}
            <div className="mt-5 flex items-center gap-5">
              <ProgressRing size={64} stroke={5} progress={stats.level.progress}>
                <span className="num text-lg text-white">{stats.level.level}</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-bold text-white">
                    <span className="kicker mr-2 text-white/35">
                      Rank {stats.level.level}
                    </span>
                    {stats.level.title}
                  </p>
                  <p className="num text-[10px] text-white/25">
                    next {formatYen(stats.level.toNext)}
                  </p>
                </div>
                <div className="mt-2.5 h-px w-full bg-white/10">
                  <div
                    className="h-px bg-gradient-to-r from-orange-500 to-amber-400"
                    style={{
                      width: `${stats.level.progress * 100}%`,
                      boxShadow: "0 0 8px rgba(249,115,22,0.55)",
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 今週 — 目標との距離 */}
          <section className="anim-rise" style={{ animationDelay: "0.08s" }}>
            <div className="flex items-baseline justify-between">
              <p className="kicker text-white/35">This Week</p>
              {goal != null && (
                <p className="num text-[11px] text-white/40">
                  {formatYen(stats.weekRevenue)}
                  <span className="text-white/25"> / {formatYen(goal)}</span>
                </p>
              )}
            </div>
            {goal != null ? (
              <>
                <div className="mt-3 h-px w-full bg-white/10">
                  <div
                    className="anim-bar h-px bg-orange-500"
                    style={{
                      width: `${Math.min((stats.weekRevenue / goal) * 100, 100)}%`,
                      boxShadow: "0 0 8px rgba(249,115,22,0.55)",
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-orange-400/90">
                  {stats.weekRevenue >= goal
                    ? "今週の目標、達成。"
                    : `あと ${formatYen(goal - stats.weekRevenue)}`}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[11px] text-white/25">目標未設定</p>
            )}

            {/* 今日・今週・今月・時給・距離 */}
            <div className="hairline-t hairline-b mt-5 grid grid-cols-3 py-4">
              <div className="text-center">
                <p className="text-[10px] text-white/35">今日</p>
                <p className="num mt-1 text-[15px] text-white">
                  {formatYen(stats.todayRevenue)}
                </p>
                {stats.todayMinutes > 0 && (
                  <p className="mt-0.5 text-[9px] text-white/25">
                    {formatMinutes(stats.todayMinutes)}
                  </p>
                )}
              </div>
              <div className="border-l border-white/8 text-center">
                <p className="text-[10px] text-white/35">今月</p>
                <p className="num mt-1 text-[15px] text-white">
                  {formatYen(stats.monthRevenue)}
                </p>
              </div>
              <div className="border-l border-white/8 text-center">
                <p className="text-[10px] text-white/35">連続</p>
                <p className="num mt-1 flex items-center justify-center gap-1 text-[15px] text-white">
                  {stats.streak > 0 && (
                    <IconFlame size={13} className="text-orange-400" />
                  )}
                  {stats.streak}日
                </p>
              </div>
            </div>
            <div className="hairline-b grid grid-cols-2 py-4">
              <div className="text-center">
                <p className="text-[10px] text-white/35">時給換算(30日)</p>
                <p className="num mt-1 text-[15px] text-white">
                  {stats.hourly != null ? formatYen(stats.hourly) : "—"}
                </p>
              </div>
              <div className="border-l border-white/8 text-center">
                <p className="text-[10px] text-white/35">走行距離(30日)</p>
                <p className="num mt-1 text-[15px] text-white">
                  {stats.distance30 > 0 ? `${stats.distance30}km` : "—"}
                </p>
              </div>
            </div>
          </section>

          {/* 売上カレンダー: 走った夜が街の灯りのように浮かぶ */}
          <section className="anim-rise" style={{ animationDelay: "0.12s" }}>
            <RevenueCalendar shifts={shifts} />
          </section>

          {/* 売上推移 */}
          <section className="anim-rise" style={{ animationDelay: "0.14s" }}>
            <div className="mb-4 flex items-baseline justify-between">
              <p className="kicker text-white/35">Earnings</p>
              <div className="flex gap-4">
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
                    className={`text-xs font-bold transition ${
                      range === r.value
                        ? "text-white underline decoration-orange-500 decoration-2 underline-offset-[6px]"
                        : "text-white/30"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
                  <XAxis
                    dataKey="key"
                    tick={{ fill: MUTED, fontSize: 10 }}
                    axisLine={false}
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
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={22}>
                    {trend.map((_, i) => (
                      <Cell
                        key={i}
                        fill={range === "day" && i === lastTrendIndex ? EMBER : BAR}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 走行距離 */}
          {stats.distanceTrend.some((d) => d.total > 0) && (
            <section className="anim-rise" style={{ animationDelay: "0.2s" }}>
              <p className="kicker mb-4 text-white/35">Distance — 14 Days</p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.distanceTrend}
                    margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
                    <XAxis
                      dataKey="key"
                      tick={{ fill: MUTED, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      width={38}
                      tick={{ fill: MUTED, fontSize: 10 }}
                      tickFormatter={(v: number) => `${v}km`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<ChartTooltip unit="km" />}
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    />
                    <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={22}>
                      {stats.distanceTrend.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            i === stats.distanceTrend.length - 1 ? EMBER : BAR_DIM
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* プラットフォーム別 */}
          {stats.breakdown.length > 0 && stats.breakdownTotal > 0 && (
            <section className="anim-rise" style={{ animationDelay: "0.26s" }}>
              <p className="kicker mb-4 text-white/35">Platforms — 30 Days</p>
              <ul className="space-y-4">
                {stats.breakdown.map(({ platform, total }, idx) => {
                  const share = total / stats.breakdownTotal;
                  return (
                    <li key={platform}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span
                          className={idx === 0 ? "font-bold text-white" : "text-white/55"}
                        >
                          {PLATFORMS.find((p) => p.value === platform)?.label}
                        </span>
                        <span className="num text-white/80">
                          {formatYen(total)}
                          <span className="ml-2 text-[10px] text-white/30">
                            {Math.round(share * 100)}%
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-px w-full bg-white/10">
                        <div
                          className="h-px"
                          style={{
                            width: `${Math.max(share * 100, 1.5)}%`,
                            background: idx === 0 ? EMBER : "rgba(255,255,255,0.45)",
                            boxShadow:
                              idx === 0 ? "0 0 8px rgba(249,115,22,0.5)" : "none",
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
              href={`/s?dt=${today}&r=${stats.todayRevenue}&st=${stats.streak}&lv=${stats.level.level}${
                stats.todayMinutes > 0 ? `&m=${stats.todayMinutes}` : ""
              }`}
              className="btn-primary anim-rise"
              style={{ animationDelay: "0.3s" }}
            >
              今日の稼働をシェアする
            </Link>
          )}

          {/* 記録一覧 */}
          <section className="anim-rise" style={{ animationDelay: "0.34s" }}>
            <p className="kicker mb-2 text-white/35">Records</p>
            <ul>
              {shifts.slice(0, 10).map((s) => (
                <li
                  key={s.id}
                  className="hairline-b row-press flex items-center justify-between py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white/85">
                      {PLATFORMS.find((p) => p.value === s.platform)?.label}
                    </p>
                    <p className="num mt-0.5 text-[10px] text-white/30">
                      {s.date.replaceAll("-", ".")}
                      {s.deliveries != null && `・${s.deliveries}件`}
                      {s.minutes_worked != null &&
                        s.minutes_worked > 0 &&
                        `・${formatMinutes(s.minutes_worked)}`}
                      {s.distance_km != null && `・${s.distance_km}km`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="num text-sm text-white">
                      {formatYen(s.revenue_yen)}
                    </span>
                    <button
                      type="button"
                      aria-label="この記録を削除"
                      onClick={() => void handleDelete(s.id)}
                      className="px-1 text-lg leading-none text-white/15 transition hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* 応援 */}
          {supportLink && (
            <a
              href={supportLink}
              target="_blank"
              rel="noopener noreferrer"
              className="row-press hairline-t hairline-b block py-4 text-center"
            >
              <p className="text-sm font-bold text-orange-400">DeliLogを応援する</p>
              <p className="mt-1 text-[10px] text-white/30">
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
