import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // 旧URL(4タブ再設計でダッシュボード→レポートに改名)
    return [
      { source: "/dashboard", destination: "/report", permanent: false },
    ];
  },
};

export default nextConfig;
