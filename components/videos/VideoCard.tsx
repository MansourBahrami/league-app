"use client";

import Link from "next/link";

interface Props {
  video: {
    id: string;
    title: string;
    day: number;
    durationMin: number;
    thumbnailUrl: string | null;
  };
  watchPct: number;
  isCompleted: boolean;
  isLocked?: boolean;
  /** متن جایگزین برای حالت قفل (مثلاً راهنمای خرید در گروه paid) */
  lockNote?: string;
}

export default function VideoCard({ video, watchPct, isCompleted, isLocked = false, lockNote }: Props) {
  const badge = `روز ${video.day.toLocaleString("fa-IR")}`;

  const inner = (
    <div className={`relative bg-white/80 rounded-xl p-1 shadow-[0_10px_25px_rgba(70,72,212,0.1)] border border-primary/20 backdrop-blur-xl group overflow-hidden transition-all duration-300 ${isLocked ? "opacity-80" : "hover:shadow-[0_15px_30px_rgba(70,72,212,0.15)] cursor-pointer"}`}>
      <div className="flex flex-row-reverse gap-4 bg-white rounded-xl p-3 items-center">
        <div className="w-24 h-24 rounded-xl overflow-hidden relative shrink-0 bg-primary-fixed flex items-center justify-center">
          {video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={video.title} />
          ) : (
            <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          )}
          {isLocked && (
            <div className="absolute inset-0 bg-on-surface/60 flex items-center justify-center backdrop-blur-[1px]">
              <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            </div>
          )}
          {!isLocked && isCompleted && (
            <div className="absolute inset-0 bg-secondary/70 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col items-end text-right">
          <div className="bg-primary-fixed/40 text-primary px-2 py-0.5 rounded text-[10px] font-bold mb-1">{badge}</div>
          <h3 className="text-[16px] font-bold text-on-surface leading-tight mb-2">{video.title}</h3>
          {isLocked ? (
            <span className="text-[12px] text-outline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              {lockNote ?? `روز ${video.day.toLocaleString("fa-IR")} — بعد از انجام ماموریت‌های اون روز باز میشه`}
            </span>
          ) : (
            <div className="flex items-center gap-2 text-on-surface-variant text-[12px]">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                {video.durationMin.toLocaleString("fa-IR")} دقیقه
              </span>
              {watchPct > 0 && !isCompleted && <span className="text-primary">{watchPct.toLocaleString("fa-IR")}٪ دیده شده</span>}
              {isCompleted && <span className="text-secondary">تکمیل شده ✓</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isLocked) {
    return (
      <button
        type="button"
        className="text-right w-full"
        onClick={() => alert(lockNote ?? `این ویدیو روز ${video.day.toLocaleString("fa-IR")} مسیره. بعد از انجام ماموریت‌های اون روز باز میشه.`)}
      >
        {inner}
      </button>
    );
  }

  return <Link href={`/videos/${video.id}`}>{inner}</Link>;
}
