"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Mission {
  id: string;
  targetHours: number;
  entryCost: number;
  coinReward: number;
}

interface Props {
  mission: Mission;
  userCoins: number;
  isLocked: boolean;
  hasActiveDaily: boolean;
  disabled?: boolean; // ماموریت روزانه‌ی فعال (دیگری) دارد
}

export default function DailyMissionCard({ mission, userCoins, isLocked, hasActiveDaily }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFree = mission.entryCost === 0;
  const canBuy = !isLocked && !hasActiveDaily && userCoins >= mission.entryCost;

  async function handleBuy() {
    if (!canBuy) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/missions/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: mission.id }),
      });
      const data = await res.json();
      if (res.ok) router.refresh();
      else setError(data.error ?? "خطا");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-tertiary-fixed/50 text-tertiary rounded-full w-11 h-11 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>today</span>
          </div>
          <div className="text-right">
            <h3 className="text-[15px] font-extrabold text-on-surface leading-tight">{mission.targetHours.toLocaleString("fa-IR")} ساعت امروز</h3>
            <p className="text-[11px] text-on-surface-variant">هدف یک‌روزه</p>
          </div>
        </div>
        {isFree ? (
          <span className="text-[12px] font-bold text-tertiary bg-tertiary-fixed/60 px-2.5 py-1 rounded-full">رایگان</span>
        ) : (
          <div className="flex items-center gap-1 text-primary text-[15px] font-bold">
            <span>{mission.entryCost.toLocaleString("fa-IR")}</span>
            <span className="material-symbols-outlined text-tertiary-fixed-dim text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[13px] text-on-surface-variant mb-3">
        <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>redeem</span>
        <span>جایزه: <span className="font-bold text-tertiary">{mission.coinReward.toLocaleString("fa-IR")} سکه</span></span>
      </div>

      {error && <p className="text-[11px] text-error mb-2 text-right">{error}</p>}

      <button
        onClick={handleBuy}
        disabled={!canBuy || loading}
        className={`gamified-btn w-full py-2.5 rounded-xl text-[14px] font-bold transition-all ${
          canBuy ? "bg-secondary text-on-secondary" : "bg-surface-container text-on-surface-variant cursor-not-allowed"
        }`}
      >
        {loading
          ? "در حال ثبت..."
          : isLocked
          ? "قفل تا روز ششم"
          : hasActiveDaily
          ? "ماموریت روزانه‌ی فعال داری"
          : userCoins < mission.entryCost
          ? "سکه کافی نیست"
          : isFree
          ? "شروع رایگان"
          : "خرید و شروع"}
      </button>
    </div>
  );
}
