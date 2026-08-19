"use client";

import { useState } from "react";

interface Props {
  title: string;
  description: string;
  points?: string[];
  icon?: string;
  className?: string;
}

export default function SectionInfoButton({
  title,
  description,
  points,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`توضیحات ${title}`}
        className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border border-outline/40 bg-surface-container-high/60 text-on-surface-variant/80 text-[11px] font-extrabold hover:bg-primary hover:text-on-primary hover:border-primary transition-all active:scale-90 select-none shrink-0 ${className}`}
      >
        !
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="feed-item-enter relative w-full max-w-[360px] rounded-[24px] border border-outline-variant/40 bg-surface p-5 shadow-2xl text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-extrabold text-primary">
                  !
                </span>
                <h3 className="text-[15px] font-extrabold text-on-surface truncate">{title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
                aria-label="بستن"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Description */}
            <p className="mt-3 text-[12.5px] leading-relaxed text-on-surface-variant">
              {description}
            </p>

            {/* Points */}
            {points && points.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {points.map((pt, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-xl bg-surface-container/70 p-2.5 text-[11.5px] leading-5 text-on-surface"
                  >
                    <span
                      className="material-symbols-outlined text-primary text-[15px] shrink-0 mt-0.5"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="gamified-btn mt-4 w-full rounded-xl bg-primary py-2.5 text-[13px] font-bold text-on-primary shadow-md shadow-primary/20"
            >
              حله، متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
}
