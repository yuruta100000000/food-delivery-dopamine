"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "記録", icon: "📸" },
  { href: "/dashboard", label: "ダッシュボード", icon: "📊" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/8 bg-[#07080c]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md gap-2 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-xs transition ${
                active
                  ? "bg-orange-500/15 font-extrabold text-orange-400"
                  : "text-white/40"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
