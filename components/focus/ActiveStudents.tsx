"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActiveFocusSnapshot, ActiveFocusUser } from "@/lib/focus";

interface Props {
  initialSnapshot: ActiveFocusSnapshot;
  currentUserId: string;
}

function getSessionTiming(user: ActiveFocusUser, nowMs: number) {
  const elapsedSec = Math.max(
    0,
    Math.floor((nowMs - Date.parse(user.startedAt)) / 1000) - user.pausedSec
  );
  const totalSec = user.plannedMin * 60;
  const remainingSec = Math.max(0, totalSec - elapsedSec);

  return {
    elapsedMin: Math.min(user.plannedMin, Math.floor(elapsedSec / 60)),
    remainingMin: Math.ceil(remainingSec / 60),
    progress: Math.min(100, Math.max(0, (elapsedSec / totalSec) * 100)),
    isFinished: remainingSec <= 0,
  };
}

export default function ActiveStudents({ initialSnapshot, currentUserId }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [nowMs, setNowMs] = useState(() => Date.parse(initialSnapshot.updatedAt));

  const refresh = useCallback(async () => {
    const response = await fetch("/api/focus/active", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;

    const data = await response.json().catch(() => null) as (ActiveFocusSnapshot & { count: number }) | null;
    if (!data || !Array.isArray(data.users) || typeof data.updatedAt !== "string") return;

    setSnapshot({ users: data.users, updatedAt: data.updatedAt });
    setNowMs(Date.parse(data.updatedAt));
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => setNowMs(Date.now()), 1000);
    const poll = window.setInterval(() => void refresh(), 15_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onSessionChange = () => window.setTimeout(() => void refresh(), 500);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus-session-changed", onSessionChange);

    const events = new EventSource("/api/feed/stream");
    events.onmessage = (event) => {
      try {
        const activity = JSON.parse(event.data) as { type?: string };
        if (activity.type === "timer_start" || activity.type === "session_complete") {
          window.setTimeout(() => void refresh(), 500);
        }
      } catch {}
    };

    return () => {
      window.clearInterval(clock);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus-session-changed", onSessionChange);
      events.close();
    };
  }, [refresh]);

  const activeUsers = useMemo(
    () => snapshot.users.filter((user) => !getSessionTiming(user, nowMs).isFinished),
    [snapshot.users, nowMs]
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            menu_book
          </span>
        </span>
        <div className="min-w-0 flex-1 text-right">
          <h1 className="text-[16px] font-extrabold text-on-surface">در حال مطالعه</h1>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">همین حالا در G-camp</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary-container px-2.5 py-1 text-[11px] font-bold text-on-secondary-container">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
          {activeUsers.length.toLocaleString("fa-IR")} نفر
        </span>
      </header>

      {activeUsers.length === 0 ? (
        <section className="glass-card flex flex-col items-center rounded-[2rem] px-5 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[32px]">auto_stories</span>
          </span>
          <h2 className="mt-4 text-[16px] font-extrabold text-on-surface">فعلاً کسی در حال مطالعه نیست</h2>
          <p className="mt-1 text-[12px] text-on-surface-variant">شروع کن تا اولین نفر این جمع باشی.</p>
          <Link href="/dashboard" className="gamified-btn mt-5 rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-on-primary">
            شروع مطالعه
          </Link>
        </section>
      ) : (
        <section className="space-y-3" aria-live="polite">
          {activeUsers.map((user) => {
            const timing = getSessionTiming(user, nowMs);
            const isCurrentUser = user.userId === currentUserId;
            const name = user.name ?? "یک دانش‌آموز";

            return (
              <Link
                key={user.userId}
                href={isCurrentUser ? "/profile" : `/profile/${user.userId}`}
                className={`glass-card block rounded-2xl border p-3.5 transition-transform active:scale-[0.99] ${
                  isCurrentUser ? "border-primary/45 bg-primary-fixed/30" : "border-outline-variant/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} className="h-12 w-12 rounded-full border-2 border-surface-container-lowest object-cover shadow-sm" alt={name} />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-primary-fixed text-[17px] font-extrabold text-primary shadow-sm">
                        {name[0]}
                      </div>
                    )}
                    <span className="absolute bottom-0 left-0 h-3.5 w-3.5 rounded-full border-[3px] border-surface-container-lowest bg-secondary" />
                  </div>

                  <div className="min-w-0 flex-1 text-right">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[14px] font-extrabold text-on-surface">
                        {isCurrentUser ? "شما" : name}
                      </h2>
                      {isCurrentUser && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-on-primary">تایمر شما</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-on-surface-variant">سطح {user.level}</p>
                  </div>

                  <div className="shrink-0 text-left">
                    <p className="text-[13px] font-extrabold text-secondary">
                      {timing.remainingMin.toLocaleString("fa-IR")} دقیقه
                    </p>
                    <p className="text-[10px] text-outline">باقی‌مانده</p>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-secondary to-primary transition-[width] duration-1000 ease-linear"
                    style={{ width: `${timing.progress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-on-surface-variant">
                  <span>{timing.elapsedMin.toLocaleString("fa-IR")} دقیقه مطالعه</span>
                  <span>تایمر {user.plannedMin.toLocaleString("fa-IR")} دقیقه‌ای</span>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
