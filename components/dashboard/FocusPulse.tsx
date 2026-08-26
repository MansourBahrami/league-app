"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatRelativeTimeFa } from "@/lib/format";
import { captureClientError } from "@/lib/analytics-client";

export interface FocusPulseActivity {
  id: string;
  userId: string;
  type: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string | null; avatarUrl: string | null };
}

interface Props {
  initialActivities: FocusPulseActivity[];
  initialActiveCount: number;
}

const ALLOWED_TYPES = new Set(["session_complete", "medal_earn", "level_up", "streak"]);

const TYPE_CONFIG: Record<string, { icon: string; accent: string; iconBg: string }> = {
  session_complete: { icon: "menu_book", accent: "text-secondary", iconBg: "bg-secondary-container" },
  medal_earn: { icon: "workspace_premium", accent: "text-tertiary", iconBg: "bg-tertiary-fixed" },
  level_up: { icon: "trending_up", accent: "text-primary", iconBg: "bg-primary-fixed" },
  streak: { icon: "local_fire_department", accent: "text-secondary", iconBg: "bg-secondary-container" },
};

function faNum(value: unknown): string {
  return Number(value ?? 0).toLocaleString("fa-IR");
}

function activityLabel(activity: FocusPulseActivity): string {
  const meta = activity.metadata ?? {};
  switch (activity.type) {
    case "session_complete":
      return `${faNum(meta.durationMin)} دقیقه مطالعه کرد`;
    case "medal_earn":
      return `مدال ${faNum(meta.targetHours)} ساعته گرفت`;
    case "level_up":
      return `به سطح ${String(meta.level ?? "جدید")} رسید`;
    case "streak":
      return `به زنجیره ${faNum(meta.streak)} روزه رسید`;
    default:
      return "یک قدم جلوتر رفت";
  }
}

function hasUsefulMetadata(activity: FocusPulseActivity): boolean {
  const metadata = activity.metadata ?? {};
  if (activity.type === "session_complete") return Number(metadata.durationMin ?? 0) > 0;
  if (activity.type === "medal_earn") return Number(metadata.targetHours ?? 0) > 0;
  if (activity.type === "streak") return Number(metadata.streak ?? 0) > 0;
  if (activity.type === "level_up") return String(metadata.level ?? "").trim().length > 0;
  return false;
}

export default function FocusPulse({
  initialActivities,
  initialActiveCount,
}: Props) {
  const [current, setCurrent] = useState<FocusPulseActivity | null>(initialActivities[0] ?? null);
  const [activeCount, setActiveCount] = useState(initialActiveCount);
  const currentRef = useRef<FocusPulseActivity | null>(initialActivities[0] ?? null);
  const rotationRef = useRef<FocusPulseActivity[]>(initialActivities.slice(1));
  const queuedRef = useRef<FocusPulseActivity[]>([]);
  const knownIdsRef = useRef(new Set(initialActivities.map((activity) => activity.id)));

  useEffect(() => {
    const rotate = window.setInterval(() => {
      const queued = queuedRef.current.shift();
      if (queued) {
        if (currentRef.current) rotationRef.current.push(currentRef.current);
        currentRef.current = queued;
        setCurrent(queued);
        return;
      }

      const next = rotationRef.current.shift();
      if (!next) return;
      if (currentRef.current) rotationRef.current.push(currentRef.current);
      currentRef.current = next;
      setCurrent(next);
    }, 5000);

    return () => window.clearInterval(rotate);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    async function refreshActiveCount() {
      try {
        const response = await fetch("/api/focus/active?summary=1", { cache: "no-store" });
        if (!response.ok) {
          if (response.status >= 500) captureClientError("focus.summary", new Error(`http_${response.status}`));
          return;
        }
        const data = await response.json();
        if (!cancelled && typeof data?.count === "number") setActiveCount(data.count);
      } catch (caught) {
        captureClientError("focus.summary", caught);
      }
    }

    function debouncedRefresh() {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => void refreshActiveCount(), 800);
    }

    const interval = window.setInterval(refreshActiveCount, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") debouncedRefresh();
    };
    const onSessionChange = () => debouncedRefresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus-session-changed", onSessionChange);

    const events = new EventSource("/api/feed/stream");
    events.onmessage = (event) => {
      try {
        const activity = JSON.parse(event.data) as FocusPulseActivity;
        if (activity.type === "timer_start" || activity.type === "session_complete") {
          debouncedRefresh();
        }
        if (
          !ALLOWED_TYPES.has(activity.type) ||
          knownIdsRef.current.has(activity.id) ||
          !hasUsefulMetadata(activity)
        ) return;
        knownIdsRef.current.add(activity.id);
        queuedRef.current.push({ ...activity, createdAt: String(activity.createdAt) });
      } catch (caught) {
        captureClientError("focus_pulse.sse_parse", caught);
      }
    };

    return () => {
      cancelled = true;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus-session-changed", onSessionChange);
      events.close();
    };
  }, []);

  const config = current ? TYPE_CONFIG[current.type] ?? TYPE_CONFIG.session_complete : TYPE_CONFIG.session_complete;
  const name = current?.user.name ?? "یک دانش‌آموز";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="live-activity-card-stage">
        <Link
          key={current?.id ?? "empty"}
          href="/feed"
          className="live-activity-card-enter glass-card relative z-10 block min-h-[68px] rounded-[2rem] px-3.5 py-3 border border-outline-variant/30 transition-transform active:scale-[0.99]"
          aria-label="رفتن به بورد زنده"
        >
          <div className="flex w-full items-center gap-3">
            <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.iconBg}`}>
              <span
                className={`material-symbols-outlined text-[20px] ${config.accent}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {config.icon}
              </span>
            </span>

            <div className="flex-1 min-w-0 text-right" aria-live="off">
              {current ? (
                <>
                  <p className="text-[13.5px] text-on-surface leading-snug truncate">
                    <span className="font-extrabold text-primary">{name}</span>{" "}
                    {activityLabel(current)}
                  </p>
                  <p className="text-[11px] text-outline mt-1">
                    {formatRelativeTimeFa(current.createdAt)}
                  </p>
                </>
              ) : (
                <p className="text-[13px] text-on-surface-variant">هنوز فعالیت تازه‌ای نیست؛ تو شروع کن!</p>
              )}
            </div>

            <div className="flex items-center gap-0.5 text-secondary shrink-0">
              <span className="text-[11px] font-bold">بورد زنده</span>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </div>
          </div>
        </Link>
      </div>

      <Link
        href="/studying"
        className="flex items-center justify-center gap-2 min-h-7 rounded-full px-3 text-[12.5px] text-on-surface-variant transition-colors hover:bg-surface-container-low active:bg-surface-container"
        aria-label="دیدن افراد در حال مطالعه"
      >
        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_0_5px_color-mix(in_oklab,var(--color-secondary)_10%,transparent)]" />
        <span>
          {activeCount > 0
            ? `${activeCount.toLocaleString("fa-IR")} نفر در حال مطالعه...`
            : "همین حالا تو شروع‌کننده باش"}
        </span>
        <span className="material-symbols-outlined text-[16px] text-outline">chevron_left</span>
      </Link>
    </div>
  );
}
