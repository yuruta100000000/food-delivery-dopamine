import type { Metadata } from "next";
import Link from "next/link";
import { formatMinutes, formatYen } from "@/lib/stats";

// シェアページ: クエリパラメータからカードを組み立てる(DB非依存)。
// このURLをXに投稿すると og:image のカードがタイムラインに展開される。

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pick(params: Record<string, string | string[] | undefined>, key: string): string {
  const v = params[key];
  return typeof v === "string" ? v : "";
}

function buildOgQuery(params: Record<string, string | string[] | undefined>): string {
  const qs = new URLSearchParams();
  for (const key of ["dt", "r", "d", "m", "st", "k", "lv"]) {
    const v = pick(params, key);
    if (v) qs.set(key, v);
  }
  return qs.toString();
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const revenue = Number(pick(params, "r")) || 0;
  const title = `今日の稼働 ${formatYen(revenue)} | DeliLog`;
  return {
    title,
    openGraph: {
      title,
      images: [{ url: `/api/og?${buildOgQuery(params)}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [`/api/og?${buildOgQuery(params)}`],
    },
  };
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const revenue = Number(pick(params, "r")) || 0;
  const deliveries = Number(pick(params, "d")) || 0;
  const minutes = Number(pick(params, "m")) || 0;
  const streak = Number(pick(params, "st")) || 0;
  const ogQuery = buildOgQuery(params);

  const site =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  const shareUrl = `${site}/s?${ogQuery}`;

  const textParts = [`今日の稼働 ${formatYen(revenue)}`];
  if (deliveries > 0) textParts.push(`${deliveries}件`);
  if (minutes > 0) textParts.push(formatMinutes(minutes));
  if (streak > 1) textParts.push(`🔥連続${streak}日`);
  const tweetText = `${textParts.join(" / ")} #DeliLog`;

  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    tweetText,
  )}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-16 pt-8">
      <header className="anim-rise mb-6">
        <p className="kicker text-orange-400/80">SHARE YOUR RIDE</p>
        <h1 className="display mt-1 text-3xl">今日の冒険を、世界へ。</h1>
      </header>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/og?${ogQuery}`}
        alt={`今日の稼働 ${formatYen(revenue)} のシェアカード`}
        width={1200}
        height={630}
        className="w-full rounded-2xl border border-white/10"
      />

      <a
        href={intentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-chunky btn-orange mt-6"
      >
        Xにポストする
      </a>
      <p className="mt-2 text-center text-xs text-white/30">
        ポストするとカード画像がタイムラインに表示されます
      </p>

      <Link href="/" className="mt-8 text-center text-sm text-white/40">
        ← 記録にもどる
      </Link>
    </main>
  );
}
