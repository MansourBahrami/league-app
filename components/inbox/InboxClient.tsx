"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { faIR } from "date-fns/locale";

interface InboxItem {
  id: string;
  type: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
  actor: { id: string; name: string | null; avatarUrl: string | null } | null;
}

interface Props {
  initialItems: InboxItem[];
}

function faNum(v: unknown): string {
  return Number(v ?? 0).toLocaleString("fa-IR");
}

function renderContent(it: InboxItem): { text: string; icon: string; bg: string; color: string; href: string } {
  const actorName = it.actor?.name ?? "یک کاربر";
  const meta = it.metadata ?? {};
  switch (it.type) {
    case "reaction":
      return {
        text: `${actorName} با ${String(meta.emoji ?? "🔥")} به فعالیتت واکنش نشون داد`,
        icon: "favorite",
        bg: "#ffe1e6",
        color: "#c2185b",
        href: it.actor ? `/profile/${it.actor.id}` : "/feed",
      };
    case "reaction_reward":
      return {
        text: `به ${faNum(meta.targets ?? 5)} نفر واکنش دادی و ${faNum(meta.coins ?? 5)} سکه گرفتی! 🎉`,
        icon: "generating_tokens",
        bg: "#ffddb8",
        color: "#825100",
        href: "/feed",
      };
    case "message":
      return {
        text: it.body ?? `${actorName} برات پیام فرستاد`,
        icon: "chat_bubble",
        bg: "#e1e0ff",
        color: "#4648d4",
        href: it.actor ? `/profile/${it.actor.id}` : "/inbox",
      };
    default:
      return { text: it.body ?? it.type, icon: "notifications", bg: "#eef0f4", color: "#464554", href: "/inbox" };
  }
}

export default function InboxClient({ initialItems }: Props) {
  const router = useRouter();

  useEffect(() => {
    const hasUnread = initialItems.some((it) => !it.read);
    if (!hasUnread) return;
    // علامت‌گذاری خوانده‌شده + تازه‌سازی برای پاک شدن نشان زنگوله در هدر
    fetch("/api/inbox/read", { method: "POST" }).then(() => router.refresh()).catch(() => {});
  }, [initialItems, router]);

  if (initialItems.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant">
        <span className="material-symbols-outlined text-[48px] text-outline-variant mb-2 block">mark_email_read</span>
        <p className="text-[14px]">هنوز پیامی نداری. وقتی کسی به فعالیتت واکنش بده، اینجا می‌بینی.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5">
      {initialItems.map((it) => {
        const c = renderContent(it);
        return (
          <Link
            key={it.id}
            href={c.href}
            className={`glass-card w-full rounded-xl p-3 flex items-start gap-3 transition-colors ${
              it.read ? "" : "border-r-4 border-r-primary bg-primary-fixed/30"
            }`}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: c.bg }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color: c.color, fontVariationSettings: "'FILL' 1" }}>
                {c.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[14px] text-[#0b1c30] leading-snug">{c.text}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[13px] text-[#767586]">schedule</span>
                <span className="text-[11px] text-[#767586]">
                  {formatDistanceToNow(new Date(it.createdAt), { addSuffix: true, locale: faIR })}
                </span>
              </div>
            </div>
            {!it.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
          </Link>
        );
      })}
    </div>
  );
}
