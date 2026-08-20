"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface Props {
  onDismiss: () => void;
}

interface GuidePosition {
  left: number;
  bottom: number;
  arrowLeft: number;
}

const TARGET_SELECTOR = '[data-tour="nav-rooms"]';

export default function Day2MissionModal({ onDismiss }: Props) {
  const router = useRouter();
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<GuidePosition | null>(null);
  const [busy, setBusy] = useState<"go" | "later" | null>(null);
  const [error, setError] = useState("");
  const guideReady = position !== null;

  const recordHandled = useCallback(async (): Promise<boolean> => {
    const response = await fetch("/api/onboarding/mission-prompt", { method: "POST" }).catch(() => null);
    if (response?.ok) return true;
    setError("پاسخت ثبت نشد؛ دوباره تلاش کن.");
    return false;
  }, []);

  const handleGoToRooms = useCallback(async () => {
    setBusy("go");
    setError("");
    const recorded = await recordHandled();
    if (!recorded) {
      setBusy(null);
      return;
    }
    onDismiss();
    router.push("/mission-rooms");
  }, [onDismiss, recordHandled, router]);

  const handleLater = useCallback(async () => {
    setBusy("later");
    setError("");
    const recorded = await recordHandled();
    if (!recorded) {
      setBusy(null);
      return;
    }
    onDismiss();
  }, [onDismiss, recordHandled]);

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(TARGET_SELECTOR);
    if (!target) return;
    const targetElement = target;

    const previousStyle = {
      boxShadow: targetElement.style.boxShadow,
      outline: targetElement.style.outline,
      outlineOffset: targetElement.style.outlineOffset,
      transition: targetElement.style.transition,
    };
    const previousDescribedBy = targetElement.getAttribute("aria-describedby");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    targetElement.style.transition = "box-shadow 220ms ease, outline-color 220ms ease";
    targetElement.style.outline = "2px solid var(--color-tertiary)";
    targetElement.style.outlineOffset = "3px";
    targetElement.style.boxShadow = "inset 0 0 0 2px var(--color-tertiary-fixed-dim), 0 0 28px color-mix(in oklab, var(--color-tertiary) 55%, transparent)";
    targetElement.setAttribute("aria-describedby", "mission-prompt-description");

    function updatePosition() {
      const rect = targetElement.getBoundingClientRect();
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
    }

    function handleTargetClick(event: Event) {
      event.preventDefault();
      void handleGoToRooms();
    }

    const positionTimer = window.setTimeout(updatePosition, reducedMotion ? 0 : 120);
    targetElement.addEventListener("click", handleTargetClick);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.clearTimeout(positionTimer);
      targetElement.removeEventListener("click", handleTargetClick);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      targetElement.style.boxShadow = previousStyle.boxShadow;
      targetElement.style.outline = previousStyle.outline;
      targetElement.style.outlineOffset = previousStyle.outlineOffset;
      targetElement.style.transition = previousStyle.transition;
      if (previousDescribedBy) targetElement.setAttribute("aria-describedby", previousDescribedBy);
      else targetElement.removeAttribute("aria-describedby");
    };
  }, [handleGoToRooms]);

  useEffect(() => {
    if (!guideReady) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusTimer = window.setTimeout(() => primaryButtonRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      previouslyFocused?.focus();
    };
  }, [guideReady]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape" || busy !== null) return;
      event.preventDefault();
      void handleLater();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, handleLater]);

  if (!position) return null;

  return createPortal(
    <aside
      role="dialog"
      aria-labelledby="mission-prompt-title"
      aria-describedby="mission-prompt-description"
      className="fixed z-[90] w-[calc(100vw-2rem)] max-w-[340px] rounded-2xl border border-tertiary/45 bg-surface p-4 text-right shadow-2xl pop-in"
      style={{ left: position.left, bottom: position.bottom }}
    >
      <h2 id="mission-prompt-title" className="text-[15px] font-extrabold text-on-surface">
        مأموریت بعدی‌ات رو انتخاب کن
      </h2>
      <p id="mission-prompt-description" className="mt-1 text-[12.5px] leading-6 text-on-surface-variant">
        کنار هم‌هدف‌هات درس بخون و با کامل‌کردن مأموریت جایزه بگیر.
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-error/10 px-3 py-2 text-[12px] text-error">
          {error}
        </p>
      )}

      <div className="mt-3 grid gap-1.5">
        <button
          ref={primaryButtonRef}
          type="button"
          onClick={handleGoToRooms}
          disabled={busy !== null}
          className="gamified-btn flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-bold text-on-primary shadow-md shadow-primary/20 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">meeting_room</span>
          {busy === "go" ? "در حال انتقال…" : "انتخاب مأموریت"}
        </button>
        <button
          type="button"
          onClick={handleLater}
          disabled={busy !== null}
          className="w-full py-2 text-[12.5px] font-semibold text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
        >
          {busy === "later" ? "در حال ثبت…" : "فردا یادآوری کن"}
        </button>
      </div>

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
