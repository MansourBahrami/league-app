"use client";

import { type CSSProperties, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProgressiveOnboarding } from "@/components/onboarding/ProgressiveOnboarding";
import { ONBOARDING_HINTS } from "@/lib/onboarding-hints";
import { restoreStudyTimerSession, type StoredStudyTimerSession } from "@/lib/study-timer-storage";
import SectionInfoButton from "@/components/ui/SectionInfoButton";
import {
  getRandomMotivationalQuote,
  requestStudyNotificationPermission,
  showOrUpdateStudyNotification,
  closeStudyNotification,
  getTimerNotificationStatus,
  sendTestNotification,
  type NotificationStatus,
} from "@/lib/timer-notification";

const GoalSettingModal = dynamic(() => import("@/components/onboarding/GoalSettingModal"), { ssr: false });
const LeadCaptureModal = dynamic(() => import("@/components/onboarding/LeadCaptureModal"), { ssr: false });

type TimerState = "idle" | "running" | "paused" | "done";

export type FocusMission =
  | {
      kind: "onboarding" | "daily";
      dailyGoalMin: number;
      dailyStudiedMin: number;
      coinReward?: number;
    }
  | {
      kind: "weekly";
      pending: boolean;
      isRestDay: boolean;
      targetHours: number;
      dailyGoalMin: number;
      dailyStudiedMin: number;
      weeklyGoalMin: number;
      weeklyStudiedMin: number;
      xpReward: number;
    }
  | null;

interface SessionResult {
  xpEarned: number;
  coinsEarned: number;
  durationMin: number;
  dayCompleted: boolean;
  dailyGoalMinutes: number;
  stepMinutes: number;
  remainingMinutes: number;
  needsLeadCapture: boolean;
  rewardVideo: { id: string; title: string } | null;
}

interface Props {
  mission: FocusMission;
  userId: string;
  hasPhone?: boolean;
}

const TIMER_OPTIONS = [30, 60, 90, 120];
const TICK_INTERVAL = 15 * 60;

interface FloatReward { id: number }

function formatMinutes(minutes: number): string {
  const value = Math.max(0, Math.round(minutes));
  const hours = Math.floor(value / 60);
  const remaining = value % 60;
  if (hours === 0) return `${remaining.toLocaleString("fa-IR")} دقیقه`;
  if (remaining === 0) return `${hours.toLocaleString("fa-IR")} ساعت`;
  return `${hours.toLocaleString("fa-IR")} ساعت و ${remaining.toLocaleString("fa-IR")} دقیقه`;
}

function ProgressBar({ value, tone = "gold" }: { value: number; tone?: "gold" | "navy" }) {
  return (
    <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${tone === "gold" ? "bg-tertiary-fixed-dim" : "bg-primary"}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function MissionContext({ mission }: { mission: FocusMission }) {
  const infoButton = (
    <SectionInfoButton
      title="XP و سکه"
      description="هر ۱۵ دقیقه مطالعه ثبت‌شده، ۱ XP و ۱ سکه می‌گیری."
      points={[
        "XP سطح و رتبه هفتگی‌ات رو بالا می‌بره.",
        "سکه رو برای مأموریت، ویدیو و دیدن گزارش دوستات خرج می‌کنی."
      ]}
    />
  );

  if (!mission) {
    return (
      <div className="text-center pb-4 border-b border-outline-variant/35">
        <div className="flex items-center justify-center gap-1.5">
          <p className="text-[15px] font-extrabold text-on-surface">فعلاً ماموریت فعالی نداری</p>
          {infoButton}
        </div>
        <p className="text-[12px] text-on-surface-variant mt-1">بدون ماموریت هم می‌تونی آزاد مطالعه کنی</p>
        <Link
          href="/mission-rooms"
          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-tertiary text-tertiary px-3.5 py-2 text-[12.5px] font-bold hover:bg-tertiary-fixed/35 transition-colors"
        >
          <span className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>target</span>
          انتخاب کمپ مأموریت
        </Link>
      </div>
    );
  }

  if (mission.kind === "weekly") {
    if (mission.pending) {
      return (
        <div className="pb-4 border-b border-outline-variant/35">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-[15px] font-extrabold text-on-surface truncate">ماموریت {mission.targetHours.toLocaleString("fa-IR")} ساعته‌ات از فردا شروع می‌شه</p>
              {infoButton}
            </div>
            <span className="shrink-0 rounded-full bg-primary-fixed px-2.5 py-1 text-[11px] font-bold text-primary">هفتگی</span>
          </div>
          <p className="text-[12px] text-on-surface-variant mt-1.5">امروز هم می‌تونی آزاد مطالعه کنی</p>
        </div>
      );
    }

    const dailyProgress = mission.dailyGoalMin > 0 ? (mission.dailyStudiedMin / mission.dailyGoalMin) * 100 : 100;
    const weeklyProgress = mission.weeklyGoalMin > 0 ? (mission.weeklyStudiedMin / mission.weeklyGoalMin) * 100 : 0;

    return (
      <div className="pb-4 border-b border-outline-variant/35">
        <div className="flex items-start justify-between gap-3">
          <div className="text-right min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[17px] font-extrabold text-on-surface leading-snug">
                {mission.isRestDay ? "امروز روز استراحت یا جبرانه" : `امروز ${formatMinutes(mission.dailyGoalMin)} مطالعه کن`}
              </p>
              {infoButton}
            </div>
            <p className="text-[11.5px] text-tertiary font-bold mt-1">جایزه: {mission.xpReward.toLocaleString("fa-IR")} XP + مدال</p>
          </div>
          <span className="shrink-0 rounded-full bg-primary-fixed px-2.5 py-1 text-[11px] font-bold text-primary">هفتگی</span>
        </div>

        {!mission.isRestDay && (
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2 mb-1.5 text-[11.5px] text-on-surface-variant">
              <span>پیشرفت امروز</span>
              <span>{formatMinutes(mission.dailyStudiedMin)} از {formatMinutes(mission.dailyGoalMin)}</span>
            </div>
            <ProgressBar value={dailyProgress} />
          </div>
        )}

        <div className="mt-2.5">
          <div className="flex items-center justify-between gap-2 mb-1.5 text-[11.5px] text-on-surface-variant">
            <span>پیشرفت هفته</span>
            <span>{formatMinutes(mission.weeklyStudiedMin)} از {formatMinutes(mission.weeklyGoalMin)}</span>
          </div>
          <ProgressBar value={weeklyProgress} tone="navy" />
        </div>
      </div>
    );
  }

  const progress = mission.dailyGoalMin > 0 ? (mission.dailyStudiedMin / mission.dailyGoalMin) * 100 : 100;
  const completed = mission.dailyStudiedMin >= mission.dailyGoalMin;

  return (
    <div className="pb-4 border-b border-outline-variant/35">
      <div className="flex items-start justify-between gap-3">
        <div className="text-right min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[18px] font-extrabold text-on-surface leading-snug">
              {completed ? "ماموریت امروز رو انجام دادی!" : `امروز ${formatMinutes(mission.dailyGoalMin)} مطالعه کن`}
            </p>
            {infoButton}
          </div>
          {mission.kind === "daily" && mission.coinReward ? (
            <p className="text-[11.5px] text-tertiary font-bold mt-1">جایزه: {mission.coinReward.toLocaleString("fa-IR")} سکه</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-tertiary-fixed/55 px-2.5 py-1 text-[11px] font-bold text-tertiary">روزانه</span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between gap-2 mb-1.5 text-[11.5px] text-on-surface-variant">
          <span>{progress.toLocaleString("fa-IR", { maximumFractionDigits: 0 })}٪</span>
          <span>{formatMinutes(mission.dailyStudiedMin)} از {formatMinutes(mission.dailyGoalMin)}</span>
        </div>
        <ProgressBar value={progress} />
      </div>
    </div>
  );
}

export default function StudyTimer({ mission, userId, hasPhone = false }: Props) {
  const router = useRouter();
  const { hasHint, markHints, reportStudyState, suppressSetup, resumeSetup } = useProgressiveOnboarding();
  const [selectedMinutes, setSelectedMinutes] = useState(60);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(60 * 60);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showGoalSetting, setShowGoalSetting] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [floats, setFloats] = useState<FloatReward[]>([]);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotificationStatus>("default");
  const [notifFeedback, setNotifFeedback] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const timerCardRef = useRef<HTMLElement | null>(null);
  const startButtonRef = useRef<HTMLButtonElement | null>(null);
  const quoteRef = useRef<string>(getRandomMotivationalQuote());
  const storageKey = `study_session:${userId}`;

  const totalSeconds = selectedMinutes * 60;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const elapsedRatio = totalSeconds > 0
    ? Math.min(1, Math.max(0, (totalSeconds - secondsLeft) / totalSeconds))
    : 0;
  const secsToNextReward = TICK_INTERVAL - (Math.floor(totalSeconds - secondsLeft) % TICK_INTERVAL);
  const minToNext = Math.ceil(secsToNextReward / 60);

  function showFloat() {
    const id = Date.now() + Math.random();
    setFloats((items) => [...items, { id }]);
    window.setTimeout(() => setFloats((items) => items.filter((item) => item.id !== id)), 2000);
  }

  function setTimer(minutes: number) {
    if (timerState === "running" || timerState === "paused") return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSelectedMinutes(minutes);
    setSecondsLeft(minutes * 60);
    setTimerState("idle");
    setSessionId(null);
    setError("");
  }

  const endSession = useCallback(async (id: string) => {
    const response = await fetch("/api/study/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    }).catch(() => null);
    if (!response) return;
    const data: SessionResult = await response.json().catch(() => null);
    if (!data) return;
    setSessionResult(data);
    localStorage.removeItem(storageKey);
    setShowGoalSetting(true);
  }, [storageKey]);

  const tick = useCallback(async () => {
    const now = Date.now();
    const newElapsed = Math.floor((now - startTimeRef.current!) / 1000);
    const newSecondsLeft = Math.max(0, totalSeconds - newElapsed);
    setSecondsLeft(newSecondsLeft);

    // به‌روزرسانی خاموش نوتیفیکیشن هر ۶۰ ثانیه یک‌بار
    if (newSecondsLeft > 0 && newSecondsLeft % 60 === 0) {
      void showOrUpdateStudyNotification({
        secondsLeft: newSecondsLeft,
        totalSeconds,
        state: "running",
        quote: quoteRef.current,
        isInitial: false,
      });
    }

    if (sessionId && now - lastTickRef.current >= TICK_INTERVAL * 1000) {
      lastTickRef.current = now;
      const response = await fetch("/api/study/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).then((result) => result.json()).catch(() => null);
      if (response?.granted > 0) showFloat();
    }

    if (newSecondsLeft <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerState("done");
      void showOrUpdateStudyNotification({
        secondsLeft: 0,
        totalSeconds,
        state: "done",
        quote: quoteRef.current,
        isInitial: true,
      });
      if (sessionId) await endSession(sessionId);
    }
  }, [endSession, totalSeconds, sessionId]);

  useEffect(() => {
    if (timerState === "running") intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState, tick]);

  // هنگام تغییر دید صفحه (مثلاً رفتن به نوتیفیکیشن‌بار یا بستن موقت اپ)، اعلان فوراً همگام شود
  useEffect(() => {
    if (timerState !== "running") return;
    const handleVisibility = () => {
      if (document.hidden) {
        void showOrUpdateStudyNotification({
          secondsLeft,
          totalSeconds,
          state: "running",
          quote: quoteRef.current,
          isInitial: false,
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [timerState, secondsLeft, totalSeconds]);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        setRestored(true);
        return;
      }
      const restoredSession = restoreStudyTimerSession(saved);
      if (!restoredSession) {
        localStorage.removeItem(storageKey);
        setRestored(true);
        return;
      }
      setSessionId(restoredSession.sid);
      setSecondsLeft(restoredSession.secondsLeft);
      setSelectedMinutes(Math.round(restoredSession.totalSecs / 60));
      setTimerState(restoredSession.state);
      startTimeRef.current = restoredSession.startTime;
      lastTickRef.current = restoredSession.startTime;
      setRestored(true);

      if (restoredSession.state === "running" || restoredSession.state === "paused") {
        void showOrUpdateStudyNotification({
          secondsLeft: restoredSession.secondsLeft,
          totalSeconds: restoredSession.totalSecs,
          state: restoredSession.state,
          quote: quoteRef.current,
          isInitial: false,
        });
      }
    }, 0);

    return () => window.clearTimeout(restore);
  }, [storageKey]);

  useEffect(() => {
    if (!restored) return;
    reportStudyState(timerState === "running" || timerState === "paused" || showGoalSetting);
  }, [reportStudyState, restored, showGoalSetting, timerState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNotifStatus(getTimerNotificationStatus());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleTestNotification() {
    setNotifFeedback("در حال ارسال اعلان...");
    const res = await sendTestNotification();
    setNotifStatus(getTimerNotificationStatus());
    if (res.ok) {
      setNotifFeedback("اعلان تستی با موفقیت ارسال شد! بالای صفحه گوشی را ببینید.");
    } else {
      setNotifFeedback(res.reason || "ارسال ناموفق بود");
    }
    window.setTimeout(() => setNotifFeedback(""), 6000);
  }

  async function handleToggle() {
    setError("");
    if (timerState === "idle") {
      // درخواست اجازه نوتیفیکیشن بلافاصله در لحظهٔ تعامل کاربر (قبل از fetch)
      const permPromise = requestStudyNotificationPermission();

      const response = await fetch("/api/study/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMin: selectedMinutes }),
      }).catch(() => null);
      if (!response?.ok) {
        setError("شروع تایمر انجام نشد؛ دوباره تلاش کن.");
        return;
      }
      const data = await response.json();
      const id = data.sessionId as string;
      const now = Date.now();
      const newQuote = getRandomMotivationalQuote();
      quoteRef.current = newQuote;

      setSessionId(id);
      startTimeRef.current = now;
      lastTickRef.current = now;
      const storedSession: StoredStudyTimerSession = {
        version: 1,
        sid: id,
        startTime: now,
        totalSecs: totalSeconds,
        state: "running",
      };
      localStorage.setItem(storageKey, JSON.stringify(storedSession));
      setTimerState("running");
      void markHints(ONBOARDING_HINTS.TIMER_STARTED);
      window.dispatchEvent(new Event("focus-session-changed"));

      void permPromise.then((granted) => {
        setNotifStatus(getTimerNotificationStatus());
        if (granted) {
          void showOrUpdateStudyNotification({
            secondsLeft: totalSeconds,
            totalSeconds,
            state: "running",
            quote: newQuote,
            isInitial: true,
          });
        }
      });
      return;
    }

    if (timerState === "running") {
      if (!sessionId || startTimeRef.current === null) {
        setError("اطلاعات جلسه کامل نیست؛ صفحه را تازه‌سازی کن.");
        return;
      }
      const response = await fetch("/api/study/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => null);
      if (!response?.ok) {
        setError("مکث تایمر ثبت نشد؛ دوباره تلاش کن.");
        return;
      }
      const pausedAt = Date.now();
      const pausedSecondsLeft = Math.max(
        0,
        totalSeconds - Math.floor((pausedAt - startTimeRef.current) / 1000),
      );
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSecondsLeft(pausedSecondsLeft);
      setTimerState("paused");
      const storedSession: StoredStudyTimerSession = {
        version: 1,
        sid: sessionId,
        startTime: startTimeRef.current,
        totalSecs: totalSeconds,
        state: "paused",
        secondsLeft: pausedSecondsLeft,
      };
      localStorage.setItem(storageKey, JSON.stringify(storedSession));
      window.dispatchEvent(new Event("focus-session-changed"));

      void showOrUpdateStudyNotification({
        secondsLeft: pausedSecondsLeft,
        totalSeconds,
        state: "paused",
        quote: quoteRef.current,
        isInitial: false,
      });
      return;
    }

    if (timerState === "paused") {
      if (!sessionId) {
        setError("اطلاعات جلسه کامل نیست؛ صفحه را تازه‌سازی کن.");
        return;
      }
      const response = await fetch("/api/study/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => null);
      if (!response?.ok) {
        setError("ادامه تایمر ثبت نشد؛ دوباره تلاش کن.");
        return;
      }
      const resumedAt = Date.now();
      const effectiveStartTime = resumedAt - (totalSeconds - secondsLeft) * 1000;
      startTimeRef.current = effectiveStartTime;
      lastTickRef.current = resumedAt - ((totalSeconds - secondsLeft) % TICK_INTERVAL) * 1000;
      const storedSession: StoredStudyTimerSession = {
        version: 1,
        sid: sessionId,
        startTime: effectiveStartTime,
        totalSecs: totalSeconds,
        state: "running",
      };
      localStorage.setItem(storageKey, JSON.stringify(storedSession));
      setTimerState("running");
      window.dispatchEvent(new Event("focus-session-changed"));

      void showOrUpdateStudyNotification({
        secondsLeft,
        totalSeconds,
        state: "running",
        quote: quoteRef.current,
        isInitial: false,
      });
      return;
    }

    setTimerState("idle");
    setSecondsLeft(selectedMinutes * 60);
    setSessionId(null);
    void closeStudyNotification();
    window.dispatchEvent(new Event("focus-session-changed"));
  }

  async function handleStop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    void closeStudyNotification();
    if (sessionId) await endSession(sessionId);
    setTimerState("idle");
    setSecondsLeft(selectedMinutes * 60);
    setSessionId(null);
  }

  const button = {
    idle: { icon: "play_arrow", label: "شروع مطالعه", cls: "bg-primary text-on-primary" },
    running: { icon: "pause", label: "مکث", cls: "bg-tertiary-fixed-dim text-on-tertiary-fixed" },
    paused: { icon: "play_arrow", label: "ادامه مطالعه", cls: "bg-primary text-on-primary" },
    done: { icon: "replay", label: "دوباره شروع کن", cls: "bg-primary text-on-primary" },
  }[timerState];
  const isActive = timerState === "running" || timerState === "paused";
  const needsStartHint = !hasHint(ONBOARDING_HINTS.TIMER_STARTED);
  const showsStartHint = needsStartHint && timerState === "idle";
  const needsRewardLesson = !hasHint(ONBOARDING_HINTS.REWARDS_EXPLAINED);
  const showsRewardLesson = needsRewardLesson && (sessionResult?.xpEarned ?? 0) > 0;

  useEffect(() => {
    if (!showsStartHint) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusTimer = window.setTimeout(() => startButtonRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      previouslyFocused?.focus();
    };
  }, [showsStartHint]);

  function trapStartHintFocus(event: KeyboardEvent<HTMLElement>) {
    if (!showsStartHint || event.key !== "Tab") return;

    const focusableElements = Array.from(
      timerCardRef.current?.querySelectorAll<HTMLElement>("[data-start-hint-focus='true']") ?? [],
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1)!;
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <>
      {/* Spotlight Backdrop */}
      {showsStartHint && (
        <div
          className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-[2px] transition-all"
          aria-hidden="true"
        />
      )}

      <section
        ref={timerCardRef}
        data-tour="timer"
        role={showsStartHint ? "dialog" : undefined}
        aria-modal={showsStartHint ? true : undefined}
        aria-labelledby={showsStartHint ? "timer-start-hint-title" : undefined}
        aria-describedby={showsStartHint ? "timer-start-hint-description" : undefined}
        onKeyDown={trapStartHintFocus}
        className={`glass-card rounded-[2rem] px-4 py-4 transition-all duration-300 ${
          showsStartHint
            ? "relative z-[75] bg-surface ring-2 ring-tertiary/70 shadow-[0_0_40px_rgba(207,146,6,0.45)] border border-tertiary/60"
            : "border border-tertiary-fixed/65 shadow-[0_12px_35px_color-mix(in_oklab,var(--color-primary)_9%,transparent)]"
        }`}
      >
        <MissionContext mission={mission} />

        <div className="pt-4">
          <div
            className={`focus-timer-halo mx-auto ${isActive ? "focus-timer-halo-active" : ""}`}
            style={{ "--timer-elapsed-angle": `${elapsedRatio}turn` } as CSSProperties}
          >
            <span className="material-symbols-outlined focus-timer-spark text-tertiary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span className="focus-timer-progress-orbit" aria-hidden="true">
              <span className="focus-timer-progress-dot" />
            </span>
            {floats.map((item) => (
              <span key={item.id} className="reward-float absolute top-10 right-1/2 translate-x-1/2 text-[13px] font-extrabold text-tertiary whitespace-nowrap">
                +۱ XP · +۱ سکه
              </span>
            ))}
            <time className="text-[46px] leading-none font-extrabold text-primary" dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }} aria-live="off">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </time>
            <p className="text-[11.5px] text-on-surface-variant mt-2 text-center px-2">
              {timerState === "running"
                ? `جایزه بعدی تا ${minToNext.toLocaleString("fa-IR")} دقیقه دیگر`
                : timerState === "paused"
                ? "تایمر متوقف شده"
                : "تمرکز عمیق، پیشرفت واقعی"}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mt-4" dir="ltr" aria-label="انتخاب مدت مطالعه">
            {[...TIMER_OPTIONS].reverse().map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setTimer(minutes)}
                disabled={isActive}
                data-start-hint-focus={showsStartHint ? "true" : undefined}
                aria-pressed={selectedMinutes === minutes}
                className={`h-11 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center ${
                  selectedMinutes === minutes
                    ? "bg-primary text-on-primary shadow-md"
                    : "border border-outline-variant/70 text-on-surface-variant hover:bg-surface-container-high"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {minutes.toLocaleString("fa-IR")}
              </button>
            ))}
          </div>

          {showsStartHint && (
            <div role="note" className="mt-3 flex items-start gap-3 rounded-2xl border border-tertiary/45 bg-tertiary-fixed/70 p-3.5 shadow-md pop-in">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tertiary text-on-tertiary shadow-md">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  play_circle
                </span>
              </span>
              <div className="min-w-0 flex-1 text-right">
                <h4 id="timer-start-hint-title" className="text-[14px] font-extrabold text-on-surface">اولین مطالعه‌ات رو شروع کن</h4>
                <p id="timer-start-hint-description" className="mt-1 text-[12px] leading-5 text-on-surface-variant">
                  مدت مطالعه رو انتخاب کن و «شروع مطالعه» رو بزن.
                </p>
              </div>
              <span className="material-symbols-outlined text-[22px] text-tertiary mt-1 shrink-0">
                arrow_downward
              </span>
            </div>
          )}

          <button
            ref={startButtonRef}
            type="button"
            onClick={handleToggle}
            data-onboarding="timer-start"
            data-start-hint-focus={showsStartHint ? "true" : undefined}
            aria-describedby={showsStartHint ? "timer-start-hint-description" : undefined}
            className={`gamified-btn mt-3 w-full text-[16px] font-extrabold py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg ${button.cls} ${
              showsStartHint ? "ring-2 ring-white/80 animate-pulse" : ""
            }`}
          >
            <span className="material-symbols-outlined text-[21px]" style={{ fontVariationSettings: "'FILL' 1" }}>{button.icon}</span>
            {button.label}
          </button>

          {error && <p role="alert" className="text-[12px] text-error text-center mt-2">{error}</p>}

          {isActive && (
            <button
              type="button"
              onClick={handleStop}
              className="mt-2 w-full border border-outline-variant text-on-surface-variant py-2.5 rounded-xl text-[13px] font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[17px]">stop</span>
              توقف و ثبت
            </button>
          )}

          {/* نوار وضعیت نوتیفیکیشن زنده */}
          <div className="mt-3 pt-2 border-t border-outline-variant/30">
            {notifStatus === "default" && (
              <button
                type="button"
                onClick={handleTestNotification}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-tertiary-fixed/30 border border-tertiary/30 text-[11.5px] text-on-surface hover:bg-tertiary-fixed/50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-tertiary text-[17px]">notifications_active</span>
                  <span>نمایش زنده تایمر در بالای گوشی</span>
                </div>
                <span className="font-bold text-tertiary underline">فعال‌سازی و تست</span>
              </button>
            )}

            {notifStatus === "granted" && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-[11px] text-on-surface-variant">
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>اعلان زنده در بالای صفحه فعال است</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="text-primary font-bold hover:underline pr-2"
                >
                  تست
                </button>
              </div>
            )}

            {notifStatus === "denied" && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-error-container/30 border border-error/25 text-[11px] text-on-error-container">
                <span className="material-symbols-outlined text-error text-[16px]">notifications_off</span>
                <span>اعلان در مرورگر مسدود است؛ از آیکون قفل کنار آدرس‌بار فعالش کنید.</span>
              </div>
            )}

            {notifStatus === "ios_browser" && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/50 text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-[16px]">ios_share</span>
                <span>در آیفون برای نوتیفیکیشن، از منوی اشتراک‌گذاری گزینه «Add to Home Screen» را بزنید.</span>
              </div>
            )}

            {notifFeedback && (
              <p className="text-[11.5px] text-center font-bold text-primary mt-1.5 animate-pulse">
                {notifFeedback}
              </p>
            )}
          </div>
        </div>
      </section>

      {showGoalSetting && sessionResult && (
        <GoalSettingModal
          xpEarned={sessionResult.xpEarned}
          coinsEarned={sessionResult.coinsEarned}
          durationMin={sessionResult.durationMin}
          dayCompleted={sessionResult.dayCompleted}
          dailyGoalMinutes={sessionResult.dailyGoalMinutes}
          remainingMinutes={sessionResult.remainingMinutes}
          rewardVideo={sessionResult.rewardVideo}
          showRewardLesson={showsRewardLesson}
          onClose={async () => {
            const triggerLead = sessionResult.needsLeadCapture;
            if (triggerLead) suppressSetup();
            if (showsRewardLesson) await markHints(ONBOARDING_HINTS.REWARDS_EXPLAINED);
            setShowGoalSetting(false);
            if (triggerLead) {
              setShowLeadModal(true);
            } else {
              setSessionResult(null);
            }
            router.refresh();
          }}
        />
      )}

      {showLeadModal && (
        <LeadCaptureModal
          hasPhone={hasPhone}
          onComplete={() => {
            resumeSetup();
            setShowLeadModal(false);
            setSessionResult(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
