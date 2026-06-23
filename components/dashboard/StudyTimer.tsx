"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const GoalSettingModal = dynamic(() => import("@/components/onboarding/GoalSettingModal"), { ssr: false });

type TimerState = "idle" | "running" | "paused" | "done";

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
  userId: string;
  isLeadComplete: boolean;
}

const TIMER_OPTIONS = [30, 60, 90, 120];
const TICK_INTERVAL = 15 * 60;

interface FloatReward { id: number; }

export default function StudyTimer({ userId, isLeadComplete }: Props) {
  const router = useRouter();
  const [selectedMinutes, setSelectedMinutes] = useState(60);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(60 * 60);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showGoalSetting, setShowGoalSetting] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [floats, setFloats] = useState<FloatReward[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // اندازه‌ی واقعی قاب برای کشیدن فریم شمارش‌معکوس بدون اعوجاج
  const frameRef = useRef<HTMLElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalSeconds = selectedMinutes * 60;
  const progress = ((secondsLeft / totalSeconds) * 100).toFixed(1);
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const secsToNextReward = TICK_INTERVAL - (Math.floor((totalSeconds - secondsLeft)) % TICK_INTERVAL);
  const minToNext = Math.ceil(secsToNextReward / 60);

  function showFloat() {
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 2000);
  }

  function setTimer(minutes: number) {
    if (timerState === "running") return;
    clearInterval(intervalRef.current!);
    setSelectedMinutes(minutes);
    setSecondsLeft(minutes * 60);
    setTimerState("idle");
    setSessionId(null);
  }

  async function endSession(sid: string) {
    const res = await fetch("/api/study/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid }),
    }).catch(() => null);
    if (!res) return;
    const data: SessionResult = await res.json().catch(() => null);
    if (!data) return;
    setSessionResult(data);
    localStorage.removeItem("study_session");
    // لید (موبایل اجباری) از طریق گیتِ AppShell بعد از router.refresh مدیریت می‌شود
    setShowGoalSetting(true);
  }

  const tick = useCallback(async () => {
    const now = Date.now();
    const newElapsed = Math.floor((now - startTimeRef.current!) / 1000);
    const newSecondsLeft = Math.max(0, totalSeconds - newElapsed);
    setSecondsLeft(newSecondsLeft);

    if (sessionId && now - lastTickRef.current >= TICK_INTERVAL * 1000) {
      lastTickRef.current = now;
      const res = await fetch("/api/study/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).then((r) => r.json()).catch(() => null);
      // جایزه لحظه‌ای فقط وقتی سرور واقعاً پاداش داد (ضد تقلب)
      if (res?.granted > 0) showFloat();
    }

    if (newSecondsLeft <= 0) {
      clearInterval(intervalRef.current!);
      setTimerState("done");
      if (sessionId) await endSession(sessionId);
    }
  }, [totalSeconds, sessionId]);

  useEffect(() => {
    if (timerState === "running") {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => clearInterval(intervalRef.current!);
  }, [timerState, tick]);

  useEffect(() => {
    const saved = localStorage.getItem("study_session");
    if (saved) {
      try {
        const { sid, startTime, totalSecs } = JSON.parse(saved);
        const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
        const remaining = totalSecs - elapsedSecs;
        if (remaining > 0) {
          setSessionId(sid);
          setSecondsLeft(remaining);
          setSelectedMinutes(Math.round(totalSecs / 60));
          setTimerState("running");
          startTimeRef.current = startTime;
          lastTickRef.current = startTime;
        } else {
          localStorage.removeItem("study_session");
        }
      } catch {
        localStorage.removeItem("study_session");
      }
    }
  }, []);

  async function handleToggle() {
    if (timerState === "idle") {
      const res = await fetch("/api/study/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMin: selectedMinutes }),
      });
      const data = await res.json();
      const sid = data.sessionId;
      const now = Date.now();
      setSessionId(sid);
      startTimeRef.current = now;
      lastTickRef.current = now;
      localStorage.setItem("study_session", JSON.stringify({ sid, startTime: now, totalSecs: totalSeconds }));
      setTimerState("running");
    } else if (timerState === "running") {
      clearInterval(intervalRef.current!);
      setTimerState("paused");
      if (sessionId) fetch("/api/study/pause", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    } else if (timerState === "paused") {
      // زمان pause شده را به startTime اضافه می‌کنیم تا شمارش درست بماند
      startTimeRef.current = Date.now() - (totalSeconds - secondsLeft) * 1000;
      // پنجره tick هم باید نسبت به مکث جابه‌جا شود
      lastTickRef.current = Date.now() - ((totalSeconds - secondsLeft) % TICK_INTERVAL) * 1000;
      setTimerState("running");
      if (sessionId) {
        fetch("/api/study/resume", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {});
        localStorage.setItem("study_session", JSON.stringify({ sid: sessionId, startTime: startTimeRef.current, totalSecs: totalSeconds }));
      }
    } else if (timerState === "done") {
      setTimerState("idle");
      setSecondsLeft(selectedMinutes * 60);
      setSessionId(null);
    }
  }

  async function handleStop() {
    clearInterval(intervalRef.current!);
    if (sessionId) await endSession(sessionId);
    setTimerState("idle");
    setSecondsLeft(selectedMinutes * 60);
    setSessionId(null);
  }

  const btnConfig = {
    idle: { icon: "play_arrow", label: "شروع مطالعه", cls: "bg-primary text-on-primary shadow-primary/20" },
    running: { icon: "pause", label: "در حال تمرکز...", cls: "bg-tertiary-fixed-dim text-on-tertiary-fixed shadow-tertiary-fixed-dim/20" },
    paused: { icon: "play_arrow", label: "ادامه مطالعه", cls: "bg-primary text-on-primary shadow-primary/20" },
    done: { icon: "emoji_events", label: "پایان ماموریت! 🎉", cls: "bg-secondary text-on-secondary shadow-secondary/20" },
  };
  const btn = btnConfig[timerState];
  const isActive = timerState === "running" || timerState === "paused";

  return (
    <>
      <section ref={frameRef} className="glass-card rounded-xl p-5 relative border-2 border-primary/15">
        {/* فریم شمارش‌معکوس: با اندازه‌ی واقعی قاب کشیده می‌شود (بدون اعوجاج) و با گذر زمان خالی می‌شود */}
        {isActive && box.w > 0 && (
          <svg className="absolute inset-0 pointer-events-none z-0" width={box.w} height={box.h} aria-hidden>
            <rect
              x={2.5} y={2.5} width={box.w - 5} height={box.h - 5} rx={10} fill="none"
              stroke="var(--color-primary)" strokeWidth={3} strokeLinecap="round"
              pathLength={1000}
              strokeDasharray={1000}
              strokeDashoffset={1000 * (1 - secondsLeft / totalSeconds)}
              style={{ transition: timerState === "running" ? "stroke-dashoffset 1s linear" : "none" }}
            />
          </svg>
        )}

        <div className="relative z-10">
          {/* ردیف بالا: عنوان + انتخاب مدت (مطابق طرح) */}
          <div className="flex items-center justify-between flex-row-reverse gap-2 mb-4">
            <h2 className="text-[16px] font-extrabold text-on-surface shrink-0">تایمر مطالعه</h2>
            <div className="flex gap-2" dir="ltr">
              {[...TIMER_OPTIONS].reverse().map((min) => (
                <button
                  key={min}
                  onClick={() => setTimer(min)}
                  disabled={timerState === "running"}
                  className={`w-12 h-12 rounded-2xl text-[14px] font-bold transition-all flex items-center justify-center ${
                    selectedMinutes === min
                      ? "bg-primary text-on-primary shadow-md scale-105"
                      : "border border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {min.toLocaleString("fa-IR")}
                </button>
              ))}
            </div>
          </div>

          {/* نمایش زمان هنگام اجرا */}
          {isActive && (
            <div className="text-center mb-4 relative">
              {floats.map((f) => (
                <span key={f.id} className="reward-float absolute -top-2 right-1/2 translate-x-1/2 text-[13px] font-extrabold text-secondary whitespace-nowrap">
                  +۱ XP · +۱ سکه
                </span>
              ))}
              <span className="text-[52px] leading-none font-extrabold text-primary" dir="ltr" style={{ fontVariant: "tabular-nums" }}>
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
              {timerState === "running" && (
                <p className="text-[12px] text-on-surface-variant mt-1.5">جایزه بعدی تا {minToNext.toLocaleString("fa-IR")} دقیقه دیگر</p>
              )}
              {timerState === "paused" && (
                <p className="text-[12px] text-tertiary font-semibold mt-1.5">⏸ متوقف شده</p>
              )}
            </div>
          )}

          {/* دکمه اصلی (بزرگ) */}
          <button
            onClick={handleToggle}
            className={`gamified-btn w-full text-[18px] font-extrabold py-5 rounded-2xl flex justify-center items-center gap-2 shadow-lg ${btn.cls}`}
          >
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{btn.icon}</span>
            {btn.label}
          </button>

          {isActive && (
            <button
              onClick={handleStop}
              className="mt-3 w-full border-2 border-outline-variant text-on-surface-variant py-3.5 rounded-2xl text-[16px] font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">stop</span>
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
          onClose={() => {
            setShowGoalSetting(false);
            setSessionResult(null);
            // به‌روزرسانی داشبورد سمت سرور (پراگرس‌بار، سکه/XP هدر، وضعیت روز)
            router.refresh();
          }}
        />
      )}
    </>
  );
}
