"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { faIR } from "date-fns/locale";

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  timer_start: { icon: "play_circle", color: "text-primary" },
  session_complete: { icon: "menu_book", color: "text-primary" },
  mission_buy: { icon: "shopping_cart", color: "text-secondary" },
  medal_earn: { icon: "workspace_premium", color: "text-tertiary" },
  level_up: { icon: "trending_up", color: "text-primary" },
  streak: { icon: "local_fire_department", color: "text-tertiary" },
  video_complete: { icon: "smart_display", color: "text-secondary" },
};

function faNum(v: unknown): string {
  return Number(v ?? 0).toLocaleString("fa-IR");
}

const TYPE_LABEL: Record<string, (m: Record<string, unknown>) => string> = {
  timer_start: (m) => `تایمر ${faNum(m.durationMin)} دقیقه‌ای رو شروع کرد`,
  session_complete: (m) => `${faNum(m.durationMin)} دقیقه مطالعه کرد`,
  mission_buy: (m) => `ماموریت ${faNum(m.targetHours)} ساعته خرید`,
  medal_earn: (m) => `مدال ${faNum(m.targetHours)} ساعته گرفت`,
  level_up: (m) => `به سطح ${m.level ?? ""} رسید`,
  streak: (m) => `به زنجیره ${faNum(m.streak)} روزه رسید 🔥`,
  video_complete: () => "یک ویدیوی آموزشی رو کامل دید",
};

interface Activity {
  id: string;
  userId: string;
  type: string;
  metadata: unknown;
  createdAt: string | Date;
  user: { name: string | null; avatarUrl: string | null };
}

interface Props {
  initialActivities: Activity[];
}

export default function LiveFeed({ initialActivities }: Props) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);

  useEffect(() => {
    const es = new EventSource("/api/feed/stream");

    es.onmessage = (event) => {
      try {
        const activity: Activity = JSON.parse(event.data);
        setActivities((prev) => [activity, ...prev].slice(0, 200));
      } catch {}
    };

    return () => es.close();
  }, []);

  if (activities.length === 0) {
    return <p className="text-[#464554] text-center py-8">هنوز فعالیتی ثبت نشده. اول شروع کن!</p>;
  }

  return (
    <div className="w-full space-y-3">
      {activities.map((a, i) => {
        const config = TYPE_CONFIG[a.type] ?? { icon: "info", color: "text-[#464554]" };
        const meta = (a.metadata ?? {}) as Record<string, unknown>;
        const label = TYPE_LABEL[a.type]?.(meta) ?? a.type;
        const name = a.user.name ?? "کاربر";

        return (
          <div
            key={a.id}
            className="glass-card w-full rounded-xl p-4 flex items-center gap-4 feed-item-enter"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <Link href={`/profile/${a.userId}`} className="shrink-0 hover:scale-105 transition-transform">
              {a.user.avatarUrl ? (
                <img src={a.user.avatarUrl} className="w-12 h-12 rounded-full object-cover border border-[#c7c4d7]" alt={name} />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#e1e0ff] flex items-center justify-center border border-[#4648d4]/20 text-[18px] font-bold text-[#4648d4]">
                  {name[0]}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] text-[#0b1c30] truncate">
                <Link href={`/profile/${a.userId}`} className="font-bold text-[#4648d4] hover:underline">{name}</Link> {label}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px] text-[#767586]">schedule</span>
                <span className="text-[12px] text-[#767586]">
                  {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: faIR })}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#e5eeff] flex items-center justify-center shrink-0">
              <span className={`material-symbols-outlined ${config.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {config.icon}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
