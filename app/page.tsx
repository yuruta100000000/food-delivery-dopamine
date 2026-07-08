"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import Celebration from "@/components/Celebration";
import NumberTicker from "@/components/NumberTicker";
import ProgressRing from "@/components/ProgressRing";
import { IconAperture, IconFlame } from "@/components/icons";
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

// ホーム: 夜空の下、今週のリングがひとつ浮かぶ。
// カードを並べない。数字・線・余白・光で構成する。

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

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-28 pt-6">
      {/* 上部の夜空 */}
      <div className="stars absolute inset-x-0 top-0 h-72" aria-hidden />

      {/* ヘッダー: ワードマークとメタ情報(チップは置かない) */}
      <header className="relative mb-8 flex items-baseline justify-between">
        <h1 className="display text-lg text-white">
          Deli<span className="text-white/45">Log</span>
        </h1>
        <div className="flex items-baseline gap-4">
          <p className="kicker text-white/40">
            Rank <span className="num text-xs text-white/80">{level.level}</span>
          </p>
          <p
            className={`flex items-center gap-1 text-xs font-bold ${
              streak > 0 ? "text-orange-400" : "text-white/25"
            }`}
          >
            <IconFlame size={13} />
            <span className="num">{streak}</span>
          </p>
        </div>
      </header>

      {(status === "idle" || status === "parsing") && (
        <section className="relative flex flex-1 flex-col">
          {/* コピー */}
          <div className="anim-rise">
            <h2 className="display text-[38px] text-white">
              配達は、
              <br />
              <span className="text-grad">冒険だ。</span>
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-white/35">
              今夜も街へ。走った証を、ここに刻もう。
            </p>
          </div>

          {/* リング(カードに入れない。夜空に浮かべる) */}
          <div
            className="anim-rise relative mx-auto mt-10"
            style={{ animationDelay: "0.1s" }}
          >
            <div
              aria-hidden
              className="absolute inset-0 -z-10 scale-125 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(249,115,22,0.14), transparent 65%)",
              }}
            />
            <ProgressRing size={196} stroke={9} progress={goalProgress}>
              <span className="kicker text-white/35">This Week</span>
              <span className="num mt-1.5 text-[30px] leading-none text-white">
                <NumberTicker value={weekTotal} format={formatYen} />
              </span>
              {goal != null ? (
                <span className="num mt-1.5 text-[11px] text-orange-400">
                  {Math.floor(goalProgress * 100)}%
                </span>
              ) : (
                <span className="mt-1.5 text-[10px] text-white/30">目標未設定</span>
              )}
            </ProgressRing>
          </div>

          {/* ステータス行(ヘアラインで区切る) */}
          <div
            className="hairline-t hairline-b anim-rise mt-10 grid grid-cols-3 py-4"
            style={{ animationDelay: "0.18s" }}
          >
            <div className="text-center">
              <p className="text-[10px] text-white/35">今日</p>
              <p className="num mt-1 text-[15px] text-white">
                {formatYen(todayTotal)}
              </p>
            </div>
            <div className="border-l border-white/8 text-center">
              <p className="text-[10px] text-white/35">目標まで</p>
              <p className="num mt-1 text-[15px] text-white">
                {goal == null
                  ? "—"
                  : weekTotal >= goal
                    ? "達成"
                    : formatYen(goal - weekTotal)}
              </p>
            </div>
            <div className="border-l border-white/8 text-center">
              <p className="text-[10px] text-white/35">連続</p>
              <p className="num mt-1 text-[15px] text-white">{streak}日</p>
            </div>
          </div>

          {/* 目標の設定・変更(静かなテキスト操作) */}
          <div className="anim-rise mt-3" style={{ animationDelay: "0.24s" }}>
            {editingGoal || goal == null ? (
              <div className="glass mt-2 p-4">
                <p className="text-[11px] text-white/45">今週の目標を決める</p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {GOAL_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyGoal(p)}
                      className="row-press num rounded-lg border border-white/10 py-2 text-xs text-white/80"
                    >
                      {p / 10000}万
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="自由に入力(円)"
                    className="input-line num flex-1 text-sm"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!Number(customGoal)}
                    onClick={() => applyGoal(Number(customGoal))}
                    className="pb-1 text-sm font-bold text-orange-400 disabled:opacity-30"
                  >
                    決定
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-right text-[11px] text-white/25">
                目標 <span className="num">{formatYen(goal)}</span>
                <button
                  type="button"
                  onClick={() => setEditingGoal(true)}
                  className="ml-2 underline underline-offset-2"
                >
                  変更
                </button>
              </p>
            )}
          </div>

          <div className="flex-1" />

          {/* 読み取り中プレビュー */}
          {status === "parsing" && previewUrl && (
            <div className="anim-rise mb-5 flex justify-center">
              <div className="scan">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="アップロードしたスクリーンショット"
                  className="h-36 rounded-xl border border-orange-500/25 object-contain"
                />
              </div>
            </div>
          )}

          {/* 記録CTA */}
          <label
            className="btn-primary anim-rise cursor-pointer"
            style={{ animationDelay: "0.3s" }}
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
                <span className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                AIが読み取り中…
              </>
            ) : (
              <>
                <IconAperture size={19} />
                スクショで記録する
              </>
            )}
          </label>
          <p className="mt-2.5 text-center text-[10px] tracking-wider text-white/25">
            売上画面を選ぶだけ・約5秒
          </p>
          <button
            type="button"
            className="anim-rise mt-4 py-1 text-center text-sm font-semibold text-white/40 underline-offset-4 active:underline"
            style={{ animationDelay: "0.36s" }}
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
        <section className="anim-rise relative">
          <div className="mb-6 flex items-baseline justify-between">
            <div>
              <p className="kicker text-white/35">Check</p>
              <h2 className="display mt-1 text-2xl text-white">内容を確認</h2>
            </div>
            {confidence && (
              <p
                className={`text-[11px] font-bold ${
                  confidence === "high"
                    ? "text-emerald-400"
                    : confidence === "medium"
                      ? "text-amber-400"
                      : "text-red-400"
                }`}
              >
                読み取り確度{" "}
                {confidence === "high" ? "高" : confidence === "medium" ? "中" : "低"}
              </p>
            )}
          </div>

          {notice && (
            <p className="hairline-t hairline-b mb-5 py-3 text-xs leading-relaxed text-amber-300/90">
              {notice}
            </p>
          )}

          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="アップロードしたスクリーンショット"
              className="mb-6 max-h-36 rounded-xl border border-white/10 object-contain"
            />
          )}

          <div className="space-y-7">
            <div>
              <p className="text-[10px] tracking-wider text-white/35">
                プラットフォーム
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, platform: p.value })}
                    className={`row-press rounded-full border px-4 py-2 text-xs font-bold transition ${
                      form.platform === p.value
                        ? "border-orange-500/70 text-orange-400"
                        : "border-white/12 text-white/55"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
              <div>
                <p className="text-[10px] tracking-wider text-white/35">稼働日</p>
                <input
                  type="date"
                  className="input-line num mt-1"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <p className="text-[10px] tracking-wider text-white/35">売上(円)</p>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="12345"
                  className="input-line num mt-1"
                  value={form.revenue_yen}
                  onChange={(e) => setForm({ ...form, revenue_yen: e.target.value })}
                />
              </div>
              <div>
                <p className="text-[10px] tracking-wider text-white/35">配達件数</p>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="23"
                  className="input-line num mt-1"
                  value={form.deliveries}
                  onChange={(e) => setForm({ ...form, deliveries: e.target.value })}
                />
              </div>
              <div>
                <p className="text-[10px] tracking-wider text-white/35">
                  稼働時間(分)
                </p>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="302"
                  className="input-line num mt-1"
                  value={form.minutes_worked}
                  onChange={(e) =>
                    setForm({ ...form, minutes_worked: e.target.value })
                  }
                />
              </div>
              <div>
                <p className="text-[10px] tracking-wider text-white/35">
                  走行距離(km・任意)
                </p>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="21.4"
                  className="input-line num mt-1"
                  value={form.distance_km}
                  onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
                />
              </div>
              <div className="flex items-end justify-end">
                {showHourly && (
                  <p className="pb-1 text-xs text-white/40">
                    時給換算{" "}
                    <span className="num text-sm text-orange-400">
                      {formatYen(hourlyRate(revenueNum, minutesNum))}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!canConfirm || saving}
                onClick={() => void handleConfirm()}
                className="btn-primary"
              >
                {saving ? "保存中…" : "この内容で記録する"}
              </button>
              <button
                type="button"
                onClick={reset}
                className="mt-4 block w-full py-1 text-center text-sm font-semibold text-white/35"
              >
                やり直す
              </button>
            </div>
          </div>
        </section>
      )}

      {status === "celebrate" && saved && (
        <Celebration
          shift={saved.shift}
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
