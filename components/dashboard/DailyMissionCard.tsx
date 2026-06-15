"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface VideoStep {
  id: string;
  title: string;
  watched: boolean;
  /** قیمت ویدیو (سکه) — گروه paid */
  price: number;
  /** آیا خریده شده (گروه paid؛ برای free همیشه true) */
  purchased: boolean;
}

interface Props {
  /** آیا کاربر هنوز در مسیر آنبوردینگ است (مسیر ۶ روزه نمایش داده شود) */
  inOnboarding: boolean;
  /** تعداد روزهای کامل‌شده (۰ یعنی روز اول) */
  currentDay: number;
  totalDays: number;
  /** درصد پیشرفت دقیقه‌های مطالعه */
  progress: number;
  studiedMinutes: number;
  goalMinutes: number;
  isDay1?: boolean;
  video?: VideoStep | null;
  /** گروه A/B دسترسی به ویدیو */
  variant?: "free" | "paid";
  /** موجودی سکه‌ی کاربر (برای گروه paid) */
  userCoins?: number;
}

const ICONS = ["school", "menu_book", "timer", "trending_up", "bolt", "emoji_events"];

export default function DailyMissionCard({
  inOnboarding,
  currentDay,
  totalDays,
  progress,
  studiedMinutes,
  goalMinutes,
  isDay1 = false,
  video = null,
  variant = "free",
  userCoins = 0,
}: Props) {
  const router = useRouter();
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState("");

  async function handleBuy() {
    if (!video) return;
    setBuying(true);
    setBuyError("");
    const res = await fetch(`/api/videos/${video.id}/buy`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) {
      router.refresh();
    } else {
      setBuyError(data?.error ?? "خطا در خرید");
      setBuying(false);
    }
  }
  const remaining = Math.max(0, goalMinutes - studiedMinutes);
  const m = studiedMinutes % 60;
  const h = Math.floor(studiedMinutes / 60);
  const goalH = Math.floor(goalMinutes / 60);
  const goalM = goalMinutes % 60;
  const notStarted = studiedMinutes === 0;
  const minutesDone = studiedMinutes >= goalMinutes;

  // متن هدف به‌صورت جمله: «۲ ساعت درس بخون»
  const goalText =
    [goalH > 0 ? `${goalH.toLocaleString("fa-IR")} ساعت` : "", goalM > 0 ? `${goalM.toLocaleString("fa-IR")} دقیقه` : ""]
      .filter(Boolean)
      .join(" و ") || "۰ دقیقه";

  const days = Array.from({ length: totalDays }, (_, i) => ({
    day: i + 1,
    label: `روز ${(i + 1).toLocaleString("fa-IR")}`,
    icon: ICONS[i % ICONS.length],
  }));

  return (
    <section className="glass-card rounded-2xl p-4">
      {/* مسیر ۶ روزه (فقط در آنبوردینگ) */}
      {inOnboarding && (
        <>
          <p className="text-[13px] font-semibold text-on-surface-variant mb-3 text-right">
            مثل رتبه‌برترا درس بخون:
          </p>

          <div className="flex justify-between items-start relative px-1">
            {/* خط پیشرفت */}
            <div className="absolute top-[18px] right-4 left-4 h-[3px] bg-surface-container rounded-full">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (currentDay / totalDays) * 100)}%` }}
              />
            </div>

            {days.map(({ day, label, icon }) => {
              const isDone = currentDay >= day;
              const isCurrent = currentDay === day - 1;
              return (
                <Link
                  key={day}
                  href={isDone || isCurrent ? `/videos?day=${day}` : "#"}
                  className={`flex flex-col items-center gap-1 z-10 ${
                    isDone || isCurrent ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isDone
                        ? "bg-primary shadow-md shadow-primary/30"
                        : isCurrent
                        ? "bg-white border-2 border-primary"
                        : "bg-surface-container border border-outline-variant"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[16px] ${
                        isDone ? "text-white" : isCurrent ? "text-primary" : "text-outline-variant"
                      }`}
                      style={{ fontVariationSettings: isDone ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {isDone ? "check_circle" : icon}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-semibold ${
                      isCurrent ? "text-primary" : isDone ? "text-primary/70" : "text-outline-variant"
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="border-t border-outline-variant/40 my-4" />
        </>
      )}

      {/* ماموریت امروز */}
      <div className="flex items-center justify-between mb-3 flex-row-reverse">
        <h3 className="text-[16px] font-bold text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            target
          </span>
          {inOnboarding ? "ماموریت امروزت:" : isDay1 ? "ماموریت روز اول" : "ماموریت روزانه"}
        </h3>
        <span className="text-[14px] font-bold text-secondary">{progress.toLocaleString("fa-IR")}٪</span>
      </div>

      {/* بخش ۱: مطالعه — جمله هدف + نوار پیشرفت */}
      <div className="flex items-center gap-2 mb-1.5 flex-row-reverse">
        <span
          className={`material-symbols-outlined text-[18px] ${minutesDone ? "text-secondary" : "text-on-surface-variant"}`}
          style={{ fontVariationSettings: minutesDone ? "'FILL' 1" : "'FILL' 0" }}
        >
          {minutesDone ? "check_circle" : "timer"}
        </span>
        <p className="text-[15px] font-bold text-on-surface flex-1 text-right">
          {goalText} درس بخون
        </p>
      </div>
      <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden relative">
        <div
          className="bg-gradient-to-l from-secondary to-secondary-fixed-dim h-full rounded-full relative transition-all duration-500"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute left-0 top-0 w-3 h-full bg-white/50 blur-[2px] rounded-full" />
        </div>
      </div>
      <p className="text-[12px] font-medium text-on-surface-variant mt-1.5 text-right">
        {isDay1 && notStarted
          ? "فقط شروع کن! 💪"
          : `${h > 0 ? `${h.toLocaleString("fa-IR")} ساعت و ` : ""}${m.toLocaleString("fa-IR")} دقیقه خوندی${
              remaining > 0 ? ` · ${remaining.toLocaleString("fa-IR")} دقیقه تا جایزه` : ""
            }`}
      </p>

      {/* بخش ۲: ویدیوی روز + دکمه تماشا */}
      {video && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2 flex-row-reverse">
            <span
              className={`material-symbols-outlined text-[18px] ${video.watched ? "text-secondary" : "text-on-surface-variant"}`}
              style={{ fontVariationSettings: video.watched ? "'FILL' 1" : "'FILL' 0" }}
            >
              {video.watched ? "check_circle" : "play_circle"}
            </span>
            <p className="text-[15px] font-bold text-on-surface flex-1 text-right leading-snug">
              {variant === "paid" && !video.purchased
                ? `ویدیوی «${video.title}» رو بخر و ببین!`
                : `ویدیوی «${video.title}» رو ببین!`}
            </p>
          </div>

          {video.watched ? (
            <p className="text-[13px] font-semibold text-secondary text-right">ویدیوی امروز رو دیدی ✓</p>
          ) : variant === "paid" && !video.purchased ? (
            // گروه paid: ابتدا باید با سکه خریده شود
            <>
              <button
                type="button"
                onClick={handleBuy}
                disabled={buying || userCoins < video.price}
                className="gamified-btn w-full bg-tertiary text-on-tertiary text-[16px] font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-tertiary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {buying ? "progress_activity" : "shopping_cart"}
                </span>
                {buying ? "در حال خرید..." : `خرید ویدیو با ${video.price.toLocaleString("fa-IR")} سکه`}
              </button>
              <p className="text-[12px] text-on-surface-variant mt-1.5 text-right">
                {userCoins < video.price
                  ? `${userCoins.toLocaleString("fa-IR")} سکه داری · ${(video.price - userCoins).toLocaleString("fa-IR")} سکه دیگه با درس خوندن جمع کن`
                  : `${userCoins.toLocaleString("fa-IR")} سکه داری`}
              </p>
              {buyError && <p className="text-[12px] text-error mt-1 text-right">{buyError}</p>}
            </>
          ) : (
            <Link
              href={`/videos/${video.id}`}
              className="gamified-btn w-full bg-primary text-on-primary text-[16px] font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                play_circle
              </span>
              تماشا
              <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">سکه ۲×</span>
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
