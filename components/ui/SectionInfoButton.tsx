"use client";

import { useEffect, useId, useRef, useState } from "react";

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
  icon = "info",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  function closeDialog() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
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
        className={`inline-flex h-[32px] w-[32px] shrink-0 select-none items-center justify-center rounded-full border border-outline/30 bg-surface-container-high/70 text-on-surface-variant transition-all hover:border-primary hover:bg-primary hover:text-on-primary active:scale-95 ${className}`}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-on-surface/60 backdrop-blur-sm p-4"
          onClick={closeDialog}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onKeyDown={handleDialogKeyDown}
            className="feed-item-enter relative w-full max-w-[360px] rounded-[24px] border border-outline-variant/40 bg-surface p-5 shadow-2xl text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[17px]" aria-hidden="true">{icon}</span>
                </span>
                <h3 id={titleId} className="text-[15px] font-extrabold text-on-surface truncate">{title}</h3>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDialog}
                className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
                aria-label={`بستن ${title}`}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
              </button>
            </div>

            {/* Description */}
            <p id={descriptionId} className="mt-3 text-[12.5px] leading-relaxed text-on-surface-variant">
              {description}
            </p>

            {/* Points */}
            {points && points.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {points.map((pt, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 rounded-xl bg-surface-container/70 p-2.5 text-[11.5px] leading-5 text-on-surface"
                  >
                    <span
                      className="material-symbols-outlined text-primary text-[15px] shrink-0 mt-0.5"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Action */}
            <button
              type="button"
              onClick={closeDialog}
              className="gamified-btn mt-4 w-full rounded-xl bg-primary py-2.5 text-[13px] font-bold text-on-primary shadow-md shadow-primary/20"
            >
              فهمیدم
            </button>
          </div>
        </div>
      )}
    </>
  );
}
