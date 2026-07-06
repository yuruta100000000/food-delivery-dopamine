import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

// シェアカード画像(Strava風・1200x630)。
// next/og のデフォルトフォントは日本語グリフを含まないため、
// カードのラベルは英語表記で統一している(数字が主役のデザイン)。

export const runtime = "edge";

function clampInt(value: string | null, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), max);
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}m`;
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const revenue = clampInt(params.get("r"), 9_999_999);
  const deliveries = clampInt(params.get("d"), 999);
  const minutes = clampInt(params.get("m"), 24 * 60);
  const streak = clampInt(params.get("st"), 9999);

  const dateParam = params.get("dt") ?? "";
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateParam);
  const dateLabel = dateOk ? dateParam.replaceAll("-", ".") : "";
  const weekday = dateOk
    ? WEEKDAYS[new Date(`${dateParam}T00:00:00Z`).getUTCDay()]
    : "";

  const statItems: { label: string; value: string }[] = [];
  if (deliveries > 0) statItems.push({ label: "DELIVERIES", value: String(deliveries) });
  if (minutes > 0) statItems.push({ label: "TIME", value: formatTime(minutes) });
  if (minutes > 0 && revenue > 0)
    statItems.push({
      label: "PER HOUR",
      value: `¥${Math.round((revenue / minutes) * 60).toLocaleString("en-US")}`,
    });
  if (streak > 1) statItems.push({ label: "STREAK", value: `${streak} days` });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#0d0f12",
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 110%, rgba(249,115,22,0.28), transparent)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
            <span>Deli</span>
            <span style={{ color: "#f97316" }}>Log</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: 2,
            }}
          >
            {dateLabel && `${dateLabel} ${weekday}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 6,
              color: "#f97316",
              fontWeight: 700,
            }}
          >
            TODAY&apos;S EARNINGS
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 150,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 1.1,
            }}
          >
            ¥{revenue.toLocaleString("en-US")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 64 }}>
          {statItems.map((item) => (
            <div
              key={item.label}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  letterSpacing: 3,
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 48,
                  fontWeight: 700,
                  marginTop: 6,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
