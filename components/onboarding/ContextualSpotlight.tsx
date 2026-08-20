"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useProgressiveOnboarding } from "@/components/onboarding/ProgressiveOnboarding";
import type { OnboardingHint } from "@/lib/onboarding-hints";

interface Props {
  hint: OnboardingHint;
  title: string;
  description: string;
  targetElementSelector: string;
  actionText?: string;
}

interface GuidePosition {
  left: number;
  bottom: number;
  arrowLeft: number;
}

export default function ContextualSpotlight({
  hint,
  title,
  description,
  targetElementSelector,
  actionText = "متوجه شدم",
}: Props) {
  const { hasHint, markHints, suppressSetup, resumeSetup } = useProgressiveOnboarding();
  const shouldShow = !hasHint(hint);
  const ownsOnboardingVisit = useRef(shouldShow);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<GuidePosition | null>(null);
  const [busy, setBusy] = useState(false);
  const guideReady = position !== null;

  const handleDismiss = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    await markHints(hint);
    setBusy(false);
  }, [busy, hint, markHints]);

  // اگر این راهنما در این بازدید فعال بوده، درخواست اعلان/نصب را تا خروج از صفحه نگه دار.
  useEffect(() => {
    if (!ownsOnboardingVisit.current) return;
    suppressSetup();
    return resumeSetup;
  }, [resumeSetup, suppressSetup]);

  useEffect(() => {
    if (!shouldShow) return;

    const target = document.querySelector<HTMLElement>(targetElementSelector);
    if (!target) return;

    const previousStyle = {
      boxShadow: target.style.boxShadow,
      outline: target.style.outline,
      outlineOffset: target.style.outlineOffset,
      transition: target.style.transition,
    };
    const previousDescribedBy = target.getAttribute("aria-describedby");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    target.style.transition = "box-shadow 220ms ease, outline-color 220ms ease";
    target.style.outline = "2px solid var(--color-tertiary)";
    target.style.outlineOffset = "3px";
    target.style.boxShadow = "inset 0 0 0 2px var(--color-tertiary-fixed-dim), 0 0 28px color-mix(in oklab, var(--color-tertiary) 55%, transparent)";
    target.setAttribute("aria-describedby", "contextual-spotlight-description");
    target.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
      inline: "nearest",
    });

    const updatePosition = () => {
      const rect = target.getBoundingClientRect();
      const viewportPadding = 16;
      const cardWidth = Math.min(340, window.innerWidth - viewportPadding * 2);
      const targetCenter = rect.left + rect.width / 2;
      const left = Math.max(
        viewportPadding,
        Math.min(targetCenter - cardWidth / 2, window.innerWidth - viewportPadding - cardWidth),
      );
      setPosition({
        left,
        bottom: Math.max(viewportPadding, window.innerHeight - rect.top + 18),
        arrowLeft: Math.max(24, Math.min(targetCenter - left, cardWidth - 24)),
      });
    };

    const positionTimer = window.setTimeout(updatePosition, reducedMotion ? 0 : 320);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.clearTimeout(positionTimer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      target.style.boxShadow = previousStyle.boxShadow;
      target.style.outline = previousStyle.outline;
      target.style.outlineOffset = previousStyle.outlineOffset;
      target.style.transition = previousStyle.transition;
      if (previousDescribedBy) target.setAttribute("aria-describedby", previousDescribedBy);
      else target.removeAttribute("aria-describedby");
    };
  }, [shouldShow, targetElementSelector]);

  useEffect(() => {
    if (!shouldShow || !guideReady) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusTimer = window.setTimeout(() => buttonRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      previouslyFocused?.focus();
    };
  }, [guideReady, shouldShow]);

  useEffect(() => {
    if (!shouldShow) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      event.preventDefault();
      void handleDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, handleDismiss, shouldShow]);

  if (!shouldShow || !position) return null;

  return createPortal(
    <aside
      role="dialog"
      aria-labelledby="contextual-spotlight-title"
      aria-describedby="contextual-spotlight-description"
      className="fixed z-[90] w-[calc(100vw-2rem)] max-w-[340px] rounded-2xl border border-tertiary/45 bg-surface p-4 text-right shadow-2xl pop-in"
      style={{ left: position.left, bottom: position.bottom }}
    >
      <h2 id="contextual-spotlight-title" className="text-[15px] font-extrabold text-on-surface">
        {title}
      </h2>
      <p id="contextual-spotlight-description" className="mt-1 text-[12.5px] leading-6 text-on-surface-variant">
        {description}
      </p>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleDismiss}
        disabled={busy}
        className="gamified-btn mt-3 rounded-xl bg-primary px-4 py-2.5 text-[12.5px] font-bold text-on-primary shadow-md shadow-primary/20 disabled:opacity-50"
      >
        {busy ? "در حال ثبت…" : actionText}
      </button>
      <span
        aria-hidden="true"
        className="material-symbols-outlined absolute -bottom-5 text-[26px] text-tertiary"
        style={{ left: position.arrowLeft, transform: "translateX(-50%)" }}
      >
        arrow_downward
      </span>
    </aside>,
    document.body,
  );
}
