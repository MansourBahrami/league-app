"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  targetUserId: string;
  cost: number;
  userCoins: number;
}

// ارتفاع نسبی میله‌های نمونه (فقط برای نمای مات پشت قفل)
const MOCK_BARS = [40, 70, 30, 90, 55, 80, 45];

export default function LockedStudySection({ targetUserId, cost, userCoins }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canAfford = userCoins >= cost;

  async function handleUnlock() {
    if (!canAfford || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/profile/${targetUserId}/unlock`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "خطا");
        return;
      }
      router.refresh();
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative rounded-xl overflow-hidden">
      {/* نمای مات (teaser) — داده‌ی واقعی نیست */}
      <div className="blur-[6px] select-none pointer-events-none" aria-hidden>
        <div className="flex flex-col gap-2">
          {/* کارت‌های زنجیره + مجموع ۷ روز */}
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-card rounded-xl p-4 flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-tertiary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              </div>
              <h3 className="text-[14px] font-semibold text-on-surface-variant">زنجیره مطالعه</h3>
              <p className="text-[18px] font-bold text-on-surface">۱۲ روز</p>
            </div>
            <div className="glass-card rounded-xl p-4 flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary-fixed/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl">schedule</span>
              </div>
              <h3 className="text-[14px] font-semibold text-on-surface-variant">مجموع ۷ روز</h3>
              <p className="text-[18px] font-bold text-on-surface">۱۸ ساعت</p>
            </div>
          </div>

          {/* نمودار نمونه */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-end justify-between gap-1.5 h-[104px]" dir="rtl">
              {MOCK_BARS.map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-primary/70 to-primary/30" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          {/* لاگ نمونه */}
          <div className="glass-card rounded-xl p-4 flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex justify-between items-center bg-white/60 rounded-lg p-3">
                <span className="text-[13px] text-outline">چند ساعت پیش</span>
                <span className="text-[14px] font-bold text-primary">۲ ساعت و ۱۵ دقیقه</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* لایه‌ی قفل روی نما */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/40 backdrop-blur-[1px] text-center px-6">
        <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center shadow-md">
          <span className="material-symbols-outlined text-primary text-[28px]">lock</span>
        </div>
        <h3 className="text-[16px] font-bold text-on-surface">بخش مطالعه قفل است</h3>
        <p className="text-[13px] text-on-surface-variant max-w-[280px]">
          زنجیره، مجموع و نمودار ۷ روز اخیر و لاگ مطالعه‌ی این کاربر را با پرداخت{" "}
          {cost.toLocaleString("fa-IR")} سکه تا ۱ ساعت ببین.
        </p>
        {error && <p className="text-error text-[13px]">{error}</p>}
        <button
          onClick={handleUnlock}
          disabled={!canAfford || loading}
          className={`gamified-btn w-full max-w-[300px] py-3 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 ${
            canAfford ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-outline-variant text-outline cursor-not-allowed"
          }`}
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock_open</span>
              {canAfford ? `باز کن (${cost.toLocaleString("fa-IR")} سکه)` : "سکه کافی نیست"}
            </>
          )}
        </button>
      </div>
    </section>
  );
}
