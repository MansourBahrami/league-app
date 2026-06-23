"use client";

import { useState } from "react";
import StarBadge from "@/components/ui/StarBadge";

interface MedalReq {
  hours: number;
  count: number;
}

export interface LevelRow {
  level: string;
  stars: number;
  minXp: number;
  maxXp: number;
  /** OR-of-AND؛ طبق جدول فعلی فقط یک گروه «و» دارد */
  requiredMedals: MedalReq[][];
}

interface Props {
  levels: LevelRow[];
  currentLevel: string;
  currentStars: number;
}

function xpLabel(row: LevelRow): string {
  if (row.minXp === 0 && row.maxXp === 0) return "بدون شرط XP (فقط مدال)";
  if (row.maxXp >= 99999) return `${row.minXp.toLocaleString("fa-IR")} XP به بالا`;
  return `${row.minXp.toLocaleString("fa-IR")} تا ${row.maxXp.toLocaleString("fa-IR")} XP`;
}

export default function LevelInfoButton({ levels, currentLevel, currentStars }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="راهنمای سطح‌ها"
        className="flex items-center justify-center w-6 h-6 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">info</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pt-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))]"
          onClick={() => setOpen(false)}
        >
          <div
            className="feed-item-enter w-full max-w-[440px] max-h-[82vh] overflow-y-auto bg-surface rounded-2xl shadow-2xl border border-outline-variant/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* سربرگ چسبان */}
            <div className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-outline-variant/30 px-4 py-3 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  workspace_premium
                </span>
                سطح‌ها و شرایط ارتقا
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن"
                className="flex items-center justify-center w-8 h-8 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 flex flex-col gap-2">
              <p className="text-[12px] text-on-surface-variant text-right leading-relaxed mb-1">
                با مطالعه XP می‌گیری و سطح‌ت بالا می‌ره. برای بعضی سطح‌ها علاوه بر XP، مدال‌های مطالعه هم لازمه.
              </p>

              {levels.map((row) => {
                const isCurrent = row.level === currentLevel && row.stars === currentStars;
                const medals = row.requiredMedals[0] ?? [];
                return (
                  <div
                    key={`${row.level}-${row.stars}`}
                    className={`rounded-xl p-3 border transition-colors ${
                      isCurrent
                        ? "bg-primary-fixed border-primary/40"
                        : "bg-surface-container border-outline-variant/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[14px] font-bold text-on-surface flex items-center gap-1.5">
                        {row.level}
                        <StarBadge stars={row.stars} total={3} size={13} />
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-on-primary bg-primary px-2 py-0.5 rounded-full shrink-0">
                          سطح فعلی تو
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-semibold text-primary text-right">{xpLabel(row)}</p>
                    {medals.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <span className="material-symbols-outlined text-[14px] text-tertiary">military_tech</span>
                        {medals.map((m) => (
                          <span
                            key={m.hours}
                            className="text-[11px] font-bold text-tertiary bg-tertiary-fixed/40 px-2 py-0.5 rounded-full"
                          >
                            {m.count.toLocaleString("fa-IR")}× مدال {m.hours.toLocaleString("fa-IR")} ساعته
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
