"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Confetti from "@/components/ui/Confetti";

interface Props {
  xpEarned: number;
  coinsEarned: number;
  durationMin: number;
  dayCompleted: boolean;
  dailyGoalMinutes: number;
  remainingMinutes: number;
  rewardVideo: { id: string; title: string } | null;
  showRewardLesson?: boolean;
  onClose: () => void | Promise<void>;
}

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h > 0 ? `${h.toLocaleString("fa-IR")} ساعت` : ""}${m > 0 ? `${h > 0 ? " و " : ""}${m.toLocaleString("fa-IR")} دقیقه` : ""}` || "۰ دقیقه";
}

export default function GoalSettingModal({
  xpEarned,
  coinsEarned,
  durationMin,
  dayCompleted,
  dailyGoalMinutes,
  remainingMinutes,
  rewardVideo,
  showRewardLesson = false,
  onClose,
}: Props) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const primaryActionRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);

  const hasReward = xpEarned > 0 || coinsEarned > 0;
  const hasIncompleteGoal = dailyGoalMinutes > 0 && !dayCompleted;
  const progressPct = hasIncompleteGoal
    ? Math.min(100, Math.round(((dailyGoalMinutes - remainingMinutes) / dailyGoalMinutes) * 100))
    : 0;
  const closeLabel = showRewardLesson ? "متوجه شدم" : "برگشت به تایمر";
  const title = dayCompleted
    ? "هدف امروز کامل شد 🎉"
    : `${fmt(durationMin)} مطالعه ثبت شد`;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusTimer = window.setTimeout(() => primaryActionRef.current?.focus(), 0);

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !navigating) {
        event.preventDefault();
        void onCloseRef.current();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [navigating]);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])",
      ) ?? [],
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

  async function handleWatchReward() {
    if (!rewardVideo) return;
    setNavigating(true);
    await onClose();
    router.push(`/videos/${rewardVideo.id}`);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-on-surface/50 px-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
      {dayCompleted && <Confetti count={40} />}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-result-title"
        aria-describedby="study-result-summary"
        onKeyDown={trapFocus}
        className="glass-card w-full max-w-[500px] rounded-2xl p-6 pb-7 shadow-2xl"
      >
        <div className="text-center">
          <h2 id="study-result-title" className="text-[21px] font-extrabold text-on-surface">
            {title}
          </h2>
          <p id="study-result-summary" className="mt-1 text-[13px] text-on-surface-variant">
            {dayCompleted ? `${fmt(durationMin)} مطالعه در این جلسه` : "زمان مطالعه با موفقیت ذخیره شد."}
          </p>
        </div>

        {hasReward && (
          <div className="my-4 flex justify-center gap-3" aria-label="پاداش این جلسه">
            {xpEarned > 0 && (
              <div className="pop-in flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                <span className="text-[15px] font-bold text-primary">+{xpEarned.toLocaleString("fa-IR")} XP</span>
              </div>
            )}
            {coinsEarned > 0 && (
              <div className="pop-in flex items-center gap-1.5 rounded-full bg-tertiary-fixed/40 px-3 py-2" style={{ animationDelay: "0.08s" }}>
                <span className="material-symbols-outlined text-[18px] text-tertiary" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>generating_tokens</span>
                <span className="text-[15px] font-bold text-tertiary">+{coinsEarned.toLocaleString("fa-IR")} سکه</span>
              </div>
            )}
          </div>
        )}

        {showRewardLesson && (
          <div className="my-4 rounded-2xl border border-tertiary/25 bg-tertiary-fixed/35 p-3.5 pop-in">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary text-on-tertiary">
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>rewarded_ads</span>
              </span>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[14px] font-extrabold text-on-surface">هر ۱۵ دقیقه = ۱ XP + ۱ سکه</p>
                <p className="mt-1 text-[12px] leading-6 text-on-surface-variant">
                  XP رتبه‌ات رو بالا می‌بره؛ سکه رو برای مأموریت‌ها خرج می‌کنی.
                </p>
              </div>
            </div>
          </div>
        )}

        {!hasReward && (
          <p className="my-4 rounded-xl bg-surface-container-high px-3 py-2.5 text-center text-[13px] font-semibold text-on-surface-variant">
            تا اولین جایزه، {Math.max(1, 15 - durationMin).toLocaleString("fa-IR")} دقیقه دیگه
          </p>
        )}

        {hasIncompleteGoal && (
          <div className="my-5">
            <p className="mb-3 text-center text-[14px] font-bold text-on-surface">
              {fmt(remainingMinutes)} تا هدف امروزت مونده.
            </p>
            <div className="mb-2 flex items-center justify-between text-[12.5px]">
              <span className="font-semibold text-tertiary">پیشرفت امروز</span>
              <span className="text-on-surface-variant">{fmt(dailyGoalMinutes - remainingMinutes)} از {fmt(dailyGoalMinutes)}</span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-surface-container"
              role="progressbar"
              aria-label="پیشرفت هدف امروز"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPct}
            >
              <div className="h-full rounded-full bg-gradient-to-l from-tertiary to-tertiary-fixed-dim transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        {dayCompleted && rewardVideo && (
          <div className="mb-4 rounded-xl border border-tertiary/25 bg-tertiary-fixed/25 p-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[21px] text-tertiary" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[11.5px] font-semibold text-tertiary">ویدیوی پاداش اختیاری</p>
                <p className="truncate text-[13.5px] font-bold text-on-surface">{rewardVideo.title}</p>
              </div>
            </div>
          </div>
        )}

        <button
          ref={primaryActionRef}
          type="button"
          onClick={onClose}
          disabled={navigating}
          className="gamified-btn flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[16px] font-bold text-on-primary shadow-lg shadow-primary/20 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          {closeLabel}
        </button>

        {dayCompleted && rewardVideo && (
          <button
            type="button"
            onClick={handleWatchReward}
            disabled={navigating}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-tertiary/45 py-3 text-[13.5px] font-bold text-tertiary hover:bg-tertiary-fixed/25 disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[19px] ${navigating ? "animate-spin" : ""}`} aria-hidden="true">
              {navigating ? "progress_activity" : "play_circle"}
            </span>
            دیدن ویدیوی پاداش
          </button>
        )}
      </div>
    </div>
  );
}
