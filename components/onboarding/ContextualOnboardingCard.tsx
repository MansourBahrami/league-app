"use client";

import { useState } from "react";
import { useProgressiveOnboarding } from "@/components/onboarding/ProgressiveOnboarding";
import type { OnboardingHint } from "@/lib/onboarding-hints";

interface Props {
  hint: OnboardingHint;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  points: string[];
}

export default function ContextualOnboardingCard({
  hint,
  eyebrow,
  title,
  description,
  icon,
  points,
}: Props) {
  const { hasHint, markHints } = useProgressiveOnboarding();
  const [busy, setBusy] = useState(false);
  if (hasHint(hint)) return null;

  async function dismiss() {
    setBusy(true);
    await markHints(hint);
    setBusy(false);
  }

  return (
    <aside className="glass-card rounded-2xl border border-primary/20 p-4 pop-in" aria-labelledby={`onboarding-${hint}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-md shadow-primary/20">
          <span className="material-symbols-outlined text-[23px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </span>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-[10.5px] font-extrabold text-tertiary">{eyebrow}</p>
          <h2 id={`onboarding-${hint}`} className="mt-0.5 text-[16px] font-extrabold text-on-surface">{title}</h2>
          <p className="mt-1 text-[12px] leading-6 text-on-surface-variant">{description}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {points.map((point, index) => (
          <div key={point} className="flex items-start gap-2 rounded-xl bg-surface-container-low px-2.5 py-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed text-[10px] font-extrabold text-tertiary">{(index + 1).toLocaleString("fa-IR")}</span>
            <p className="text-[11.5px] leading-5 text-on-surface-variant">{point}</p>
          </div>
        ))}
      </div>

      <button type="button" onClick={dismiss} disabled={busy} className="mt-3 w-full rounded-xl bg-primary py-2.5 text-[13px] font-bold text-on-primary disabled:opacity-50">
        {busy ? "در حال ثبت…" : "فهمیدم؛ نشونم بده"}
      </button>
    </aside>
  );
}
