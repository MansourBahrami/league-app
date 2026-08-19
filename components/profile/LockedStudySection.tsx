"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  targetUserId: string;
  cost: number;
  userCoins: number;
  durationHours: number;
}

export default function LockedStudySection({ targetUserId, cost, userCoins, durationHours }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canAfford = userCoins >= cost;
  const missingCoins = Math.max(0, cost - userCoins);

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
    <section className="glass-card overflow-hidden rounded-xl" aria-labelledby="locked-study-title">
      <div className="flex flex-col items-center bg-gradient-to-b from-primary-fixed/55 to-transparent px-5 pb-5 pt-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-sm">
          <span className="material-symbols-outlined text-[26px]" aria-hidden="true">lock</span>
        </div>
        <h2 id="locked-study-title" className="mt-3 text-[16px] font-bold text-on-surface">گزارش مطالعه قفل است</h2>
        <p className="mt-1 max-w-[320px] text-[12px] leading-5 text-on-surface-variant">
          با بازکردن گزارش، عملکرد واقعی این کاربر در ۷ روز اخیر را می‌بینی.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5" aria-label="محتوای گزارش">
          {["نمودار ۷ روزه", "زنجیره مطالعه", "جزئیات سشن‌ها"].map((item) => (
            <span key={item} className="rounded-full bg-surface-container-lowest/80 px-2.5 py-1 text-[10px] font-semibold text-on-surface-variant">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-outline-variant/35 p-4">
        <dl className="grid grid-cols-2 divide-x divide-x-reverse divide-outline-variant/45 rounded-xl bg-surface-container-low/70 py-2.5 text-center">
          <div>
            <dt className="text-[10px] text-on-surface-variant">هزینه</dt>
            <dd className="mt-0.5 text-[13px] font-bold text-on-surface">{cost.toLocaleString("fa-IR")} سکه</dd>
          </div>
          <div>
            <dt className="text-[10px] text-on-surface-variant">مدت دسترسی</dt>
            <dd className="mt-0.5 text-[13px] font-bold text-on-surface">{durationHours.toLocaleString("fa-IR")} ساعت</dd>
          </div>
        </dl>

        {error && <p className="mt-3 text-center text-[12px] text-error" role="alert">{error}</p>}
        <button
          type="button"
          onClick={handleUnlock}
          disabled={!canAfford || loading}
          className={`gamified-btn mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold ${
            canAfford ? "bg-primary text-on-primary shadow-lg shadow-primary/20" : "cursor-not-allowed bg-surface-container-high text-outline"
          }`}
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span>
              در حال بازکردن...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">lock_open</span>
              {canAfford ? `بازکردن با ${cost.toLocaleString("fa-IR")} سکه` : `${missingCoins.toLocaleString("fa-IR")} سکه کم داری`}
            </>
          )}
        </button>
        <p className="mt-2 text-center text-[10px] text-outline">موجودی تو: {userCoins.toLocaleString("fa-IR")} سکه</p>
      </div>
    </section>
  );
}
