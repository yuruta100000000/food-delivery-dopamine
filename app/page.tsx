"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { PLATFORMS, type ParsedShift, type Platform } from "@/lib/shift";
import { addShift, listShifts, type Shift } from "@/lib/storage";
import { computeStreak, formatYen, hourlyRate, todayIso } from "@/lib/stats";

// 記録フロー: スクショをアップロード → AI解析 → 確認・修正 → 保存。
// 解析失敗時・APIキー未設定時は手動入力フォームにフォールバックする。

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

// 解析コストとアップロード時間を抑えるため、長辺が上限を超える画像は
// クライアント側で縮小してから送る。
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

export default function Home() {
  const [status, setStatus] = useState<
    "idle" | "parsing" | "review" | "confirmed"
  >("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [source, setSource] = useState<"screenshot" | "manual">("manual");
  const [notice, setNotice] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<ParsedShift["confidence"] | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ shift: Shift; streak: number } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const shift = await addShift({
        platform: form.platform as Platform,
        date: form.date,
        revenue_yen: Number(form.revenue_yen),
        deliveries: form.deliveries ? Number(form.deliveries) : null,
        minutes_worked: form.minutes_worked ? Number(form.minutes_worked) : null,
        source,
      });
      const all = await listShifts();
      setSaved({ shift, streak: computeStreak(all, todayIso()) });
      setStatus("confirmed");
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

  const revenueNum = Number(form.revenue_yen);
  const minutesNum = Number(form.minutes_worked);
  const showHourly =
    form.revenue_yen !== "" && form.minutes_worked !== "" && minutesNum > 0;
  const canConfirm = Boolean(form.platform && form.date && form.revenue_yen);

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-white/30 focus:border-orange-500 focus:outline-none";
  const labelClass = "mb-1 block text-xs font-medium text-white/50";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-28 pt-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Deli<span className="text-orange-500">Log</span>
        </h1>
        <p className="mt-1 text-sm text-white/50">
          売上スクショを撮って、今日の稼働を記録しよう
        </p>
      </header>

      {(status === "idle" || status === "parsing") && (
        <section>
          <label
            className={`flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition ${
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
                  <span className="text-sm font-medium">AIが読み取り中…</span>
                </div>
              </>
            ) : (
              <>
                <span className="text-4xl">📸</span>
                <span className="text-base font-semibold">
                  売上画面のスクショをアップロード
                </span>
                <span className="text-xs text-white/40">
                  Uber Eats / 出前館 / menu / ロケットナウ
                </span>
              </>
            )}
          </label>

          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-white/10 py-3 text-sm text-white/60 active:bg-white/5"
            onClick={() => {
              setForm(EMPTY_FORM);
              setNotice(null);
              setSource("manual");
              setStatus("review");
            }}
          >
            スクショなしで手動入力する
          </button>
        </section>
      )}

      {status === "review" && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">内容を確認</h2>
            {confidence && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
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
                        ? "border-orange-500 bg-orange-500/15 font-semibold text-orange-400"
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
                <span className="font-semibold text-orange-400">
                  {formatYen(hourlyRate(revenueNum, minutesNum))}
                </span>
              </p>
            )}

            <button
              type="button"
              disabled={!canConfirm || saving}
              onClick={() => void handleConfirm()}
              className="w-full rounded-xl bg-orange-500 py-3.5 text-base font-bold text-white transition active:bg-orange-600 disabled:opacity-30"
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

      {status === "confirmed" && saved && (
        <section>
          <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-b from-orange-500/15 to-transparent p-6 text-center">
            <p className="text-sm font-medium text-orange-400">記録しました 🎉</p>
            <p className="mt-3 text-4xl font-black tracking-tight">
              {formatYen(saved.shift.revenue_yen)}
            </p>
            <p className="mt-2 text-sm text-white/60">
              {saved.shift.date} ・{" "}
              {PLATFORMS.find((p) => p.value === saved.shift.platform)?.label}
              {saved.shift.deliveries != null && ` ・ ${saved.shift.deliveries}件`}
            </p>
            {saved.shift.minutes_worked != null && saved.shift.minutes_worked > 0 && (
              <p className="mt-1 text-sm text-white/60">
                時給換算{" "}
                {formatYen(
                  hourlyRate(saved.shift.revenue_yen, saved.shift.minutes_worked),
                )}
              </p>
            )}
            {saved.streak > 1 && (
              <p className="mt-3 text-sm font-semibold text-orange-400">
                🔥 連続稼働 {saved.streak}日目
              </p>
            )}
          </div>

          <Link
            href={`/s?${buildShareQuery(saved.shift, saved.streak)}`}
            className="mt-6 block w-full rounded-xl bg-orange-500 py-3.5 text-center text-base font-bold text-white active:bg-orange-600"
          >
            シェアカードを作る
          </Link>
          <button
            type="button"
            onClick={reset}
            className="mt-3 w-full rounded-xl bg-white/10 py-3.5 text-base font-semibold text-white active:bg-white/15"
          >
            次のスクショを読み取る
          </button>
        </section>
      )}

      <BottomNav />
    </main>
  );
}
