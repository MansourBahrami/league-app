"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "center_focus_strong", label: "تمرکز" },
  { href: "/feed", icon: "bolt", label: "بورد زنده" },
  { href: "/leaderboard", icon: "leaderboard", label: "جدول‌برتر" },
  { href: "/profile", icon: "person", label: "پروفایل" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-50 flex flex-row-reverse justify-around items-center px-4 pt-2 bg-surface/70 backdrop-blur-xl border-t border-outline-variant/20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-2xl md:max-w-[600px] md:left-1/2 md:-translate-x-1/2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all ${
              isActive
                ? "bg-primary-fixed text-primary scale-95"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span
              className="material-symbols-outlined mb-0.5 text-[22px]"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className="text-[12px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
