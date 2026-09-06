import Link from "next/link";

const NAV_ITEMS = [
  { href: "/mission-rooms", icon: "meeting_room", label: "مأموریت‌ها" },
  { href: "/videos", icon: "school", label: "آموزش‌ها" },
  { href: "/dashboard", icon: "center_focus_strong", label: "مطالعه" },
  { href: "/leaderboard", icon: "leaderboard", label: "رده‌بندی" },
  { href: "/profile", icon: "person", label: "پروفایل" },
];

export default function BottomNavFallback() {
  return (
    <nav
      aria-label="ناوبری اصلی"
      className="bottom-nav liquid-glass fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex justify-around items-center gap-1 w-[calc(100%-1.5rem)] max-w-[480px] px-2 py-2 rounded-[28px]"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
    >
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group min-w-0 flex-1 rounded-[20px] active:scale-[0.96] transition-transform duration-100"
        >
          <span className="bottom-nav-item flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 py-2 text-on-surface-variant">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0", fontSize: "22px" }} aria-hidden="true">
              {item.icon}
            </span>
            <span className="text-[11px] font-semibold leading-none whitespace-nowrap">{item.label}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
