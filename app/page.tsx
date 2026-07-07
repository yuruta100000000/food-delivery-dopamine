"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import Celebration from "@/components/Celebration";
import NumberTicker from "@/components/NumberTicker";
import ProgressRing from "@/components/ProgressRing";
import { PLATFORMS, type ParsedShift, type Platform } from "@/lib/shift";
import { addShift, listShifts, type Shift } from "@/lib/storage";
import { GOAL_PRESETS, getWeeklyGoal, setWeeklyGoal } from "@/lib/goal";
import {
  aggregate,
  computeLevel,
  newlyUnlocked,
  type LevelInfo,
  type Milestone,
} from "@/lib/level";
import {
  computeStreak,
  formatYen,
  hourlyRate,
  shiftsBetween,
  sumRevenue,
  todayIso,
  weekStartOf,
} from "@/lib/stats";

// ホーム = 記録ファースト。ストリーク・週間目標リング・レベルを最前面に。
// フロー: スクショをアップロード → AI解析 → 確認・修正 → 保存 → セレブレーション。

type FormValues = {
  platform: Platform | "";
  date: string;
  revenue_yen: string;
  deliveries: string;
  minutes_worked: string;
  distance_km: string;
};

const EMPTY_FORM: FormValues = {
  platform: "",
  date: "",
  revenue_yen: "",
  deliveries: "",
  minutes_worked: "",
  distance_km: "",
};

const MAX_LONG_EDGE = 2576;

async function toUploadBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const longEdge = Math.max(bitmap.width, bitmap.height);
  const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.9),
  );
}

function buildShareQuery(shift: Shift, streak: number, level: number): string {
  const params = new URLSearchParams({
    dt: shift.date,
    r: String(shift.revenue_yen),
    st: String(streak),
    lv: String(level),
  });
  if (shift.deliveries != null) params.set("d", String(shift.deliveries));
  if (shift.minutes_worked != null) params.set("m", String(shift.minutes_worked));
  if (shift.distance_km != null) params.set("k", String(shift.distance_km));
  return params.toString();
}

// 保存前のシフト一覧から「今日以外の日別売上の最高額」を出す(自己ベスト判定用)
function bestDailyBefore(shifts: Shift[], today: string): number {
  const totals = new Map<string, number>();
  for (const s of shifts) {
    if (s.date === today) continue;
    totals.set(s.date, (totals.get(s.date) ?? 0) + s.revenue_yen);
  }
  return Math.max(0, ...totals.values());
}

export default function Home() {
  const [status, setStatus] = useState<
    "idle" | "parsing" | "review" | "celebrate"
  >("idle");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [goal, setGoal] = useState<number | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [customGoal, setCustomGoal] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [source, setSource] = useState<"screenshot" | "manual">("manual");
  const [notice, setNotice] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<ParsedShift["confidence"] | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{
    shift: Shift;
    streak: number;
    isBest: boolean;
    weekTotal: number;
    levelBefore: LevelInfo;
    levelAfter: LevelInfo;
    milestones: Milestone[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = todayIso();

  useEffect(() => {
    listShifts()
      .then(setShifts)
      .catch(() => setShifts([]));
    setGoal(getWeeklyGoal());
  }, []);

  const todayTotal = sumRevenue(shifts.filter((s) => s.date === today));
  const weekTotal = sumRevenue(shiftsBetween(shifts, weekStartOf(today), today));
  const streak = computeStreak(shifts, today);
  const level = computeLevel(sumRevenue(shifts));
  const goalProgress = goal ? weekTotal / goal : 0;

  async function handleFile(file: File) {
    setStatus("parsing");
    setNotice(null);
    setConfidence(null);
    setSource("manual");
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });

    try {
      const blob = await toUploadBlob(file);
      const body = new FormData();
      body.append("image", blob, "screenshot.jpg");
      const res = await fetch("/api/parse", { method: "POST", body });
      const json = await res.json();

      if (!res.ok) {
        setForm(EMPTY_FORM);
        setNotice(json.error ?? "解析に失敗しました。手動で入力してください。");
        setStatus("review");
        return;
      }

      const result: ParsedShift = json.result;
      if (!result.found) {
        setForm(EMPTY_FORM);
        setNotice(
          result.notes
            ? `売上画面として読み取れませんでした(${result.notes})。手動で入力してください。`
            : "売上画面として読み取れませんでした。手動で入力してください。",
        );
        setStatus("review");
        return;
      }

      setForm({
        platform: result.platform ?? "",
        date: result.date ?? "",
        revenue_yen: result.revenue_yen?.toString() ?? "",
        deliveries: result.deliveries?.toString() ?? "",
        minutes_worked: result.minutes_worked?.toString() ?? "",
        distance_km: result.distance_km?.toString() ?? "",
      });
      setSource("screenshot");
      setConfidence(result.confidence);
      if (result.notes) setNotice(result.notes);
      setStatus("review");
    } catch {
      setForm(EMPTY_FORM);
      setNotice("通信エラーが発生しました。手動で入力してください。");
      setStatus("review");
    }
  }

  async function handleConfirm() {
    if (!form.platform || !form.date || !form.revenue_yen || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const aggBefore = aggregate(shifts, today);
      const prevBest = bestDailyBefore(shifts, today);
      const shift = await addShift({
        platform: form.platform as Platform,
        date: form.date,
        revenue_yen: Number(form.revenue_yen),
        deliveries: form.deliveries ? Number(form.deliveries) : null,
        minutes_worked: form.minutes_worked ? Number(form.minutes_worked) : null,
        distance_km: form.distance_km ? Number(form.distance_km) : null,
        source,
      });
      const all = await listShifts();
      setShifts(all);
      const aggAfter = aggregate(all, today);
      const savedDayTotal = sumRevenue(all.filter((s) => s.date === shift.date));
      setSaved({
        shift,
        streak: aggAfter.streak,
        isBest: prevBest > 0 && savedDayTotal > prevBest,
        weekTotal: sumRevenue(shiftsBetween(all, weekStartOf(today), today)),
        levelBefore: computeLevel(aggBefore.totalRevenue),
        levelAfter: computeLevel(aggAfter.totalRevenue),
        milestones: newlyUnlocked(aggBefore, aggAfter),
      });
      setStatus("celebrate");
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "保存に失敗しました。もう一度お試しください。",
      );
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStatus("idle");
    setForm(EMPTY_FORM);
    setNotice(null);
    setConfidence(null);
    setSource("manual");
    setSaved(null);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function applyGoal(yen: number) {
    setWeeklyGoal(yen);
    setGoal(yen);
    setEditingGoal(false);
    setCustomGoal("");
  }

  const revenueNum = Number(form.revenue_yen);
  const minutesNum = Number(form.minutes_worked);
  const showHourly =
    form.revenue_yen !== "" && form.minutes_worked !== "" && minutesNum > 0;
  const canConfirm = Boolean(form.platform && form.date && form.revenue_yen);

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-white/30 focus:border-orange-500 focus:outline-none";
  const labelClass = "mb-1 block text-xs font-medium text-white/50";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-28 pt-6">
      {/* ステータスバー: ロゴ + レベル + ストリーク */}
      <header className="mb-5 flex items-center justify-between">
        <h1 className="display text-xl">
          Deli<span className="text-grad">Log</span>
        </h1>
        <div className="flex items-center gap-2">
          <span className="glass num rounded-full px-3 py-1.5 text-xs font-extrabold text-amber-300">
            LV.{level.level}
          </span>
          <span
            className={`glass flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-extrabold ${
              streak > 0 ? "text-orange-400" : "text-white/30"
            }`}
          >
            <span className={streak > 0 ? "anim-flame" : ""}>🔥</span>
            {streak}日
          </span>
        </div>
      </header>

      {(status === "idle" || status === "parsing") && (
        <section className="space-y-4">
          {/* キャッチコピー(世界観の入口) */}
          <div className="anim-rise px-1 pb-1 pt-2">
            <p className="kicker text-orange-400/80">DELILOG</p>
            <h2 className="display mt-1.5 text-[34px] text-white">
              配達は、<span className="text-grad">冒険だ。</span>
            </h2>
            <p className="mt-1.5 text-xs font-medium text-white/40">
              今夜も街へ。走った証を、ここに刻もう
            </p>
          </div>

          {/* ヒーロー: 夜空と週間目標リング */}
          <div className="glass grain anim-rise relative overflow-hidden p-6" style={{ animationDelay: "0.08s" }}>
            <div className="stars" aria-hidden />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
              style={{
                background:
                  "radial-gradient(ellipse 130% 100% at 50% 130%, rgba(249,115,22,0.22), transparent 65%)",
              }}
            />
            <div className="relative flex flex-col items-center">
              <ProgressRing size={176} stroke={13} progress={goalProgress}>
                <span className="kicker text-white/45">THIS WEEK</span>
                <span className="num mt-1 text-3xl text-white">
                  <NumberTicker value={weekTotal} format={formatYen} />
                </span>
                {goal != null && (
                  <span className="num mt-0.5 text-[11px] text-orange-400">
                    {Math.floor(goalProgress * 100)}%
                  </span>
                )}
              </ProgressRing>

              <div className="mt-4 w-full">
                {goal == null && !editingGoal ? (
                  <button
                    type="button"
                    onClick={() => setEditingGoal(true)}
                    className="w-full rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 px-4 py-3 text-sm font-bold text-orange-400"
                  >
                    🎯 週間目標を決めて、リングを回そう
                  </button>
                ) : editingGoal ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="mb-2 text-xs font-medium text-white/50">
                      今週いくら稼ぐ?
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {GOAL_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => applyGoal(p)}
                          className="num rounded-lg bg-white/10 py-2 text-xs font-bold active:bg-orange-500/30"
                        >
                          {p / 10000}万
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="自由に入力(円)"
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                        value={customGoal}
                        onChange={(e) => setCustomGoal(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={!Number(customGoal)}
                        onClick={() => applyGoal(Number(customGoal))}
                        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold disabled:opacity-30"
                      >
                        決定
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/45">
                      今日 <span className="num font-bold text-white/80">{formatYen(todayTotal)}</span>
                      {todayTotal === 0 && (
                        <span className="ml-1.5 font-semibold text-orange-400">
                          まだ記録なし👇
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 text-white/45">
                      {goal != null &&
                        (weekTotal >= goal ? (
                          <span className="font-bold text-orange-400">🎉 目標達成!</span>
                        ) : (
                          <span>
                            あと <span className="num font-bold text-white/80">{formatYen(goal - weekTotal)}</span>
                          </span>
                        ))}
                      <button
                        type="button"
                        onClick={() => setEditingGoal(true)}
                        className="text-white/30 underline"
                      >
                        変更
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 記録CTA */}
          <label
            className="btn-chunky btn-orange anim-rise flex cursor-pointer items-center justify-center gap-3 py-5"
            style={{ animationDelay: "0.16s" }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={status === "parsing"}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            {status === "parsing" ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>AIが読み取り中…</span>
              </>
            ) : (
              <>
                <span className="text-2xl">📸</span>
                <span>
                  スクショで記録する
                  <span className="block text-[11px] font-semibold text-white/70">
                    売上画面を選ぶだけ・約5秒
                  </span>
                </span>
              </>
            )}
          </label>

          {status === "parsing" && previewUrl && (
            <div className="flex justify-center">
              <div className="scan">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="アップロードしたスクリーンショット"
                  className="h-36 rounded-xl border border-orange-500/30 object-contain"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn-chunky btn-ghost anim-rise"
            style={{ animationDelay: "0.22s" }}
            onClick={() => {
              setForm(EMPTY_FORM);
              setNotice(null);
              setSource("manual");
              setStatus("review");
            }}
          >
            手動で入力する
          </button>
        </section>
      )}

      {status === "review" && (
        <section className="anim-rise">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">内容を確認</h2>
            {confidence && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  confidence === "high"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : confidence === "medium"
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-red-500/15 text-red-400"
                }`}
              >
                読み取り確度: {confidence === "high" ? "高" : confidence === "medium" ? "中" : "低"}
              </span>
            )}
          </div>

          {notice && (
            <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              {notice}
            </p>
          )}

          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="アップロードしたスクリーンショット"
              className="mb-4 max-h-40 rounded-xl border border-white/10 object-contain"
            />
          )}

          <div className="space-y-4">
            <div>
              <label className={labelClass}>プラットフォーム</label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, platform: p.value })}
                    className={`pressable rounded-xl border px-2 py-2.5 text-sm transition ${
                      form.platform === p.value
                        ? "border-orange-500 bg-orange-500/15 font-bold text-orange-400"
                        : "border-white/10 bg-white/5 text-white/70"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>稼働日</label>
              <input
                type="date"
                className={inputClass}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>売上(円)</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="12345"
                className={inputClass}
                value={form.revenue_yen}
                onChange={(e) => setForm({ ...form, revenue_yen: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>配達件数</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="23"
                  className={inputClass}
                  value={form.deliveries}
                  onChange={(e) => setForm({ ...form, deliveries: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>稼働時間(分)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="302"
                  className={inputClass}
                  value={form.minutes_worked}
                  onChange={(e) =>
                    setForm({ ...form, minutes_worked: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>走行距離(km・任意)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="21.4"
                  className={inputClass}
                  value={form.distance_km}
                  onChange={(e) =>
                    setForm({ ...form, distance_km: e.target.value })
                  }
                />
              </div>
              <div className="flex items-end justify-end pb-3">
                {showHourly && (
                  <p className="text-sm text-white/50">
                    時給換算{" "}
                    <span className="num font-bold text-orange-400">
                      {formatYen(hourlyRate(revenueNum, minutesNum))}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={!canConfirm || saving}
              onClick={() => void handleConfirm()}
              className="btn-chunky btn-orange"
            >
              {saving ? "保存中…" : "この内容で記録する"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="w-full py-2 text-sm text-white/40"
            >
              やり直す
            </button>
          </div>
        </section>
      )}

      {status === "celebrate" && saved && (
        <Celebration
          shiftRevenue={saved.shift.revenue_yen}
          streak={saved.streak}
          isPersonalBest={saved.isBest}
          weekTotal={saved.weekTotal}
          weeklyGoal={goal}
          levelBefore={saved.levelBefore}
          levelAfter={saved.levelAfter}
          milestones={saved.milestones}
          shareHref={`/s?${buildShareQuery(saved.shift, saved.streak, saved.levelAfter.level)}`}
          onNext={reset}
        />
      )}

      <BottomNav />
    </main>
  );
}
