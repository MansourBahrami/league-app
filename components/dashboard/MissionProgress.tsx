"use client";

import Link from "next/link";

interface VideoStep {
  id: string;
  title: string;
  unlocked: boolean;
  watched: boolean;
}

interface Props {
  progress: number;
  studiedMinutes: number;
  goalMinutes: number;
  isDay1?: boolean;
  video?: VideoStep | null;
}

export default function MissionProgress({ progress, studiedMinutes, goalMinutes, isDay1 = false, video = null }: Props) {
  const remaining = Math.max(0, goalMinutes - studiedMinutes);
  const h = Math.floor(studiedMinutes / 60);
  const m = studiedMinutes % 60;
  const goalH = Math.floor(goalMinutes / 60);
  const goalM = goalMinutes % 60;
  const notStarted = studiedMinutes === 0;
  const minutesDone = studiedMinutes >= goalMinutes;

  return (
    <section className="glass-card rounded-xl p-6 relative overflow-hidden">
      <div className="flex justify-between items-center mb-2 flex-row-reverse">
        <h3 className="text-[20px] font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>target</span>
          {isDay1 ? "ماموریت روز اول" : "ماموریت روزانه"}
        </h3>
        <span className="text-[16px] font-bold text-secondary">{progress.toLocaleString("fa-IR")}٪</span>
      </div>

      {/* هدف امروز */}
      <p className="text-[13px] text-on-surface-variant mb-3 text-right">
        هدف امروز: {goalH > 0 && `${goalH.toLocaleString("fa-IR")} ساعت`}{goalM > 0 && ` و ${goalM.toLocaleString("fa-IR")} دقیقه`}
      </p>

      {/* بخش ۱: مطالعه */}
      <div className="flex items-center gap-2 mb-1">
        <span className={`material-symbols-outlined text-[16px] ${minutesDone ? "text-secondary" : "text-on-surface-variant"}`} style={{ fontVariationSettings: minutesDone ? "'FILL' 1" : "'FILL' 0" }}>
          {minutesDone ? "check_circle" : "timer"}
        </span>
        <span className="text-[13px] font-semibold text-on-surface flex-1 text-right">مطالعه</span>
      </div>
      <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden relative">
        <div
          className="bg-gradient-to-l from-secondary to-secondary-fixed-dim h-full rounded-full relative transition-all duration-500"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute left-0 top-0 w-4 h-full bg-white/50 blur-[2px] rounded-full" />
        </div>
      </div>

      {/* بخش ۲: ویدیو (فقط اگر برای این روز ویدیویی هست) */}
      {video && (
        <>
          <div className="flex items-center gap-2 mt-3 mb-1">
            <span className={`material-symbols-outlined text-[16px] ${video.watched ? "text-secondary" : "text-on-surface-variant"}`} style={{ fontVariationSettings: video.watched ? "'FILL' 1" : "'FILL' 0" }}>
              {video.watched ? "check_circle" : "play_circle"}
            </span>
            <span className="text-[13px] font-semibold text-on-surface flex-1 text-right">تماشای ویدیوی روز</span>
          </div>
          {video.watched ? (
            <p className="text-[13px] text-secondary text-right">ویدیوی امروز رو دیدی ✓</p>
          ) : video.unlocked ? (
            <Link href={`/videos/${video.id}`} className="block">
              <div className="bg-tertiary-fixed/30 rounded-xl p-2.5 flex items-center gap-2 flex-row-reverse hover:bg-tertiary-fixed/50 transition-colors">
                <span className="material-symbols-outlined text-tertiary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                <span className="text-[13px] font-bold text-on-surface flex-1 text-right leading-tight">{video.title}</span>
                <span className="text-[11px] font-bold text-tertiary bg-tertiary-fixed/60 px-2 py-0.5 rounded-full">سکه ۲×</span>
              </div>
            </Link>
          ) : (
            <p className="text-[13px] text-on-surface-variant text-right flex items-center gap-1 justify-end">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              بعد از تکمیل دقیقه‌های مطالعه باز می‌شود
            </p>
          )}
        </>
      )}

      {isDay1 && notStarted ? (
        <p className="text-[15px] font-bold text-primary mt-3 text-right">فقط شروع کن! 💪</p>
      ) : (
        <p className="text-[14px] font-semibold text-on-surface-variant mt-3 text-right">
          {h > 0 && `${h.toLocaleString("fa-IR")} ساعت و `}{m.toLocaleString("fa-IR")} دقیقه مطالعه کردی
          {remaining > 0 && ` · ${remaining.toLocaleString("fa-IR")} دقیقه دیگر تا جایزه`}
        </p>
      )}
    </section>
  );
}
