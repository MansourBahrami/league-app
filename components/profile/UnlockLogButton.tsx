"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  targetUserId: string;
  cost: number;
  userCoins: number;
}

export default function UnlockLogButton({ targetUserId, cost, userCoins }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canAfford = userCoins >= cost;

  async function handleUnlock() {
    if (!canAfford) return;
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
    <div className="glass-card rounded-xl p-6 flex flex-col items-center text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-[#e1e0ff] flex items-center justify-center">
        <span className="material-symbols-outlined text-[#4648d4] text-[28px]">lock</span>
      </div>
      <h3 className="text-[18px] font-bold text-[#0b1c30]">لاگ مطالعه قفل است</h3>
      <p className="text-[14px] text-[#464554]">
        با پرداخت {cost.toLocaleString("fa-IR")} سکه، لاگ مطالعه این کاربر را تا ۲۴ ساعت ببین.
      </p>
      {error && <p className="text-[#ba1a1a] text-[13px]">{error}</p>}
      <button
        onClick={handleUnlock}
        disabled={!canAfford || loading}
        className={`gamified-btn w-full py-3 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 ${
          canAfford ? "bg-[#4648d4] text-white shadow-lg shadow-[#4648d4]/20" : "bg-[#c7c4d7] text-[#767586] cursor-not-allowed"
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
  );
}
