import Link from "next/link";
import { formatStudyMinutes } from "@/lib/gamification";
import type { WeeklyMissionState } from "@/lib/weekly-mission";

/** کارت ماموریت هفتگی بعد از آنبوردینگ: دو پیشرفت (روزانه + هفتگی) یا دکمه‌ی انتخاب ماموریت. */
export default function WeeklyMissionCard({ state }: { state: WeeklyMissionState | null }) {
  // حالت بدون ماموریت فعال → دعوت به انتخاب ماموریت هفتگی
  if (!state) {
    return (
      <section className="glass-card rounded-2xl p-5 text-center">
        <span className="material-symbols-outlined text-secondary text-[40px] mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>
          flag
        </span>
        <h3 className="text-[16px] font-bold text-on-surface mb-1">ماموریت هفتگی فعالی نداری</h3>
        <p className="text-[13px] text-on-surface-variant mb-4 leading-relaxed">
          یه ماموریت هفتگی انتخاب کن تا ساعت مطالعه‌ات به ۶ روز تقسیم شه و هر روز هدف روشنی داشته باشی.
        </p>
        <Link
          href="/missions"
          className="gamified-btn inline-flex items-center justify-center gap-2 bg-primary text-on-primary text-[15px] font-bold py-3 px-6 rounded-xl shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
          انتخاب ماموریت هفتگی
        </Link>
      </section>
    );
  }

  const dailyPct = state.dailyGoalMin > 0 ? Math.min(100, Math.round((state.dailyStudiedMin / state.dailyGoalMin) * 100)) : 100;
  const weeklyPct = state.weeklyGoalMin > 0 ? Math.min(100, Math.round((state.weeklyStudiedMin / state.weeklyGoalMin) * 100)) : 0;
  const dailyDone = state.dailyStudiedMin >= state.dailyGoalMin;

  return (
    <section className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3 flex-row-reverse">
        <h3 className="text-[16px] font-bold text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>target</span>
          ماموریت امروز (روز {state.dayIndex.toLocaleString("fa-IR")} از ۷)
        </h3>
        <span className="text-[12px] font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">
          هفتگی: {state.targetHours.toLocaleString("fa-IR")} ساعت
        </span>
      </div>

      {state.isRestDay ? (
        <div className="bg-secondary-container/40 rounded-xl p-4 text-center">
          <span className="material-symbols-outlined text-secondary text-[32px] mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
          <p className="text-[15px] font-bold text-on-surface">امروز روز استراحته! 🎉</p>
          <p className="text-[13px] text-on-surface-variant mt-1">ماموریت هفتگی‌ت رو کامل کردی. می‌تونی استراحت کنی یا جلوتر بزنی.</p>
        </div>
      ) : (
        <>
          {/* پیشرفت روزانه */}
          <div className="flex items-center gap-2 mb-1.5 flex-row-reverse">
            <span className={`material-symbols-outlined text-[18px] ${dailyDone ? "text-secondary" : "text-on-surface-variant"}`} style={{ fontVariationSettings: dailyDone ? "'FILL' 1" : "'FILL' 0" }}>
              {dailyDone ? "check_circle" : "timer"}
            </span>
            <p className="text-[15px] font-bold text-on-surface flex-1 text-right">
              {state.dayIndex >= 7 ? "جبرانِ امروز: " : "امروز: "}{formatStudyMinutes(state.dailyGoalMin)} درس بخون
            </p>
          </div>
          <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-l from-secondary to-secondary-fixed-dim h-full rounded-full transition-all duration-500" style={{ width: `${dailyPct}%` }} />
          </div>
          <p className="text-[12px] font-medium text-on-surface-variant mt-1.5 text-right">
            {formatStudyMinutes(state.dailyStudiedMin)} از {formatStudyMinutes(state.dailyGoalMin)} امروز
            {!dailyDone && state.dailyGoalMin > state.dailyStudiedMin ? ` · ${formatStudyMinutes(state.dailyGoalMin - state.dailyStudiedMin)} مونده` : " ✓"}
          </p>
        </>
      )}

      {/* پیشرفت هفتگی */}
      <div className="border-t border-outline-variant/30 mt-4 pt-3">
        <div className="flex items-center gap-2 mb-1.5 flex-row-reverse">
          <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
          <p className="text-[14px] font-bold text-on-surface flex-1 text-right">پیشرفت هفتگی</p>
          <span className="text-[12px] font-bold text-primary">{weeklyPct.toLocaleString("fa-IR")}٪</span>
        </div>
        <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-l from-primary to-primary-container h-full rounded-full transition-all duration-500" style={{ width: `${weeklyPct}%` }} />
        </div>
        <p className="text-[12px] font-medium text-on-surface-variant mt-1.5 text-right">
          {formatStudyMinutes(state.weeklyStudiedMin)} از {formatStudyMinutes(state.weeklyGoalMin)} این هفته
          {state.dayIndex < 7 && <span className="text-on-surface-variant/70"> · روز ۷ استراحت/جبران</span>}
        </p>
      </div>
    </section>
  );
}
