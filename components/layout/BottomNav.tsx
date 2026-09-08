"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/mission-rooms", icon: "meeting_room", label: "مأموریت‌ها", tour: "nav-rooms" },
  { href: "/videos", icon: "school", label: "آموزش‌ها", tour: "nav-videos" },
  { href: "/dashboard", icon: "center_focus_strong", label: "مطالعه", tour: "nav-dashboard" },
  { href: "/leaderboard", icon: "leaderboard", label: "رده‌بندی", tour: "nav-leaderboard" },
  { href: "/profile", icon: "person", label: "پروفایل", tour: "nav-profile" },
];

function NavItemContent({
  icon,
  label,
  isActive,
}: {
  icon: string;
  label: string;
  isActive: boolean;
}) {
  const { pending } = useLinkStatus();
  const highlighted = isActive || pending;

  return (
    <span
      aria-busy={pending || undefined}
      className={`bottom-nav-item relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 py-2 transition-[color,background-color,box-shadow,transform] duration-150 ${
        highlighted
          ? "bg-primary text-on-primary shadow-[0_3px_10px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]"
          : "text-on-surface-variant group-hover:text-primary"
      }`}
    >
      <span
        className="material-symbols-outlined transition-transform duration-150 group-active:scale-90"
        style={{
          fontVariationSettings: highlighted ? "'FILL' 1" : "'FILL' 0",
          fontSize: "22px",
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="text-[11px] font-semibold leading-none whitespace-nowrap">{label}</span>
      <span
        aria-hidden="true"
        className={`bottom-nav-pending-dot absolute top-1.5 h-1.5 w-1.5 rounded-full bg-current ${pending ? "is-pending" : ""}`}
      />
      {pending && <span className="sr-only" role="status">در حال باز کردن {label}</span>}
    </span>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="bottom-nav liquid-glass fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center gap-1 w-[calc(100%-1.5rem)] max-w-[480px] px-2 py-2 rounded-[28px]"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            data-tour={item.tour}
            aria-current={isActive ? "page" : undefined}
            className="group min-w-0 flex-1 rounded-[20px] active:scale-[0.96] transition-transform duration-100"
          >
            <NavItemContent icon={item.icon} label={item.label} isActive={isActive} />
          </Link>
        );
      })}
    </nav>
  );
}
