"use client";

import { useState } from "react";
import { useProgressiveOnboarding } from "@/components/onboarding/ProgressiveOnboarding";
import type { OnboardingHint } from "@/lib/onboarding-hints";

interface Props {
  hint: OnboardingHint;
  eyebrow?: string;
  title: string;
  description: string;
  icon?: string;
  actionText?: string;
  points?: string[];
  targetElementSelector?: string;
  onAction?: () => void;
}

export default function ActionGuidanceModal({
  hint,
  eyebrow = "راهنمای اقدام",
  title,
  description,
  icon = "ads_click",
  actionText = "بزن بریم!",
  points,
  targetElementSelector,
  onAction,
}: Props) {
  const { hasHint, markHints } = useProgressiveOnboarding();
  const [busy, setBusy] = useState(false);

  if (hasHint(hint)) return null;

  async function handleDismiss() {
    setBusy(true);
    await markHints(hint);
    setBusy(false);

    if (onAction) {
      onAction();
    }

    if (targetElementSelector) {
      const el = document.querySelector(targetElementSelector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="feed-item-enter relative w-full max-w-[360px] rounded-[24px] border border-outline-variant/40 bg-surface p-5 shadow-2xl text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with animated icon */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary shadow-md shadow-primary/25">
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {icon}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold text-tertiary">{eyebrow}</p>
              <h3 className="text-[16px] font-extrabold text-on-surface leading-tight mt-0.5 truncate">
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={busy}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
            aria-label="بستن"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Description */}
        <p className="mt-3 text-[13px] leading-relaxed text-on-surface-variant">
          {description}
        </p>

        {/* Points list */}
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

        {/* Action Button */}
        <button
          type="button"
          onClick={handleDismiss}
          disabled={busy}
          className="gamified-btn mt-4 w-full rounded-xl bg-primary py-2.5 text-[13px] font-bold text-on-primary shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {busy ? (
            "در حال ثبت…"
          ) : (
            <>
              <span>{actionText}</span>
              <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
