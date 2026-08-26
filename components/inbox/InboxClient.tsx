"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { captureClientError } from "@/lib/analytics-client";
import { formatRelativeTimeFa } from "@/lib/format";

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
        bg: "var(--color-secondary-container)",
        color: "var(--color-secondary)",
        href: it.actor ? `/profile/${it.actor.id}` : "/feed",
      };
    case "reaction_reward":
      return {
        text: `${faNum(meta.targets ?? 5)} نفر رو تشویق کردی؛ ${faNum(meta.coins ?? 5)} سکه گرفتی.`,
        icon: "generating_tokens",
        bg: "var(--color-tertiary-fixed)",
        color: "var(--color-tertiary)",
        href: "/feed",
      };
    case "room_cheer":
      return {
        text: `${actorName}: ${it.body ?? "ادامه بده!"}`,
        icon: "volunteer_activism",
        bg: "var(--color-secondary-container)",
        color: "var(--color-secondary)",
        href: typeof meta.roomId === "string" ? `/mission-rooms/${meta.roomId}` : "/mission-rooms",
      };
    case "message":
      return {
        text: it.body ?? `${actorName} برات پیام فرستاد`,
        icon: "chat_bubble",
        bg: "var(--color-primary-fixed)",
        color: "var(--color-primary)",
        href: it.actor ? `/profile/${it.actor.id}` : "/inbox",
      };
    default:
      return { text: it.body ?? it.type, icon: "notifications", bg: "var(--color-info-container)", color: "var(--color-info)", href: "/inbox" };
  }
}

export default function InboxClient({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    const hasUnread = initialItems.some((it) => !it.read);
    if (!hasUnread) return;
    // علامت‌گذاری خوانده‌شده در پس‌زمینه بدون ایجاد بار اضافه و رندر مجدد سرور
    fetch("/api/inbox/read", { method: "POST" })
      .then((response) => {
        if (!response.ok) throw new Error(`http_${response.status}`);
        setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      })
      .catch((caught) => {
        captureClientError("inbox.mark_read", caught);
      });
  }, [initialItems]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant">
        <span className="material-symbols-outlined text-[48px] text-outline-variant mb-2 block">mark_email_read</span>
        <p className="text-[14px]">هنوز پیامی نداری. وقتی کسی به فعالیتت واکنش بده، اینجا می‌بینی.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5">
      {items.map((it) => {
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
              <p className="text-[14px] text-on-surface leading-snug">{c.text}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[13px] text-outline">schedule</span>
                <span className="text-[11px] text-outline">
                  {formatRelativeTimeFa(it.createdAt)}
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
