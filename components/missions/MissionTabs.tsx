"use client";

import { useState } from "react";

type TabKey = "daily" | "weekly";

interface Props {
  daily: React.ReactNode;
  weekly: React.ReactNode;
  dailyCount: number;
  weeklyCount: number;
  /** تب پیش‌فرض (مثلاً وقتی ماموریت هفتگی هنوز قفل است، روی روزانه بماند) */
  defaultTab?: TabKey;
}

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "daily", label: "روزانه", icon: "today" },
  { key: "weekly", label: "هفتگی", icon: "star" },
];

export default function MissionTabs({ daily, weekly, dailyCount, weeklyCount, defaultTab = "daily" }: Props) {
  const [tab, setTab] = useState<TabKey>(defaultTab);
  const counts: Record<TabKey, number> = { daily: dailyCount, weekly: weeklyCount };

  return (
    <>
      {/* فیلتر دسته‌بندی ماموریت‌ها */}
      <div role="tablist" className="flex gap-1.5 bg-surface-container rounded-2xl p-1.5 mb-6">
        {TABS.map(({ key, label, icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
                active
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {icon}
              </span>
              {label}
              <span
                className={`text-[11px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${
                  active ? "bg-white/25 text-on-primary" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {counts[key].toLocaleString("fa-IR")}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel">{tab === "daily" ? daily : weekly}</div>
    </>
  );
}
