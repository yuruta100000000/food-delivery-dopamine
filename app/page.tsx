"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import Celebration from "@/components/Celebration";
import { PLATFORMS, type ParsedShift, type Platform } from "@/lib/shift";
import { addShift, listShifts, type Shift } from "@/lib/storage";
import { GOAL_PRESETS, getWeeklyGoal, setWeeklyGoal } from "@/lib/goal";
import {
  computeStreak,
  formatYen,
  hourlyRate,
  shiftsBetween,
  sumRevenue,
  todayIso,
  weekStartOf,
} from "@/lib/stats";

// ホーム = 記録ファースト(Studyplus流)+ ストリークと週間目標を最前面(Duolingo流)。
// フロー: スクショをアップロード → AI解析 → 確認・修正 → 保存 → セレブレーション。

type FormValues = {
  platform: Platform | "";
  date: string;
  revenue_yen: string;
  deliveries: string;
  minutes_worked: string;
};

const EMPTY_FORM: FormValues = {
  platform: "",
  date: "",
  revenue_yen: "",
  deliveries: "",
  minutes_worked: "",
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

function buildShareQuery(shift: Shift, streak: number): string {
  const params = new URLSearchParams({
    dt: shift.date,
    r: String(shift.revenue_yen),
    st: String(streak),
  });
  if (shift.deliveries != null) params.set("d", String(shift.deliveries));
  if (shift.minutes_worked != null) params.set("m", String(shift.minutes_worked));
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
  const goalPct = goal ? Math.min((weekTotal / goal) * 100, 100) : 0;

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
      const prevBest = bestDailyBefore(shifts, today);
      const shift = await addShift({
        platform: form.platform as Platform,
        date: form.date,
        revenue_yen: Number(form.revenue_yen),
        deliveries: form.deliveries ? Number(form.deliveries) : null,
        minutes_worked: form.minutes_worked ? Number(form.minutes_worked) : null,
        source,
      });
      const all = await listShifts();
      setShifts(all);
      const newStreak = computeStreak(all, today);
      const savedDayTotal = sumRevenue(all.filter((s) => s.date === shift.date));
      setSaved({
        shift,
        streak: newStreak,
        isBest: prevBest > 0 && savedDayTotal > prevBest,
        weekTotal: sumRevenue(shiftsBetween(all, weekStartOf(today), today)),
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
      {/* ステータスバー: ロゴ + ストリーク(常に最前面) */}
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight">
          Deli<span className="text-orange-500">Log</span>
        </h1>
        <div
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-extrabold ${
            streak > 0
              ? "bg-orange-500/15 text-orange-400"
              : "bg-white/5 text-white/30"
          }`}
        >
          <span className={streak > 0 ? "anim-flame" : ""}>🔥</span>
          {streak > 0 ? `${streak}日` : "0日"}
        </div>
      </header>

      {(status === "idle" || status === "parsing") && (
        <section className="space-y-4">
          {/* 今日 + 週間目標(Duolingoのゴールトラッカー) */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-medium text-white/50">今日の売上</p>
                <p className="mt-0.5 text-3xl font-black tracking-tight">
                  {formatYen(todayTotal)}
                </p>
              </div>
              {todayTotal === 0 && (
                <p className="text-xs font-semibold text-orange-400">
                  今日はまだ記録してないよ👇
                </p>
              )}
            </div>

            <div className="mt-4">
              {goal == null && !editingGoal ? (
                <button
                  type="button"
                  onClick={() => setEditingGoal(true)}
                  className="w-full rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 px-4 py-3 text-sm font-bold text-orange-400"
                >
                  🎯 週間目標を決めて、達成グセをつけよう
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
                        className="rounded-lg bg-white/10 py-2 text-xs font-bold active:bg-orange-500/30"
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
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white/50">
                      今週の目標 {goal != null && formatYen(goal)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-white/80">
                        {Math.floor(goalPct)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingGoal(true)}
                        className="text-white/30 underline"
                      >
                        変更
                      </button>
                    </span>
                  </div>
                  <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700"
                      style={{ width: `${goalPct}%` }}
                    />
                  </div>
                  {goal != null && weekTotal >= goal && (
                    <p className="mt-1.5 text-xs font-bold text-orange-400">
                      🎉 今週の目標達成!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 記録CTA */}
          <label
            className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 transition ${
              status === "parsing"
                ? "border-orange-500/40 bg-orange-500/5"
                : "border-white/15 bg-white/5 active:bg-white/10"
            }`}
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
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="アップロードしたスクリーンショット"
                    className="h-24 rounded-lg object-contain opacity-60"
                  />
                )}
                <div className="flex items-center gap-2 text-orange-400">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                  <span className="text-sm font-bold">AIが読み取り中…</span>
                </div>
              </>
            ) : (
              <>
                <span className="anim-flame text-5xl">📸</span>
                <span className="text-lg font-extrabold">
                  スクショで今日を記録
                </span>
                <span className="text-xs text-white/40">
                  売上画面を選ぶだけ・約5秒
                </span>
              </>
            )}
          </label>

          <button
            type="button"
            className="btn-chunky btn-ghost"
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
                    className={`rounded-xl border px-2 py-2.5 text-sm transition ${
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

            {showHourly && (
              <p className="text-right text-sm text-white/50">
                時給換算{" "}
                <span className="font-bold text-orange-400">
                  {formatYen(hourlyRate(revenueNum, minutesNum))}
                </span>
              </p>
            )}

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
          shareHref={`/s?${buildShareQuery(saved.shift, saved.streak)}`}
          onNext={reset}
        />
      )}

      <BottomNav />
    </main>
  );
}
