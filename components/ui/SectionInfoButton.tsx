"use client";

import { useState } from "react";

interface Props {
  title: string;
  description: string;
  points?: string[];
  icon?: string;
  size?: "sm" | "md";
}

export default function SectionInfoButton({
  title,
  description,
  points,
  icon = "info",
  size = "md",
}: Props) {
  const [open, setOpen] = useState(false);

  const btnSize = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const iconSize = size === "sm" ? "text-[14px]" : "text-[16px]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`توضیحات ${title}`}
        className={`flex items-center justify-center ${btnSize} rounded-full text-on-surface-variant/70 hover:text-primary hover:bg-primary-fixed/60 transition-all active:scale-95`}
      >
        <span className={`material-symbols-outlined ${iconSize}`}>info</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 backdrop-blur-sm px-4 pt-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))]"
          onClick={() => setOpen(false)}
        >
          <div
            className="feed-item-enter glass-card w-full max-w-[420px] rounded-2xl p-5 shadow-2xl border border-outline-variant/30 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {icon}
                  </span>
                </div>
                <h3 className="text-[15px] font-extrabold text-on-surface">{title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
                aria-label="بستن"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-[13px] leading-6 text-on-surface-variant mb-3">
              {description}
            </p>

            {points && points.length > 0 && (
              <ul className="flex flex-col gap-2 mb-4">
                {points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[12.5px] leading-5 text-on-surface bg-surface-container/50 rounded-xl p-2.5">
                    <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="gamified-btn w-full bg-primary text-on-primary font-bold text-[14px] py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/15"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
}
