import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // 旧URL(4タブ再設計でダッシュボード→レポートに改名)
    return [
      { source: "/dashboard", destination: "/report", permanent: false },
    ];
  },
  async headers() {
    // セキュリティヘッダー(2026-07-10 ハッキング対策パス)
    // CSPはNext/OG画像のinline要件と衝突しやすいため導入せず、まず基本形から。
    return [
      {
        source: "/:path*",
        headers: [
          // MIMEスニッフィング禁止
          { key: "X-Content-Type-Options", value: "nosniff" },
          // iframe埋め込み禁止(クリックジャッキング対策)
          { key: "X-Frame-Options", value: "DENY" },
          // 外部サイトへ遷移時にURLを漏らさない
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 使わないデバイス機能を明示的に遮断
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // HTTPS強制(Vercelは常時HTTPS)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
