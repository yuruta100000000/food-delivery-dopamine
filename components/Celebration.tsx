"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatYen } from "@/lib/stats";

// 記録完了セレブレーション(Duolingoのレッスン完了画面のメカニクスを移植)。
// 称賛コピー + カウントアップ + 紙吹雪 + ストリーク + 週間目標進捗 → シェア導線。

const PRAISES = [
  "ナイス稼働!",
  "おつかれさま!",
  "今日も走りきった!",
  "その調子!",
  "積み上がってる!",
] as const;

const CONFETTI_COLORS = ["#f97316", "#fbbf24", "#3987e5", "#199e70", "#e66767"];

function useCountUp(target: number, durationMs = 900): number {
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
  shiftRevenue: number;
  streak: number;
  isPersonalBest: boolean;
  weekTotal: number;
  weeklyGoal: number | null;
  shareHref: string;
  onNext: () => void;
};

export default function Celebration({
  shiftRevenue,
  streak,
  isPersonalBest,
  weekTotal,
  weeklyGoal,
  shareHref,
  onNext,
}: Props) {
  const displayed = useCountUp(shiftRevenue);
  const praise = useMemo(
    () => PRAISES[Math.floor(Math.random() * PRAISES.length)],
    [],
  );
  const confetti = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: `${(i * 137) % 100}%`,
        delay: `${((i * 53) % 90) / 100}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    [],
  );

  const goalReached = weeklyGoal != null && weekTotal >= weeklyGoal;
  const goalPct =
    weeklyGoal != null ? Math.min((weekTotal / weeklyGoal) * 100, 100) : 0;

  return (
    <section className="relative">
      {confetti.map((c, i) => (
        <span
          key={i}
          className="confetti"
          style={{ left: c.left, animationDelay: c.delay, background: c.color }}
        />
      ))}

      <div className="anim-pop rounded-3xl border border-orange-500/30 bg-gradient-to-b from-orange-500/20 to-transparent p-6 text-center">
        <p className="text-lg font-extrabold text-orange-400">
          {isPersonalBest ? "🏆 自己ベスト更新!" : praise}
        </p>
        <p className="mt-3 text-5xl font-black tracking-tight tabular-nums">
          {formatYen(displayed)}
        </p>
        {streak > 0 && (
          <p className="mt-4 text-base font-bold">
            <span className="anim-flame text-2xl">🔥</span>{" "}
            連続稼働 <span className="text-orange-400">{streak}日</span>
            {streak >= 7 && " — 止まらない!"}
          </p>
        )}
      </div>

      {weeklyGoal != null && (
        <div className="anim-rise mt-4 rounded-2xl border border-white/10 bg-white/5 p-4" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">今週の目標</span>
            <span className="font-bold">
              {formatYen(weekTotal)}{" "}
              <span className="text-white/40">/ {formatYen(weeklyGoal)}</span>
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="anim-bar h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
              style={{ width: `${goalPct}%`, animationDelay: "0.4s" }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-orange-400">
            {goalReached
              ? "🎉 週間目標達成!すごい!"
              : `目標まであと ${formatYen(weeklyGoal - weekTotal)}`}
          </p>
        </div>
      )}

      <Link
        href={shareHref}
        className="btn-chunky btn-orange mt-6"
        style={{ animationDelay: "0.5s" }}
      >
        この稼働をシェアする
      </Link>
      <button type="button" onClick={onNext} className="btn-chunky btn-ghost mt-3">
        つづける
      </button>
    </section>
  );
}
