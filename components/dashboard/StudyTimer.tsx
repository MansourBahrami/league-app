"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProgressiveOnboarding } from "@/components/onboarding/ProgressiveOnboarding";
import { ONBOARDING_HINTS } from "@/lib/onboarding-hints";
import SectionInfoButton from "@/components/ui/SectionInfoButton";
import ActionGuidanceModal from "@/components/onboarding/ActionGuidanceModal";

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
  inOnboarding: boolean;
  dailyGoalMinutes: number;
  stepMinutes: number;
  remainingMinutes: number;
  needsVideo: boolean;
  needsLeadCapture: boolean;
  onboardingDay: number;
  tomorrowGoalMinutes: number;
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
      title="امتیاز و سکه چطوری حساب می‌شه؟"
      description="تایمر مطالعه دقیقاً زمان تمرکزت رو ثبت می‌کنه تا پاداشت رو بگیری."
      points={[
        "به ازای هر ۱۵ دقیقه مطالعه، ۱ XP و ۱ سکه می‌گیری.",
        "با XP سطح‌ت بالا می‌ره و توی رده‌بندی صعود می‌کنی.",
        "با سکه‌هات می‌تونی مأموریت بخری، ویدیو باز کنی یا وضعیت رفقات رو ببینی."
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
          انتخاب اتاق مأموریت
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
  const { hasHint, markHints, reportStudyState } = useProgressiveOnboarding();
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
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
      if (sessionId) await endSession(sessionId);
    }
  }, [endSession, totalSeconds, sessionId]);

  useEffect(() => {
    if (timerState === "running") intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState, tick]);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        setRestored(true);
        return;
      }
      try {
        const { sid, startTime, totalSecs } = JSON.parse(saved);
        const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
        const remaining = totalSecs - elapsedSecs;
        if (remaining <= 0) {
          localStorage.removeItem(storageKey);
          return;
        }
        setSessionId(sid);
        setSecondsLeft(remaining);
        setSelectedMinutes(Math.round(totalSecs / 60));
        setTimerState("running");
        startTimeRef.current = startTime;
        lastTickRef.current = startTime;
      } catch {
        localStorage.removeItem(storageKey);
      } finally {
        setRestored(true);
      }
    }, 0);

    return () => window.clearTimeout(restore);
  }, [storageKey]);

  useEffect(() => {
    if (!restored) return;
    reportStudyState(timerState === "running" || timerState === "paused" || showGoalSetting);
  }, [reportStudyState, restored, showGoalSetting, timerState]);

  async function handleToggle() {
    setError("");
    if (timerState === "idle") {
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
      setSessionId(id);
      startTimeRef.current = now;
      lastTickRef.current = now;
      localStorage.setItem(storageKey, JSON.stringify({ sid: id, startTime: now, totalSecs: totalSeconds }));
      setTimerState("running");
      void markHints(ONBOARDING_HINTS.TIMER_STARTED);
      window.dispatchEvent(new Event("focus-session-changed"));
      return;
    }

    if (timerState === "running") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerState("paused");
      if (sessionId) void fetch("/api/study/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {}).finally(() => window.dispatchEvent(new Event("focus-session-changed")));
      return;
    }

    if (timerState === "paused") {
      startTimeRef.current = Date.now() - (totalSeconds - secondsLeft) * 1000;
      lastTickRef.current = Date.now() - ((totalSeconds - secondsLeft) % TICK_INTERVAL) * 1000;
      setTimerState("running");
      if (sessionId) {
        void fetch("/api/study/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {}).finally(() => window.dispatchEvent(new Event("focus-session-changed")));
        localStorage.setItem(storageKey, JSON.stringify({ sid: sessionId, startTime: startTimeRef.current, totalSecs: totalSeconds }));
      }
      return;
    }

    setTimerState("idle");
    setSecondsLeft(selectedMinutes * 60);
    setSessionId(null);
    window.dispatchEvent(new Event("focus-session-changed"));
  }

  async function handleStop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
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
  const needsRewardLesson = !hasHint(ONBOARDING_HINTS.REWARDS_EXPLAINED);
  const showsRewardLesson = needsRewardLesson && (sessionResult?.xpEarned ?? 0) > 0;

  return (
    <>
      <section data-tour="timer" className="glass-card rounded-[2rem] border border-tertiary-fixed/65 px-4 py-4 shadow-[0_12px_35px_color-mix(in_oklab,var(--color-primary)_9%,transparent)]">
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

          {needsStartHint && timerState === "idle" && (
            <div role="note" className="mt-3 flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary-fixed/70 px-3 py-2.5 pop-in">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-extrabold text-on-primary">۱</span>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[13.5px] font-extrabold text-on-surface">اولین قدم: فقط تایمر رو شروع کن</p>
                <p className="mt-0.5 text-[11.5px] leading-5 text-on-surface-variant">مدت رو انتخاب کن و روی «شروع مطالعه» بزن؛ بقیه رو سر وقت بهت نشون می‌دیم.</p>
              </div>
              <span className="material-symbols-outlined text-[20px] text-primary motion-safe:animate-bounce">arrow_downward</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggle}
            data-onboarding="timer-start"
            className={`gamified-btn mt-3 w-full text-[16px] font-extrabold py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg ${button.cls}`}
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
        </div>
      </section>

      {showGoalSetting && sessionResult && (
        <GoalSettingModal
          xpEarned={sessionResult.xpEarned}
          coinsEarned={sessionResult.coinsEarned}
          durationMin={sessionResult.durationMin}
          onboardingDay={sessionResult.onboardingDay}
          dayCompleted={sessionResult.dayCompleted}
          inOnboarding={sessionResult.inOnboarding}
          dailyGoalMinutes={sessionResult.dailyGoalMinutes}
          remainingMinutes={sessionResult.remainingMinutes}
          needsVideo={sessionResult.needsVideo}
          tomorrowGoalMinutes={sessionResult.tomorrowGoalMinutes}
          rewardVideo={sessionResult.rewardVideo}
          showRewardLesson={showsRewardLesson}
          onClose={async () => {
            if (showsRewardLesson) await markHints(ONBOARDING_HINTS.REWARDS_EXPLAINED);
            const triggerLead = sessionResult.needsLeadCapture;
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
            setShowLeadModal(false);
            setSessionResult(null);
            router.refresh();
          }}
        />
      )}

      {needsStartHint && timerState === "idle" && (
        <ActionGuidanceModal
          hint={ONBOARDING_HINTS.TIMER_STARTED}
          eyebrow="قدم اول: مطالعه"
          title="امروز فقط ۱ ساعت درس بخون!"
          description="تایمر مطالعه رو تنظیم کن و روی دکمه «شروع مطالعه» بزن تا اولین جلسه تمرکزت ثبت بشه."
          icon="play_circle"
          actionText="شروع مطالعه"
          points={[
            "هدف روز اول: ۱ ساعت مطالعه با تایمر.",
            "به ازای هر ۱۵ دقیقه مطالعه، ۱ XP و ۱ سکه جایزه می‌گیری."
          ]}
          targetElementSelector="[data-onboarding='timer-start']"
        />
      )}
    </>
  );
}
