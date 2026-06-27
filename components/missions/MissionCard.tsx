"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Mission {
  id: string;
  targetHours: number;
  entryCost: number;
  xpReward: number;
  description: string | null;
}

interface Props {
  mission: Mission;
  userCoins: number;
  isLocked: boolean;
  hasActiveMission: boolean;
  userId: string;
}

export default function MissionCard({ mission, userCoins, isLocked, hasActiveMission, userId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const canBuy = !isLocked && !hasActiveMission && userCoins >= mission.entryCost;

  async function handleBuy() {
    if (!canBuy) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/missions/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: mission.id }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-[20px] border border-white/50 rounded-xl p-5 shadow-[0_4px_14px_color-mix(in_oklab,var(--color-primary)_7%,transparent)] flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full -mr-4 -mt-4" />
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="bg-primary-fixed text-primary rounded-full w-12 h-12 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[12px] text-on-surface-variant mb-1">سکه مورد نیاز</span>
            <div className="flex items-center gap-1 text-primary text-[17px] font-bold">
              <span>{mission.entryCost}</span>
              <span className="material-symbols-outlined text-tertiary-fixed-dim text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
            </div>
          </div>
        </div>
        <h3 className="text-[16px] font-bold text-on-surface mb-2">{mission.targetHours} ساعت مطالعه هفتگی</h3>
        {/* تقسیم به ۶ روز → ماموریت روزانه (روز ۷ استراحت/جبران) */}
        <div className="bg-surface-container rounded-xl p-2.5 mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_view_week</span>
          <p className="text-[12px] text-on-surface flex-1 text-right leading-snug">
            یعنی روزانه حدود <span className="font-bold text-primary">{(Math.round((mission.targetHours / 6) * 10) / 10).toLocaleString("fa-IR")} ساعت</span> · روز ۷ استراحت
          </p>
        </div>
        <div className="flex items-center gap-2 text-[14px] text-on-surface-variant mb-6">
          <span className="material-symbols-outlined text-sm">emoji_events</span>
          <span>پاداش: {mission.xpReward} XP + مدال اختصاصی</span>
        </div>
      </div>
      <button
        onClick={handleBuy}
        disabled={!canBuy || loading}
        className={`gamified-btn w-full py-3 rounded-xl text-[14px] font-bold transition-all ${
          canBuy ? "bg-primary text-white" : "bg-outline-variant text-outline cursor-not-allowed border-b-[#a0a0b0]"
        }`}
      >
        {loading ? "در حال خرید..." : isLocked ? "قفل تا روز ششم" : hasActiveMission ? "ماموریت فعال دارید" : userCoins < mission.entryCost ? "سکه کافی نیست" : "خرید ماموریت"}
      </button>
    </div>
  );
}
