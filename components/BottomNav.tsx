"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconAperture, IconPulse } from "@/components/icons";

const TABS = [
  { href: "/", label: "記録", Icon: IconAperture },
  { href: "/dashboard", label: "旅の記録", Icon: IconPulse },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="hairline-t fixed inset-x-0 bottom-0 z-20 bg-[#05060a]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md px-6 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`row-press flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold tracking-wider transition ${
                active ? "text-white" : "text-white/30"
              }`}
            >
              <Icon size={20} className={active ? "text-orange-400" : ""} />
              {label}
              <span
                className={`h-0.5 w-5 rounded-full transition ${
                  active ? "bg-orange-500" : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
