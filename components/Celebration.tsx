"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProgressRing from "@/components/ProgressRing";
import { formatYen } from "@/lib/stats";
import type { LevelInfo, Milestone } from "@/lib/level";

// 記録完了セレブレーション。
// レベルアップ時は豪華演出(リング+光の帯+大量紙吹雪)、実績解除はカードで積む。

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
  levelBefore: LevelInfo;
  levelAfter: LevelInfo;
  milestones: Milestone[];
  shareHref: string;
  onNext: () => void;
};

export default function Celebration({
  shiftRevenue,
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
  const displayed = useCountUp(shiftRevenue);
  const leveledUp = levelAfter.level > levelBefore.level;
  const praise = useMemo(
    () => PRAISES[Math.floor(Math.random() * PRAISES.length)],
    [],
  );
  const confetti = useMemo(() => {
    const count = leveledUp ? 28 : 18;
    return Array.from({ length: count }, (_, i) => ({
      left: `${(i * 137) % 100}%`,
      delay: `${((i * 53) % 140) / 100}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }));
  }, [leveledUp]);

  const goalReached = weeklyGoal != null && weekTotal >= weeklyGoal;
  const goalPct =
    weeklyGoal != null ? Math.min((weekTotal / weeklyGoal) * 100, 100) : 0;

  let delay = 0.25;
  const nextDelay = () => {
    const d = delay;
    delay += 0.15;
    return `${d}s`;
  };

  return (
    <section className="relative">
      {confetti.map((c, i) => (
        <span
          key={i}
          className="confetti"
          style={{ left: c.left, animationDelay: c.delay, background: c.color }}
        />
      ))}

      {/* レベルアップ演出(最優先の豪華枠) */}
      {leveledUp && (
        <div className="anim-pop anim-glow shine relative mb-4 overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-b from-amber-500/25 via-orange-500/10 to-transparent p-6 text-center">
          <p className="text-grad text-2xl font-black tracking-widest">
            LEVEL UP!
          </p>
          <div className="mt-4 flex items-center justify-center">
            <ProgressRing size={128} stroke={10} progress={levelAfter.progress}>
              <span className="text-[10px] font-bold tracking-widest text-white/50">
                LV
              </span>
              <span className="num text-5xl font-black leading-none">
                {levelAfter.level}
              </span>
            </ProgressRing>
          </div>
          <p className="mt-3 text-lg font-extrabold text-amber-300">
            {levelAfter.title}
          </p>
          {levelAfter.title !== levelBefore.title && (
            <p className="mt-1 text-xs text-white/50">
              称号が「{levelBefore.title}」から進化!
            </p>
          )}
        </div>
      )}

      {/* 売上ヒーロー */}
      <div
        className={`grain relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-b from-orange-500/20 to-transparent p-6 text-center ${leveledUp ? "anim-rise" : "anim-pop"}`}
      >
        <div className="stars" aria-hidden />
        <p className="kicker relative text-orange-400/80">QUEST COMPLETE</p>
        <p className="display relative mt-1.5 text-xl text-white">
          {isPersonalBest ? "🏆 自己ベスト更新!" : "今日の冒険、完了。"}
        </p>
        <p className="num relative mt-3 text-5xl text-white">
          {formatYen(displayed)}
        </p>
        {!isPersonalBest && (
          <p className="relative mt-1.5 text-sm font-bold text-orange-400">{praise}</p>
        )}
        {streak > 0 && (
          <p className="mt-4 text-base font-bold">
            <span className="anim-flame text-2xl">🔥</span>{" "}
            連続稼働 <span className="text-orange-400">{streak}日</span>
            {streak >= 7 && " — 止まらない!"}
          </p>
        )}
      </div>

      {/* XPバー */}
      <div
        className="glass anim-rise mt-4 p-4"
        style={{ animationDelay: nextDelay() }}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white/70">
            LV.{levelAfter.level}{" "}
            <span className="font-medium text-white/40">{levelAfter.title}</span>
          </span>
          <span className="num font-bold text-amber-400">
            +{shiftRevenue.toLocaleString("ja-JP")} XP
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="anim-bar h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
            style={{
              width: `${levelAfter.progress * 100}%`,
              animationDelay: nextDelay(),
            }}
          />
        </div>
        <p className="mt-1.5 text-right text-[11px] text-white/35">
          次のレベルまで {formatYen(levelAfter.toNext)}
        </p>
      </div>

      {/* 実績解除 */}
      {milestones.map((m) => (
        <div
          key={m.id}
          className="glass anim-rise mt-3 flex items-center gap-3 border-amber-400/30 p-4"
          style={{ animationDelay: nextDelay() }}
        >
          <span className="text-3xl">{m.emoji}</span>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-amber-400">
              実績解除
            </p>
            <p className="font-extrabold">{m.label}</p>
          </div>
        </div>
      ))}

      {/* 週間目標 */}
      {weeklyGoal != null && (
        <div
          className="glass anim-rise mt-4 p-4"
          style={{ animationDelay: nextDelay() }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">今週の目標</span>
            <span className="num font-bold">
              {formatYen(weekTotal)}{" "}
              <span className="text-white/40">/ {formatYen(weeklyGoal)}</span>
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="anim-bar h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
              style={{ width: `${goalPct}%`, animationDelay: nextDelay() }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-orange-400">
            {goalReached
              ? "🎉 週間目標達成!すごい!"
              : `目標まであと ${formatYen(weeklyGoal - weekTotal)}`}
          </p>
        </div>
      )}

      <Link href={shareHref} className="btn-chunky btn-orange mt-6">
        この稼働をシェアする
      </Link>
      <button type="button" onClick={onNext} className="btn-chunky btn-ghost mt-3">
        つづける
      </button>
    </section>
  );
}
