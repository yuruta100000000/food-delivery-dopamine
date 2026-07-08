"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProgressRing from "@/components/ProgressRing";
import { IconFlame, IconSpark } from "@/components/icons";
import { formatMinutes, formatYen } from "@/lib/stats";
import type { LevelInfo, Milestone } from "@/lib/level";

// リザルト画面: 今夜の走行ログが、静かな光とともに立ち上がる。
// 派手な紙吹雪ではなく「残り火」。数字とヘアラインで構成する。

const CLOSERS = [
  "今日も、走りきった。",
  "夜の街に、一本の軌跡。",
  "積み上げは、裏切らない。",
  "今夜の分、確かに刻んだ。",
] as const;

function useCountUp(target: number, durationMs = 1100): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

type Props = {
  shift: {
    revenue_yen: number;
    deliveries: number | null;
    minutes_worked: number | null;
    distance_km: number | null;
    date: string;
  };
  streak: number;
  isPersonalBest: boolean;
  weekTotal: number;
  weeklyGoal: number | null;
  levelBefore: LevelInfo;
  levelAfter: LevelInfo;
  milestones: Milestone[];
  shareHref: string;
  onNext: () => void;
};

export default function Celebration({
  shift,
  streak,
  isPersonalBest,
  weekTotal,
  weeklyGoal,
  levelBefore,
  levelAfter,
  milestones,
  shareHref,
  onNext,
}: Props) {
  const displayed = useCountUp(shift.revenue_yen);
  const leveledUp = levelAfter.level > levelBefore.level;
  const closer = useMemo(
    () => CLOSERS[Math.floor(Math.random() * CLOSERS.length)],
    [],
  );
  const embers = useMemo(
    () =>
      Array.from({ length: leveledUp ? 16 : 10 }, (_, i) => ({
        left: `${8 + ((i * 61) % 84)}%`,
        delay: `${((i * 47) % 220) / 100}s`,
        drift: `${((i * 29) % 36) - 18}px`,
      })),
    [leveledUp],
  );

  const hourly =
    shift.minutes_worked && shift.minutes_worked > 0
      ? Math.round((shift.revenue_yen / shift.minutes_worked) * 60)
      : null;

  const statCols: { label: string; value: string }[] = [];
  if (shift.deliveries != null)
    statCols.push({ label: "配達", value: `${shift.deliveries}件` });
  if (shift.minutes_worked != null && shift.minutes_worked > 0)
    statCols.push({ label: "時間", value: formatMinutes(shift.minutes_worked) });
  if (shift.distance_km != null && shift.distance_km > 0)
    statCols.push({ label: "距離", value: `${shift.distance_km}km` });
  if (hourly != null) statCols.push({ label: "時給換算", value: formatYen(hourly) });

  const goalPct =
    weeklyGoal != null ? Math.min((weekTotal / weeklyGoal) * 100, 100) : 0;

  let delay = 0.35;
  const nextDelay = () => {
    const d = delay;
    delay += 0.12;
    return `${d}s`;
  };

  return (
    <section className="relative pt-2">
      {embers.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={{ left: e.left, animationDelay: e.delay, "--drift": e.drift } as React.CSSProperties}
        />
      ))}

      {/* ランクアップ(静かな栄光) */}
      {leveledUp && (
        <div className="shine anim-pop relative mb-8 overflow-hidden pb-6 pt-2 text-center">
          <p className="kicker text-orange-400/90">Rank Up</p>
          <div className="mt-5 flex items-center justify-center">
            <ProgressRing size={116} stroke={6} progress={levelAfter.progress}>
              <span className="num text-4xl text-white">{levelAfter.level}</span>
            </ProgressRing>
          </div>
          <p className="display mt-4 text-xl text-white">{levelAfter.title}</p>
          {levelAfter.title !== levelBefore.title && (
            <p className="mt-1 text-xs text-white/35">
              {levelBefore.title} から称号が変わった
            </p>
          )}
        </div>
      )}

      {/* リザルト本体 */}
      <div className={`text-center ${leveledUp ? "anim-rise" : "anim-pop"}`}>
        <p className="kicker text-white/35">
          Result — {shift.date.replaceAll("-", ".")}
        </p>
        <h2 className="display mt-2.5 text-2xl text-white">
          {isPersonalBest ? (
            <>
              自己ベスト、<span className="text-grad">更新。</span>
            </>
          ) : (
            closer
          )}
        </h2>
        <p className="num mt-6 text-[56px] leading-none text-white">
          <span className="text-[32px] align-top text-white/50">¥</span>
          {displayed.toLocaleString("ja-JP")}
        </p>
        {streak > 1 && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-bold text-orange-400">
            <IconFlame size={15} />
            {streak}日連続で走っている
          </p>
        )}
      </div>

      {/* 走行スタッツ */}
      {statCols.length > 0 && (
        <div
          className="hairline-t hairline-b anim-rise mt-8 grid py-4"
          style={{
            gridTemplateColumns: `repeat(${statCols.length}, 1fr)`,
            animationDelay: nextDelay(),
          }}
        >
          {statCols.map((s, i) => (
            <div
              key={s.label}
              className={`text-center ${i > 0 ? "border-l border-white/8" : ""}`}
            >
              <p className="text-[10px] text-white/35">{s.label}</p>
              <p className="num mt-1 text-base text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ランク進捗 */}
      <div className="anim-rise mt-6" style={{ animationDelay: nextDelay() }}>
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-white/45">
            <span className="kicker mr-2 text-white/35">Rank {levelAfter.level}</span>
            {levelAfter.title}
          </p>
          <p className="num text-xs text-orange-400">
            +{shift.revenue_yen.toLocaleString("ja-JP")}
          </p>
        </div>
        <div className="mt-2 h-px w-full bg-white/10">
          <div
            className="anim-bar h-px bg-gradient-to-r from-orange-500 to-amber-400"
            style={{
              width: `${levelAfter.progress * 100}%`,
              animationDelay: nextDelay(),
              boxShadow: "0 0 8px rgba(249,115,22,0.6)",
            }}
          />
        </div>
        <p className="num mt-1.5 text-right text-[10px] text-white/25">
          next {formatYen(levelAfter.toNext)}
        </p>
      </div>

      {/* 実績 */}
      {milestones.map((m) => (
        <div
          key={m.id}
          className="hairline-b anim-rise flex items-center gap-3 py-3.5"
          style={{ animationDelay: nextDelay() }}
        >
          <IconSpark size={16} className="text-amber-300" />
          <div className="flex-1">
            <p className="kicker text-amber-300/80">Achievement</p>
            <p className="mt-0.5 text-sm font-bold text-white">{m.label}</p>
          </div>
        </div>
      ))}

      {/* 週間目標 */}
      {weeklyGoal != null && (
        <div className="anim-rise mt-6" style={{ animationDelay: nextDelay() }}>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-white/45">今週の目標</span>
            <span className="num text-white/70">
              {formatYen(weekTotal)}
              <span className="text-white/30"> / {formatYen(weeklyGoal)}</span>
            </span>
          </div>
          <div className="mt-2 h-px w-full bg-white/10">
            <div
              className="anim-bar h-px bg-orange-500"
              style={{
                width: `${goalPct}%`,
                animationDelay: nextDelay(),
                boxShadow: "0 0 8px rgba(249,115,22,0.6)",
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-orange-400/90">
            {weekTotal >= weeklyGoal
              ? "今週の目標、達成。"
              : `あと ${formatYen(weeklyGoal - weekTotal)}`}
          </p>
        </div>
      )}

      <Link
        href={shareHref}
        className="btn-primary anim-rise mt-10"
        style={{ animationDelay: nextDelay() }}
      >
        この夜をシェアする
      </Link>
      <button
        type="button"
        onClick={onNext}
        className="mt-4 block w-full py-2 text-center text-sm font-semibold text-white/40"
      >
        つづける
      </button>
    </section>
  );
}
