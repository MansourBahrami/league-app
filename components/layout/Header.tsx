"use client";

import Link from "next/link";
import StarBadge from "@/components/ui/StarBadge";

interface User {
  name: string | null;
  xp: number;
  coins: number;
  level: string;
  stars: number;
  avatarUrl: string | null;
}

interface HeaderProps {
  user: User;
  xp: number;
  coins: number;
  unreadCount?: number;
}

const LEVEL_LABELS: Record<string, string> = {
  "تازه‌نفس": "تازه نفس",
  "ثابت‌قدم": "ثابت قدم",
  "پیشرو": "پیشرو",
  "سرآمد": "سرآمد",
  "الگو": "الگو",
};

export default function Header({ user, xp, coins, unreadCount = 0 }: HeaderProps) {
  return (
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-50 flex justify-between items-center px-5 py-2 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_2px_12px_rgba(70,72,212,0.06)]">
      {/* Leading: Avatar + level */}
      <Link href="/profile" className="flex items-center gap-2.5 cursor-pointer hover:scale-105 transition-transform">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 p-0.5">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} className="w-full h-full object-cover rounded-full" alt="Avatar" />
          ) : (
            <div className="w-full h-full rounded-full bg-primary-fixed flex items-center justify-center">
              <span className="text-[18px] font-bold text-primary">
                {user.name ? user.name[0] : "؟"}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-start">
          <span className="text-[16px] font-bold text-primary leading-tight">
            {user.name ?? "تمرکز"}
          </span>
          {/* سطح + قاب ۳ ستاره (خاموش/روشن) */}
          <span className="flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant" dir="rtl">
            {LEVEL_LABELS[user.level] ?? user.level} ـ
            <StarBadge stars={user.stars} total={3} size={11} />
          </span>
        </div>
      </Link>

      {/* Trailing: Inbox bell + XP & Coins */}
      <div className="flex items-center gap-2" dir="ltr">
        <Link
          href="/inbox"
          data-tour="inbox"
          className="relative flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-high hover:scale-105 transition-transform"
          aria-label="صندوق"
        >
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant" style={{ fontVariationSettings: unreadCount > 0 ? "'FILL' 1" : "'FILL' 0" }}>notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center border-2 border-surface">
              {unreadCount > 99 ? "۹۹+" : unreadCount.toLocaleString("fa-IR")}
            </span>
          )}
        </Link>
        <div data-tour="rewards" className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-container-high px-2 py-1.5 rounded-full hover:scale-105 transition-transform cursor-pointer">
            <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <span className="text-[14px] font-bold text-primary">{xp.toLocaleString("fa-IR")}</span>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-high px-2 py-1.5 rounded-full hover:scale-105 transition-transform cursor-pointer">
            <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>generating_tokens</span>
            <span className="text-[14px] font-bold text-tertiary">{coins.toLocaleString("fa-IR")}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
