"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProgressiveOnboarding } from "@/components/onboarding/ProgressiveOnboarding";
import { ONBOARDING_HINTS } from "@/lib/onboarding-hints";
import { restoreStudyTimerSession, type StoredStudyTimerSession } from "@/lib/study-timer-storage";
import SectionInfoButton from "@/components/ui/SectionInfoButton";
import {
  getRandomMotivationalQuote,
  showOrUpdateStudyNotification,
  closeStudyNotification,
} from "@/lib/timer-notification";
import { captureClientError, captureProductEvent } from "@/lib/analytics-client";

const GoalSettingModal = dynamic(() => import("@/components/onboarding/GoalSettingModal"), { ssr: false });
const LeadCaptureModal = dynamic(() => import("@/components/onboarding/LeadCaptureModal"), { ssr: false });

type TimerState = "idle" | "starting" | "running" | "paused" | "finishing" | "done";

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

interface ActiveSessionSnapshot {
  sessionId: string;
  plannedMin: number;
  state: "running" | "paused";
  secondsLeft: number;
  elapsedSeconds: number;
  serverNow: number;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restored, setRestored] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const startRequestIdRef = useRef<string | null>(null);
  const selectedMinutesRef = useRef(60);
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
    if (timerState === "running" || timerState === "paused" || timerState === "finishing") return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    selectedMinutesRef.current = minutes;
    setSelectedMinutes(minutes);
    setSecondsLeft(minutes * 60);
    setTimerState("idle");
    setSessionId(null);
    startRequestIdRef.current = null;
    setError("");
  }

  const endSession = useCallback(async (
    id: string,
  ): Promise<"ended" | "already_ended" | "failed"> => {
    try {
      const response = await fetch("/api/study/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      const data = await response.json().catch((caught) => {
        captureClientError("study.active_response", caught);
        return null;
      });

      if (response.status === 409 && data?.alreadyEnded) {
        localStorage.removeItem(storageKey);
        setError("این جلسه قبلاً روی سرور ثبت شده و پاداشش محفوظ است.");
        return "already_ended";
      }
      if (!response.ok || !data || typeof data.xpEarned !== "number") {
        throw new Error("end_failed");
      }

      setSessionResult(data as SessionResult);
      localStorage.removeItem(storageKey);
      setShowGoalSetting(true);
      setError("");
      return "ended";
    } catch (caught) {
      captureProductEvent("study_end_failed", { session_id: id });
      captureClientError("study.end", caught, { session_id: id });
      setError("ثبت پایان جلسه انجام نشد؛ جلسه محفوظ است و می‌توانی دوباره تلاش کنی.");
      return "failed";
    }
  }, [storageKey]);

  const applyActiveSession = useCallback((active: ActiveSessionSnapshot) => {
    const totalSecs = active.plannedMin * 60;
    const effectiveStartTime = Date.now() - active.elapsedSeconds * 1000;
    const nextState = active.secondsLeft <= 0 ? "finishing" : active.state;

    setSessionId(active.sessionId);
    selectedMinutesRef.current = active.plannedMin;
    setSelectedMinutes(active.plannedMin);
    setSecondsLeft(active.secondsLeft);
    setTimerState(nextState);
    startTimeRef.current = effectiveStartTime;
    lastTickRef.current =
      Date.now() - (active.elapsedSeconds % TICK_INTERVAL) * 1000;

    const storedSession: StoredStudyTimerSession = {
      version: 1,
      sid: active.sessionId,
      startTime: effectiveStartTime,
      totalSecs,
      state: active.state,
      ...(active.state === "paused" ? { secondsLeft: active.secondsLeft } : {}),
    };
    localStorage.setItem(storageKey, JSON.stringify(storedSession));
    return nextState;
  }, [storageKey]);

  const syncActiveSession = useCallback(async (): Promise<ActiveSessionSnapshot | null> => {
    const response = await fetch("/api/study/active", { cache: "no-store" });
    if (!response.ok) throw new Error("sync_failed");
    const data = await response.json() as { activeSession?: ActiveSessionSnapshot | null };
    const active = data.activeSession ?? null;

    if (!active) {
      localStorage.removeItem(storageKey);
      setSessionId(null);
      setTimerState("idle");
      setSecondsLeft(selectedMinutesRef.current * 60);
      startTimeRef.current = null;
      return null;
    }

    applyActiveSession(active);
    return active;
  }, [applyActiveSession, storageKey]);

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
      try {
        const tickResponse = await fetch("/api/study/tick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!tickResponse.ok) throw new Error(`tick_${tickResponse.status}`);
        const tickData = await tickResponse.json();
        lastTickRef.current = now;
        if (tickData?.granted > 0) showFloat();
      } catch (caught) {
        // آخرین tick فقط پس از تأیید سرور جلو می‌رود تا با برگشت شبکه سریعاً retry شود.
        captureProductEvent("study_sync_failed", { operation: "tick", session_id: sessionId });
        captureClientError("study.tick", caught, { session_id: sessionId });
        setError("ثبت پاداش میان‌جلسه عقب افتاد؛ با اتصال اینترنت خودکار دوباره تلاش می‌کنیم.");
      }
    }

    if (newSecondsLeft <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerState("finishing");
      void showOrUpdateStudyNotification({
        secondsLeft: 0,
        totalSeconds,
        state: "done",
        quote: quoteRef.current,
        isInitial: true,
      });
      if (sessionId) {
        const outcome = await endSession(sessionId);
        setTimerState(outcome === "failed" ? "finishing" : "done");
      }
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
    const restore = window.setTimeout(async () => {
      try {
        const active = await syncActiveSession();
        if (active) {
          void showOrUpdateStudyNotification({
            secondsLeft: active.secondsLeft,
            totalSeconds: active.plannedMin * 60,
            state: active.state,
            quote: quoteRef.current,
            isInitial: false,
          });
          if (active.secondsLeft <= 0) {
            const outcome = await endSession(active.sessionId);
            setTimerState(outcome === "failed" ? "finishing" : "done");
          }
        }
      } catch (caught) {
        captureProductEvent("study_sync_failed", { operation: "restore" });
        captureClientError("study.restore", caught);
        const saved = localStorage.getItem(storageKey);
        const restoredSession = saved ? restoreStudyTimerSession(saved) : null;
        if (restoredSession) {
          setSessionId(restoredSession.sid);
          setSecondsLeft(restoredSession.secondsLeft);
          setSelectedMinutes(Math.round(restoredSession.totalSecs / 60));
          setTimerState(restoredSession.state);
          startTimeRef.current = restoredSession.startTime;
          lastTickRef.current = restoredSession.startTime;
          setError("ارتباط با سرور برقرار نشد؛ وضعیت محلی نمایش داده می‌شود.");
        } else if (saved) {
          localStorage.removeItem(storageKey);
        }
      } finally {
        setRestored(true);
      }
    }, 0);

    return () => window.clearTimeout(restore);
  }, [endSession, storageKey, syncActiveSession]);

  useEffect(() => {
    if (!restored) return;

    const reconcile = () => {
      void syncActiveSession()
        .then(async (active) => {
          setError("");
          if (active && active.secondsLeft <= 0) {
            const outcome = await endSession(active.sessionId);
            setTimerState(outcome === "failed" ? "finishing" : "done");
          }
        })
        .catch((caught) => {
          captureProductEvent("study_sync_failed", { operation: "reconcile" });
          captureClientError("study.reconcile", caught);
          setError("همگام‌سازی تایمر انجام نشد؛ با اتصال اینترنت دوباره تلاش می‌کنیم.");
        });
    };
    const handleVisibility = () => {
      if (!document.hidden) reconcile();
    };

    window.addEventListener("online", reconcile);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", reconcile);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [endSession, restored, syncActiveSession]);

  useEffect(() => {
    if (!restored) return;
    reportStudyState(timerState === "starting" || timerState === "running" || timerState === "paused" || timerState === "finishing" || showGoalSetting);
  }, [reportStudyState, restored, showGoalSetting, timerState]);

  async function handleToggle() {
    setError("");
    if (timerState === "idle") {
      setIsSubmitting(true);
      setTimerState("starting");

      try {
        const requestId = startRequestIdRef.current ??
          globalThis.crypto?.randomUUID?.() ??
          `study-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        startRequestIdRef.current = requestId;
        const response = await fetch("/api/study/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ durationMin: selectedMinutes, requestId }),
        });
        if (response.status === 409) {
          startRequestIdRef.current = null;
          const active = await syncActiveSession();
          if (active) {
            setError("جلسه فعال از سرور بازیابی شد.");
            return;
          }
        }
        if (!response.ok) throw new Error();
        const data = await response.json();
        const id = data.sessionId as string;
        const now = typeof data.startTime === "number" ? data.startTime : Date.now();
        const newQuote = getRandomMotivationalQuote();
        quoteRef.current = newQuote;
        startRequestIdRef.current = null;

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

        // شروع مطالعه نباید با permission prompt مرورگر قطع شود؛ فقط مجوز قبلی را مصرف کن.
        if ("Notification" in window && Notification.permission === "granted") {
          void showOrUpdateStudyNotification({
            secondsLeft: totalSeconds,
            totalSeconds,
            state: "running",
            quote: newQuote,
            isInitial: true,
          });
        }
      } catch (caught) {
        captureProductEvent("study_start_failed", { planned_minutes: selectedMinutes });
        captureClientError("study.start", caught, { planned_minutes: selectedMinutes });
        setTimerState("idle");
        setError("شروع تایمر انجام نشد؛ دوباره تلاش کن.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (timerState === "running") {
      if (!sessionId || startTimeRef.current === null) {
        setError("اطلاعات جلسه کامل نیست؛ صفحه را تازه‌سازی کن.");
        return;
      }
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/study/pause", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (response.status === 409) {
          await syncActiveSession();
          setError("این جلسه قبلاً پایان یافته؛ وضعیت تایمر به‌روز شد.");
          return;
        }
        if (!response.ok) throw new Error();

        const pausedAt = Date.now();
        const pausedSecondsLeft = Math.max(
          0,
          totalSeconds - Math.floor((pausedAt - startTimeRef.current) / 1000),
        );
        if (intervalRef.current) clearInterval(intervalRef.current);
        setSecondsLeft(pausedSecondsLeft);
        setTimerState("paused");
        captureProductEvent("study_paused", { session_id: sessionId });
        localStorage.setItem(storageKey, JSON.stringify({
          version: 1,
          sid: sessionId,
          startTime: startTimeRef.current,
          totalSecs: totalSeconds,
          state: "paused",
          secondsLeft: pausedSecondsLeft,
        } satisfies StoredStudyTimerSession));
        window.dispatchEvent(new Event("focus-session-changed"));
        void showOrUpdateStudyNotification({
          secondsLeft: pausedSecondsLeft,
          totalSeconds,
          state: "paused",
          quote: quoteRef.current,
          isInitial: false,
        });
      } catch (caught) {
        captureClientError("study.pause", caught, { session_id: sessionId });
        setError("مکث تایمر در سرور ثبت نشد؛ ارتباط اینترنت را بررسی کن.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (timerState === "paused") {
      if (!sessionId) {
        setError("اطلاعات جلسه کامل نیست؛ صفحه را تازه‌سازی کن.");
        return;
      }
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/study/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (response.status === 409) {
          await syncActiveSession();
          setError("این جلسه قبلاً پایان یافته؛ وضعیت تایمر به‌روز شد.");
          return;
        }
        if (!response.ok) throw new Error();

        const resumedAt = Date.now();
        const effectiveStartTime = resumedAt - (totalSeconds - secondsLeft) * 1000;
        startTimeRef.current = effectiveStartTime;
        lastTickRef.current = resumedAt - ((totalSeconds - secondsLeft) % TICK_INTERVAL) * 1000;
        localStorage.setItem(storageKey, JSON.stringify({
          version: 1,
          sid: sessionId,
          startTime: effectiveStartTime,
          totalSecs: totalSeconds,
          state: "running",
        } satisfies StoredStudyTimerSession));
        setTimerState("running");
        captureProductEvent("study_resumed", { session_id: sessionId });
        window.dispatchEvent(new Event("focus-session-changed"));
        void showOrUpdateStudyNotification({
          secondsLeft,
          totalSeconds,
          state: "running",
          quote: quoteRef.current,
          isInitial: false,
        });
      } catch (caught) {
        captureClientError("study.resume", caught, { session_id: sessionId });
        setError("ادامه تایمر در سرور ثبت نشد؛ ارتباط اینترنت را بررسی کن.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (timerState === "finishing") {
      await handleStop();
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
    const previousState = timerState;
    setIsSubmitting(true);
    setTimerState("finishing");
    try {
      const outcome = sessionId ? await endSession(sessionId) : "already_ended";
      if (outcome === "failed") {
        setTimerState(
          previousState === "running" || previousState === "paused"
            ? previousState
            : "finishing",
        );
        return;
      }
      void closeStudyNotification();
      setTimerState("idle");
      setSecondsLeft(selectedMinutes * 60);
      setSessionId(null);
      startTimeRef.current = null;
      window.dispatchEvent(new Event("focus-session-changed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const button = {
    idle: { icon: "play_arrow", label: "شروع مطالعه", cls: "bg-primary text-on-primary" },
    starting: { icon: "progress_activity", label: "در حال آماده‌سازی…", cls: "bg-primary text-on-primary" },
    running: { icon: "pause", label: "مکث", cls: "bg-tertiary-fixed-dim text-on-tertiary-fixed" },
    paused: { icon: "play_arrow", label: "ادامه مطالعه", cls: "bg-primary text-on-primary" },
    finishing: { icon: "sync", label: "تلاش دوباره برای ثبت", cls: "bg-secondary text-on-secondary" },
    done: { icon: "replay", label: "دوباره شروع کن", cls: "bg-primary text-on-primary" },
  }[timerState];
  const isSessionActive = timerState === "running" || timerState === "paused" || timerState === "finishing";
  const canStopSession = timerState === "running" || timerState === "paused";
  const isInteractionLocked = timerState === "starting" || isSessionActive;
  const needsStartHint = !hasHint(ONBOARDING_HINTS.TIMER_STARTED);
  const showsStartHint = needsStartHint && timerState === "idle";
  const needsRewardLesson = !hasHint(ONBOARDING_HINTS.REWARDS_EXPLAINED);
  const showsRewardLesson = needsRewardLesson && (sessionResult?.xpEarned ?? 0) > 0;

  return (
    <>
      <section
        data-tour="timer"
        className={`glass-card rounded-[2rem] px-4 py-4 transition-[border-color,box-shadow] duration-200 ${
          showsStartHint
            ? "border border-tertiary/60 ring-2 ring-tertiary/35 shadow-[0_12px_35px_color-mix(in_oklab,var(--color-tertiary)_16%,transparent)]"
            : "border border-tertiary-fixed/65 shadow-[0_12px_35px_color-mix(in_oklab,var(--color-primary)_9%,transparent)]"
        }`}
      >
        <MissionContext mission={mission} />

        <div className="pt-4">
          <div
            className={`focus-timer-halo mx-auto ${isInteractionLocked ? "focus-timer-halo-active" : ""}`}
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
                : timerState === "starting"
                ? "در حال ثبت شروع مطالعه…"
                : timerState === "paused"
                ? "تایمر متوقف شده"
                : timerState === "finishing"
                ? "در انتظار ثبت نهایی روی سرور"
                : "تمرکز عمیق، پیشرفت واقعی"}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mt-4" dir="ltr" aria-label="انتخاب مدت مطالعه">
            {[...TIMER_OPTIONS].reverse().map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setTimer(minutes)}
                disabled={isInteractionLocked}
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
            <div role="note" className="coachmark-enter mt-3 flex items-start gap-3 rounded-2xl border border-tertiary/45 bg-tertiary-fixed/70 p-3.5 shadow-sm">
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
            type="button"
            onClick={handleToggle}
            disabled={isSubmitting}
            data-onboarding="timer-start"
            aria-describedby={showsStartHint ? "timer-start-hint-description" : undefined}
            className={`gamified-btn mt-3 w-full text-[16px] font-extrabold py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg ${button.cls} ${
              showsStartHint ? "ring-2 ring-tertiary/35" : ""
            } ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
          >
            {timerState === "starting" ? (
              <span className="material-symbols-outlined text-[21px] animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[21px]" style={{ fontVariationSettings: "'FILL' 1" }}>{button.icon}</span>
            )}
            {button.label}
          </button>

          {error && <p role="alert" className="text-[12px] text-error text-center mt-2">{error}</p>}

          {canStopSession && (
            <button
              type="button"
              onClick={handleStop}
              disabled={isSubmitting}
              className={`mt-2 w-full border border-outline-variant text-on-surface-variant py-2.5 rounded-xl text-[13px] font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-2 ${
                isSubmitting ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? (
                <span className="material-symbols-outlined text-[17px] animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[17px]">stop</span>
              )}
              {isSubmitting ? "در حال ثبت و ذخیره…" : "توقف و ثبت"}
            </button>
          )}

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
