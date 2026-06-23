"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Confetti from "@/components/ui/Confetti";

interface Props {
  xpEarned: number;
  coinsEarned: number;
  durationMin: number;
  onboardingDay: number;
  dayCompleted: boolean;
  inOnboarding: boolean;
  dailyGoalMinutes: number;
  remainingMinutes: number;
  needsVideo?: boolean;
  tomorrowGoalMinutes: number;
  rewardVideo: { id: string; title: string } | null;
  onClose: () => void;
}

const TIME_OPTIONS = [
  { label: "۷ صبح", value: "07:00" },
  { label: "۸ صبح", value: "08:00" },
  { label: "۹ صبح", value: "09:00" },
  { label: "۱۰ صبح", value: "10:00" },
  { label: "۱۴ ب‌ظهر", value: "14:00" },
  { label: "۱۶ ب‌ظهر", value: "16:00" },
  { label: "۱۹ عصر", value: "19:00" },
  { label: "۲۱ شب", value: "21:00" },
];

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h > 0 ? `${h.toLocaleString("fa-IR")} ساعت` : ""}${m > 0 ? `${h > 0 ? " و " : ""}${m.toLocaleString("fa-IR")} دقیقه` : ""}` || "۰ دقیقه";
}

export default function GoalSettingModal({
  xpEarned,
  coinsEarned,
  durationMin,
  onboardingDay,
  dayCompleted,
  inOnboarding,
  dailyGoalMinutes,
  remainingMinutes,
  needsVideo = false,
  tomorrowGoalMinutes,
  rewardVideo,
  onClose,
}: Props) {
  const router = useRouter();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveTime = customTime || selectedTime;

  async function saveGoalThen(after: () => void) {
    setSaving(true);
    if (effectiveTime) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const [h, m] = effectiveTime.split(":").map(Number);
      tomorrow.setHours(h, m, 0, 0);
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStudyTarget: tomorrow.toISOString() }),
      }).catch(() => {});
    }
    setSaving(false);
    after();
  }

  const handleSave = () => saveGoalThen(onClose);
  const handleWatchReward = () =>
    saveGoalThen(() => {
      if (rewardVideo) router.push(`/videos/${rewardVideo.id}`);
      else onClose();
    });

  const rewardBadges = (
    <div className="flex justify-center gap-3 mb-5">
      {xpEarned > 0 && (
        <div className="flex items-center gap-1.5 bg-surface-container-high px-3 py-2 rounded-full pop-in">
          <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          <span className="text-[15px] font-bold text-primary">+{xpEarned.toLocaleString("fa-IR")} XP</span>
        </div>
      )}
      {coinsEarned > 0 && (
        <div className="flex items-center gap-1.5 bg-tertiary-fixed/40 px-3 py-2 rounded-full pop-in" style={{ animationDelay: "0.08s" }}>
          <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>generating_tokens</span>
          <span className="text-[15px] font-bold text-tertiary">+{coinsEarned.toLocaleString("fa-IR")} سکه</span>
        </div>
      )}
    </div>
  );

  /* ---------- حالت الف: دقیقه‌ها کامل شد ولی ویدیوی روز مانده ---------- */
  if (inOnboarding && needsVideo && rewardVideo) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 pt-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))] bg-black/50 backdrop-blur-sm overflow-y-auto">
        <Confetti count={30} />
        <div className="glass-card w-full max-w-[500px] rounded-2xl p-6 pb-8">
          {rewardBadges}
          <div className="text-center mb-5">
            <h2 className="text-[18px] font-extrabold text-on-surface mb-1">دقیقه‌های امروزت تکمیل شد! 🎯</h2>
            <p className="text-[14px] text-on-surface-variant">
              یک قدم تا تکمیل روز {onboardingDay.toLocaleString("fa-IR")} مونده: ویدیوی امروز رو ببین (الان ببینی سکه ۲× می‌گیری).
            </p>
          </div>
          <div className="bg-tertiary-fixed/30 rounded-xl p-3 flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-tertiary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
            <p className="text-[14px] font-bold text-on-surface leading-tight flex-1 text-right">{rewardVideo.title}</p>
          </div>
          <button
            onClick={handleWatchReward}
            disabled={saving}
            className="gamified-btn w-full bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
            تماشای ویدیو و تکمیل روز
          </button>
          <button onClick={onClose} className="w-full py-2 mt-1 text-[13px] font-semibold text-outline hover:text-primary">
            بعداً
          </button>
        </div>
      </div>
    );
  }

  /* ---------- حالت ب: روز آنبوردینگ هنوز کامل نشده (دقیقه کم است) ---------- */
  if (inOnboarding && !dayCompleted) {
    const progressPct = Math.min(100, Math.round(((dailyGoalMinutes - remainingMinutes) / dailyGoalMinutes) * 100));
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 pt-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))] bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div className="glass-card w-full max-w-[500px] rounded-2xl p-6 pb-8">
          {rewardBadges}
          <div className="text-center mb-5">
            <h2 className="text-[18px] font-extrabold text-on-surface mb-1">آفرین! {fmt(durationMin)} مطالعه کردی</h2>
            <p className="text-[14px] text-on-surface-variant">
              برای تکمیل ماموریت امروز، <span className="font-bold text-primary">{fmt(remainingMinutes)}</span> دیگه مونده.
            </p>
          </div>
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px] font-semibold text-secondary">ماموریت روز {(onboardingDay + 1).toLocaleString("fa-IR")}</span>
              <span className="text-[13px] text-on-surface-variant">{fmt(dailyGoalMinutes - remainingMinutes)} / {fmt(dailyGoalMinutes)}</span>
            </div>
            <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-l from-secondary to-secondary-fixed-dim rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="gamified-btn w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            ادامه می‌دم!
          </button>
        </div>
      </div>
    );
  }

  /* ---------- حالت ج: روز کامل شد یا خارج از آنبوردینگ ---------- */
  const celebrate = dayCompleted ? "ماموریت امروز رو کامل کردی! 🎉" : durationMin >= 30 ? "آفرین! جلسه خوبی داشتی 🎉" : "شروع کردی، ادامه بده!";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 pt-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))] bg-black/50 backdrop-blur-sm overflow-y-auto">
      {dayCompleted && <Confetti count={50} />}
      <div className="glass-card w-full max-w-[500px] rounded-2xl p-6 pb-8">
        {rewardBadges}

        <div className="text-center mb-6">
          <h2 className="text-[22px] font-extrabold text-on-surface mb-1">{celebrate}</h2>
          <p className="text-[14px] text-on-surface-variant">
            {fmt(durationMin)} مطالعه{inOnboarding ? ` — روز ${onboardingDay.toLocaleString("fa-IR")}` : ""}
          </p>
          {dayCompleted && inOnboarding && (
            <div className="mt-3 bg-secondary-container/40 rounded-xl p-2.5">
              <p className="text-[13px] font-semibold text-on-surface leading-relaxed">
                ماموریت امروزت تموم شد! 🎉 فردا ماموریت جدیدت شروع می‌شه —
                <span className="text-secondary font-bold"> ولی می‌تونی همین امروز هم ادامه بدی و جلوتر بزنی.</span>
              </p>
            </div>
          )}
        </div>

        {/* پرسش هدف فردا */}
        <div className="mb-5">
          <p className="text-[16px] font-bold text-on-surface text-center mb-3">فردا ساعت چند شروع می‌کنی؟</p>
          <div className="grid grid-cols-4 gap-2">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setSelectedTime(t.value); setCustomTime(""); }}
                className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${
                  effectiveTime === t.value
                    ? "bg-primary text-on-primary border-primary shadow-md"
                    : "border-outline-variant text-on-surface-variant hover:bg-primary-fixed"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* ورودی ساعت دلخواه */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[12px] text-on-surface-variant">یا ساعت دلخواه:</span>
            <input
              type="time"
              value={customTime}
              onChange={(e) => { setCustomTime(e.target.value); setSelectedTime(null); }}
              className="border border-outline-variant rounded-lg px-2 py-1 text-[13px] text-on-surface bg-surface-container-lowest"
              dir="ltr"
            />
          </div>
        </div>

        {/* هدف فردا = امروز + نیم ساعت */}
        {inOnboarding && tomorrowGoalMinutes > 0 && (
          <div className="mb-5 bg-primary-fixed rounded-xl p-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
            <div className="text-right">
              <p className="text-[13px] font-semibold text-primary">هدف فردا</p>
              <p className="text-[14px] font-bold text-on-surface">{fmt(tomorrowGoalMinutes)} (نیم ساعت بیشتر از امروز)</p>
            </div>
          </div>
        )}

        {/* جایزه ویدیویی */}
        {rewardVideo ? (
          <div className="flex flex-col gap-2">
            <div className="bg-tertiary-fixed/30 rounded-xl p-3 flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined text-tertiary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-tertiary">جایزه‌ات باز شد: ویدیوی آموزشی</p>
                <p className="text-[14px] font-bold text-on-surface leading-tight">{rewardVideo.title}</p>
              </div>
            </div>
            <button
              onClick={handleWatchReward}
              disabled={saving}
              className="gamified-btn w-full bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {saving ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                  تماشای ویدیوی پاداش
                </>
              )}
            </button>
            <button onClick={onClose} className="w-full py-2 text-[13px] font-semibold text-outline hover:text-primary">
              بعداً تماشا می‌کنم
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant text-[14px] font-semibold hover:bg-surface-container transition-colors"
            >
              بعداً
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-grow gamified-btn bg-primary text-on-primary font-bold text-[15px] py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {saving ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>alarm</span>
                  ثبت هدف
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
