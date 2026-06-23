"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { faIR } from "date-fns/locale";

// مجموعه‌ی واکنش‌های مجاز — باید با lib/reaction.ts هماهنگ بماند
const REACTION_EMOJIS = ["🔥", "👏", "💪", "❤️", "🎯"];

// هر نوع فعالیت: آیکون + رنگ آیکون + رنگ پس‌زمینه‌ی نشان + رنگ نوار کناری (تمایز بصری)
const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; accent: string }> = {
  timer_start: { icon: "timer", color: "#4648d4", bg: "#e1e0ff", accent: "#4648d4" },
  session_complete: { icon: "menu_book", color: "#006c49", bg: "#d4f5e6", accent: "#006c49" },
  mission_buy: { icon: "shopping_cart", color: "#825100", bg: "#ffddb8", accent: "#ffb95f" },
  medal_earn: { icon: "workspace_premium", color: "#b45309", bg: "#fff7eb", accent: "#ffb95f" },
  level_up: { icon: "trending_up", color: "#4648d4", bg: "#dce9ff", accent: "#6063ee" },
  streak: { icon: "local_fire_department", color: "#c2410c", bg: "#ffedd5", accent: "#fb923c" },
  video_complete: { icon: "smart_display", color: "#006c49", bg: "#d4f5e6", accent: "#006c49" },
  video_buy: { icon: "play_circle", color: "#825100", bg: "#ffddb8", accent: "#ffb95f" },
};
const DEFAULT_CONFIG = { icon: "bolt", color: "#464554", bg: "#eef0f4", accent: "#c7c4d7" };

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
  video_buy: () => "یک ویدیوی آموزشی خرید",
};

interface Activity {
  id: string;
  userId: string;
  type: string;
  metadata: unknown;
  createdAt: string | Date;
  user: { name: string | null; avatarUrl: string | null };
}

type CountsMap = Record<string, Record<string, number>>;
type MineMap = Record<string, string>;

interface Props {
  initialActivities: Activity[];
  meId: string;
  initialCounts: CountsMap;
  initialMine: MineMap;
}

export default function LiveFeed({ initialActivities, meId, initialCounts, initialMine }: Props) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [counts, setCounts] = useState<CountsMap>(initialCounts);
  const [mine, setMine] = useState<MineMap>(initialMine);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function react(activityId: string, emoji: string) {
    setPickerFor(null);
    const prevMine = mine[activityId] ?? null;
    const prevCounts = counts[activityId] ?? {};

    // به‌روزرسانی خوش‌بینانه
    const nextActivityCounts = { ...prevCounts };
    let nextMine: string | null;
    if (prevMine === emoji) {
      nextActivityCounts[emoji] = Math.max(0, (nextActivityCounts[emoji] ?? 1) - 1);
      nextMine = null;
    } else {
      if (prevMine) nextActivityCounts[prevMine] = Math.max(0, (nextActivityCounts[prevMine] ?? 1) - 1);
      nextActivityCounts[emoji] = (nextActivityCounts[emoji] ?? 0) + 1;
      nextMine = emoji;
    }
    setCounts((c) => ({ ...c, [activityId]: nextActivityCounts }));
    setMine((m) => {
      const copy = { ...m };
      if (nextMine) copy[activityId] = nextMine;
      else delete copy[activityId];
      return copy;
    });

    try {
      const res = await fetch(`/api/feed/${activityId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error("failed");
      const data: { counts: Record<string, number>; myEmoji: string | null; rewardGranted: boolean } = await res.json();
      // منبع حقیقت: پاسخ سرور
      setCounts((c) => ({ ...c, [activityId]: data.counts }));
      setMine((m) => {
        const copy = { ...m };
        if (data.myEmoji) copy[activityId] = data.myEmoji;
        else delete copy[activityId];
        return copy;
      });
      if (data.rewardGranted) setToast("۵ سکه‌ی تشویق گرفتی! 🎉");
    } catch {
      // بازگردانی در صورت خطا
      setCounts((c) => ({ ...c, [activityId]: prevCounts }));
      setMine((m) => {
        const copy = { ...m };
        if (prevMine) copy[activityId] = prevMine;
        else delete copy[activityId];
        return copy;
      });
    }
  }

  if (activities.length === 0) {
    return <p className="text-[#464554] text-center py-8">هنوز فعالیتی ثبت نشده. اول شروع کن!</p>;
  }

  return (
    <div className="w-full space-y-3">
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] bg-[#006c49] text-white text-[13px] font-bold px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {activities.map((a, i) => {
        const config = TYPE_CONFIG[a.type] ?? DEFAULT_CONFIG;
        const meta = (a.metadata ?? {}) as Record<string, unknown>;
        const label = TYPE_LABEL[a.type]?.(meta) ?? a.type;
        const name = a.user.name ?? "کاربر";
        const isMine = a.userId === meId;
        const itemCounts = counts[a.id] ?? {};
        const myEmoji = mine[a.id] ?? null;
        const activeEmojis = REACTION_EMOJIS.filter((e) => (itemCounts[e] ?? 0) > 0);
        // نوار واکنش فقط وقتی چیزی برای نمایش هست رندر شود (وگرنه حاشیه‌ی خالی می‌ماند)
        const isPicking = pickerFor === a.id;
        const showReactionRow = !isMine || activeEmojis.length > 0;

        return (
          <div
            key={a.id}
            className="glass-card w-full rounded-xl px-3 py-2.5 feed-item-enter border-r-4"
            style={{ animationDelay: `${i * 0.05}s`, borderRightColor: config.accent }}
          >
            <div className="flex items-center gap-2.5">
              {/* آواتار + نشان نوع فعالیت (سمت راست در RTL) */}
              <Link href={`/profile/${a.userId}`} className="relative shrink-0 hover:scale-105 transition-transform">
                {a.user.avatarUrl ? (
                  <img src={a.user.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-[#c7c4d7]" alt={name} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#e1e0ff] flex items-center justify-center border border-[#4648d4]/20 text-[16px] font-bold text-[#4648d4]">
                    {name[0]}
                  </div>
                )}
                <span
                  className="absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
                  style={{ backgroundColor: config.bg }}
                >
                  <span className="material-symbols-outlined text-[12px]" style={{ color: config.color, fontVariationSettings: "'FILL' 1" }}>
                    {config.icon}
                  </span>
                </span>
              </Link>

              {/* متن + خط متادیتا (زمان سمت راست، واکنش‌ها سمت چپ) */}
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[13.5px] text-[#0b1c30] leading-snug">
                  <Link href={`/profile/${a.userId}`} className="font-bold text-[#4648d4] hover:underline">{name}</Link>{" "}
                  {label}
                </p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="material-symbols-outlined text-[12px] text-[#767586]">schedule</span>
                    <span className="text-[11px] text-[#767586]">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: faIR })}
                    </span>
                  </div>

                  {/* واکنش‌ها روی همان خط زمان — بدون افزودن ارتفاع اضافه */}
                  {showReactionRow && (
                    <div className="flex items-center gap-1 flex-row-reverse min-w-0 overflow-hidden">
                      {!isMine && (
                        <button
                          onClick={() => setPickerFor((p) => (p === a.id ? null : a.id))}
                          className={`flex items-center justify-center w-7 h-7 rounded-full border shrink-0 transition-colors ${
                            myEmoji || isPicking
                              ? "bg-[#e1e0ff] border-[#4648d4]/30"
                              : "bg-surface-container border-outline-variant/40 hover:bg-[#e1e0ff]"
                          }`}
                          aria-label="افزودن واکنش"
                        >
                          {myEmoji ? (
                            <span className="text-[15px] leading-none">{myEmoji}</span>
                          ) : (
                            <span className="material-symbols-outlined text-[16px] text-[#767586]">add_reaction</span>
                          )}
                        </button>
                      )}
                      {activeEmojis.map((e) => (
                        <button
                          key={e}
                          onClick={() => !isMine && react(a.id, e)}
                          disabled={isMine}
                          className={`flex items-center gap-0.5 px-1.5 h-7 rounded-full border shrink-0 text-[12px] font-semibold transition-colors ${
                            myEmoji === e
                              ? "bg-[#e1e0ff] border-[#4648d4]/40 text-[#4648d4]"
                              : "bg-surface-container border-outline-variant/30 text-[#464554]"
                          } ${isMine ? "cursor-default" : "hover:bg-[#e1e0ff]"}`}
                        >
                          <span className="text-[13px] leading-none">{e}</span>
                          <span>{faNum(itemCounts[e])}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* انتخابگر واکنش — درون‌خطی (همیشه داخل صفحه، بدون بریدگی) */}
            {isPicking && (
              <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-outline-variant/20 flex-row-reverse flex-wrap">
                {REACTION_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => react(a.id, e)}
                    className={`text-[19px] leading-none w-9 h-9 rounded-full border transition-transform hover:scale-110 ${
                      myEmoji === e
                        ? "bg-[#e1e0ff] border-[#4648d4]/40"
                        : "bg-surface-container border-outline-variant/30"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
