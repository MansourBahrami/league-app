"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/mission-rooms", icon: "meeting_room", label: "کمپ مأموریت", tour: "nav-rooms" },
  { href: "/videos", icon: "school", label: "آموزش‌ها", tour: "nav-videos" },
  { href: "/dashboard", icon: "center_focus_strong", label: "مطالعه", tour: "nav-dashboard" },
  { href: "/leaderboard", icon: "leaderboard", label: "رده‌بندی", tour: "nav-leaderboard" },
  { href: "/profile", icon: "person", label: "پروفایل", tour: "nav-profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="liquid-glass fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center gap-1 w-[calc(100%-1.5rem)] max-w-[480px] px-2 py-2 rounded-[28px]"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={item.tour}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 py-2 transition-all duration-200 ${
              isActive
                ? "bg-primary text-on-primary shadow-[0_3px_10px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]"
                : "text-on-surface-variant hover:text-primary active:scale-95"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                fontSize: "22px",
              }}
            >
              {item.icon}
            </span>
            <span className="text-[11px] font-semibold leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
