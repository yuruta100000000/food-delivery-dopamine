"use client";

import { useMemo, useState } from "react";
import type { Shift } from "@/lib/storage";
import { formatYen, todayIso } from "@/lib/stats";

// 売上カレンダー: 走った夜が、残り火の濃淡で街の灯りのように浮かぶ。
// セルをタップするとその日の内訳が下に出る。

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;

function monthLabel(ym: string): string {
  return `${Number(ym.slice(0, 4))}年${Number(ym.slice(5, 7))}月`;
}

function shiftMonth(ym: string, delta: number): string {
  const d = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default function RevenueCalendar({ shifts }: { shifts: Shift[] }) {
  const today = todayIso();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string | null>(today);

  const { cells, maxRevenue, byDate } = useMemo(() => {
    const byDate = new Map<string, { total: number; count: number }>();
    for (const s of shifts) {
      if (!s.date.startsWith(month)) continue;
      const cur = byDate.get(s.date) ?? { total: 0, count: 0 };
      cur.total += s.revenue_yen;
      cur.count += 1;
      byDate.set(s.date, cur);
    }
    const [y, m] = [Number(month.slice(0, 4)), Number(month.slice(5, 7))];
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0=日
    const pad = firstDow === 0 ? 6 : firstDow - 1; // 月曜始まり
    const cells: (string | null)[] = [
      ...Array.from({ length: pad }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => {
        const dd = String(i + 1).padStart(2, "0");
        return `${month}-${dd}`;
      }),
    ];
    const maxRevenue = Math.max(0, ...[...byDate.values()].map((v) => v.total));
    return { cells, maxRevenue, byDate };
  }, [shifts, month]);

  const selectedData = selected ? byDate.get(selected) : undefined;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="kicker text-white/35">Calendar</p>
        <div className="num flex items-center gap-4 text-xs text-white/60">
          <button
            type="button"
            aria-label="前の月"
            className="row-press px-2 py-1 text-white/40"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
          >
            ‹
          </button>
          <span className="font-bold text-white/80">{monthLabel(month)}</span>
          <button
            type="button"
            aria-label="次の月"
            className="row-press px-2 py-1 text-white/40"
            disabled={month >= today.slice(0, 7)}
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <p key={w} className="pb-1 text-center text-[9px] text-white/25">
            {w}
          </p>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`pad-${i}`} />;
          const data = byDate.get(date);
          const ratio =
            data && maxRevenue > 0 ? Math.max(data.total / maxRevenue, 0.18) : 0;
          const isToday = date === today;
          const isSelected = date === selected;
          const isFuture = date > today;
          return (
            <button
              key={date}
              type="button"
              disabled={isFuture}
              onClick={() => setSelected(date)}
              className="row-press relative aspect-square rounded-[7px]"
              style={{
                background:
                  ratio > 0
                    ? `rgba(249,115,22,${0.16 + ratio * 0.72})`
                    : "rgba(255,255,255,0.035)",
                boxShadow:
                  ratio > 0.66
                    ? "0 0 12px rgba(249,115,22,0.45)"
                    : ratio > 0
                      ? "0 0 6px rgba(249,115,22,0.18)"
                      : "none",
                outline: isSelected
                  ? "1px solid rgba(255,255,255,0.65)"
                  : isToday
                    ? "1px solid rgba(249,115,22,0.6)"
                    : "none",
                outlineOffset: 1.5,
                opacity: isFuture ? 0.3 : 1,
              }}
            >
              <span
                className={`num absolute left-1 top-0.5 text-[8px] ${
                  ratio > 0.4 ? "text-white/90" : "text-white/30"
                }`}
              >
                {Number(date.slice(8, 10))}
              </span>
            </button>
          );
        })}
      </div>

      {/* 選択日の詳細 */}
      <div className="hairline-t mt-4 flex items-baseline justify-between pt-3">
        <p className="num text-[11px] text-white/40">
          {selected ? selected.replaceAll("-", ".") : "—"}
        </p>
        {selectedData ? (
          <p className="num text-sm text-white">
            {formatYen(selectedData.total)}
            <span className="ml-2 text-[10px] text-white/35">
              {selectedData.count}件の記録
            </span>
          </p>
        ) : (
          <p className="text-[11px] text-white/25">記録なし</p>
        )}
      </div>
    </div>
  );
}
