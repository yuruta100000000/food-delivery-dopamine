import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

// 世界観: 「配達は、冒険だ。」— 真夜中の都市を駆けるライダーの旅。
// 見出しは Zen Kaku Gothic New(極太)、数字は Space Grotesk。

const zen = Zen_Kaku_Gothic_New({
  weight: ["500", "700", "900"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-zen",
});

const grotesk = Space_Grotesk({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-grotesk",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "DeliLog — 配達は、冒険だ。",
  description:
    "売上スクショをAIが読み取り、複数社横断の稼働記録と冒険の軌跡をつくる。配達員のためのStrava。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07080c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${zen.variable} ${grotesk.variable}`}>
      <body>
        <div className="horizon" aria-hidden />
        {children}
      </body>
    </html>
  );
}
