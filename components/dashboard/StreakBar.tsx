"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  streak: number;
  studiedToday: boolean;
  /** آیا امروز قابل گرفتن مرخصی است (زنجیره زنده، امروز هنوز ثبت نشده) */
  canFreeze: boolean;
  freezeCost: number;
  coins: number;
}

/**
 * نوار یک‌خطیِ زنجیره‌ی مطالعه + دکمه‌ی مرخصی.
 * جایگزین باکس بزرگ ۶شعله‌ای شد.
 */
export default function StreakBar({ streak, studiedToday, canFreeze, freezeCost, coins }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enoughCoins = coins >= freezeCost;

  async function buyFreeze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/streak/freeze", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "خطا");
        setConfirming(false);
      } else {
        setConfirming(false);
        router.refresh();
      }
    } catch {
      setError("خطای شبکه");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3 flex-row-reverse border-r-4 border-r-tertiary-fixed-dim">
      <span
        className="material-symbols-outlined text-tertiary text-[24px] streak-flame shrink-0"
        style={{ fontVariationSettings: streak > 0 ? "'FILL' 1" : "'FILL' 0" }}
      >
        local_fire_department
      </span>

      <div className="flex-1 text-right min-w-0">
        {streak > 0 ? (
          <p className="text-[14px] font-bold text-on-surface leading-tight">
            <span className="text-tertiary text-[16px]">{streak.toLocaleString("fa-IR")} روز</span> پشت سر هم
            {studiedToday ? (
              <span className="text-secondary"> · امروز ثبت شد ✓</span>
            ) : (
              <span className="text-on-surface-variant/80"> · امروز هنوز نه</span>
            )}
          </p>
        ) : (
          <p className="text-[14px] font-bold text-on-surface leading-tight">
            امروز شروع کن تا زنجیره‌ات بسازی 🔥
          </p>
        )}
        {error && <p className="text-[11px] text-error mt-0.5">{error}</p>}
      </div>

      {/* دکمه مرخصی (فقط وقتی زنجیره در خطر سوختن است) */}
      {canFreeze && !confirming && (
        <button
          onClick={() => setConfirming(true)}
          className="shrink-0 flex items-center gap-1 bg-tertiary-fixed/40 text-tertiary text-[12px] font-bold px-2.5 py-1.5 rounded-full hover:bg-tertiary-fixed/60 transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>ac_unit</span>
          مرخصی
        </button>
      )}

      {canFreeze && confirming && (
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            onClick={buyFreeze}
            disabled={loading || !enoughCoins}
            className={`flex items-center gap-1 text-[12px] font-bold px-2.5 py-1.5 rounded-full transition-colors ${
              enoughCoins ? "bg-tertiary text-on-tertiary" : "bg-surface-container text-on-surface-variant cursor-not-allowed"
            }`}
          >
            {loading ? "..." : enoughCoins ? (
              <>
                {freezeCost.toLocaleString("fa-IR")}
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
              </>
            ) : "سکه کم"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-on-surface-variant text-[12px] px-1.5 py-1.5"
            aria-label="انصراف"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
