"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  onDismiss: () => void;
}

export default function Day2MissionModal({ onDismiss }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState<"go" | "later" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => primaryButtonRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && busy === null) {
      event.preventDefault();
      void handleLater();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function recordHandled(): Promise<boolean> {
    const response = await fetch("/api/onboarding/mission-prompt", { method: "POST" }).catch(() => null);
    if (response?.ok) return true;
    setError("ثبت انتخاب انجام نشد؛ دوباره تلاش کن.");
    return false;
  }

  async function handleGoToRooms() {
    setBusy("go");
    setError("");
    const recorded = await recordHandled();
    if (!recorded) {
      setBusy(null);
      return;
    }
    onDismiss();
    router.push("/mission-rooms");
  }

  async function handleLater() {
    setBusy("later");
    setError("");
    const recorded = await recordHandled();
    if (!recorded) {
      setBusy(null);
      return;
    }
    onDismiss();
  }

  return (
    <div className="fixed inset-0 z-[82] flex items-center justify-center bg-on-surface/55 px-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-prompt-title"
        aria-describedby="mission-prompt-description"
        onKeyDown={handleKeyDown}
        className="glass-card w-full max-w-[460px] rounded-2xl p-6 text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-tertiary-container text-on-tertiary-container shadow-lg shadow-tertiary/25">
          <span className="material-symbols-outlined text-[34px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            flag
          </span>
        </div>
        <h2 id="mission-prompt-title" className="text-[20px] font-extrabold text-on-surface">اولین مأموریتت رو انتخاب کن</h2>
        <p id="mission-prompt-description" className="mt-2 text-[14px] leading-7 text-on-surface-variant">
          هدفت رو مشخص کن و کنار دانش‌آموزهای هم‌هدف درس بخون.
        </p>

        {error && <p role="alert" className="mt-4 rounded-xl bg-error/10 px-3 py-2 text-[12.5px] text-error">{error}</p>}

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={handleGoToRooms}
            disabled={busy !== null}
            className="gamified-btn flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[15px] font-bold text-on-primary shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">meeting_room</span>
            {busy === "go" ? "در حال انتقال…" : "انتخاب مأموریت"}
          </button>
          <button
            type="button"
            onClick={handleLater}
            disabled={busy !== null}
            className="w-full py-2.5 text-[13px] font-semibold text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
          >
            {busy === "later" ? "در حال ثبت…" : "الان انتخاب نمی‌کنم"}
          </button>
        </div>
      </div>
    </div>
  );
}
