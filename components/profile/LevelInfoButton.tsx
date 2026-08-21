"use client";

import { useEffect, useRef, useState } from "react";
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
  nextLevel: {
    level: string;
    stars: number;
    studyNeeded: string | null;
    missingMedals: MedalReq[];
  } | null;
}

function requirementLabel(row: LevelRow): string {
  if (row.minXp === 0 && row.maxXp === 0) return "فقط با مدال";
  if (row.minXp === 0) return "شروع مسیر";
  return `از ${row.minXp.toLocaleString("fa-IR")} XP`;
}

function medalLabel(medal: MedalReq): string {
  return `${medal.count.toLocaleString("fa-IR")} مدال ${medal.hours.toLocaleString("fa-IR")} ساعته`;
}

export default function LevelInfoButton({ levels, currentLevel, currentStars, nextLevel }: Props) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  function openDialog() {
    setShowAll(false);
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setShowAll(false);
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
        onClick={openDialog}
        aria-label={`معرفی سطح ${currentLevel}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary-fixed px-3 py-1.5 text-primary transition-all hover:brightness-95 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="text-[13px] font-bold">{currentLevel}</span>
        <StarBadge stars={currentStars} total={3} size={16} framed={false} />
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closeDialog}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="level-dialog-title"
            aria-describedby="level-dialog-description"
            onKeyDown={handleDialogKeyDown}
            className="feed-item-enter w-full max-w-[420px] max-h-[82vh] overflow-y-auto bg-surface rounded-[24px] shadow-2xl border border-outline-variant/30 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* سربرگ چسبان */}
            <div className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-outline-variant/30 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-extrabold text-primary">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">trending_up</span>
                </span>
                <h3 id="level-dialog-title" className="text-[15px] font-extrabold text-on-surface">سطح و ارتقا</h3>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDialog}
                aria-label="بستن راهنمای سطح"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 flex flex-col gap-2">
              <p id="level-dialog-description" className="mb-1 text-right text-[12px] leading-relaxed text-on-surface-variant">
                با مطالعه XP بگیر. بعضی سطح‌ها مدال هم می‌خوان.
              </p>

              <section className="rounded-xl border border-primary/35 bg-primary-fixed p-3" aria-labelledby="current-level-title">
                <p id="current-level-title" className="mb-1 text-[10.5px] font-bold text-primary">سطح فعلی</p>
                <div className="flex items-center gap-1.5 text-[15px] font-bold text-on-surface">
                  <span>{currentLevel}</span>
                  <StarBadge stars={currentStars} total={3} size={14} />
                </div>
              </section>

              {nextLevel ? (
                <section className="rounded-xl border border-outline-variant/40 bg-surface-container p-3" aria-labelledby="next-level-title">
                  <p id="next-level-title" className="mb-1 text-[10.5px] font-bold text-on-surface-variant">مرحله بعد</p>
                  <div className="flex items-center gap-1.5 text-[15px] font-bold text-on-surface">
                    <span>{nextLevel.level}</span>
                    <StarBadge stars={nextLevel.stars} total={3} size={14} />
                  </div>
                  <p className="mt-1 text-[12px] font-semibold text-primary">
                    {nextLevel.studyNeeded ? `تا ارتقا: ${nextLevel.studyNeeded} مطالعه` : "XP لازم را داری"}
                  </p>
                  {nextLevel.missingMedals.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-on-surface-variant">مدال لازم:</span>
                      {nextLevel.missingMedals.map((medal) => (
                        <span key={medal.hours} className="rounded-full bg-tertiary-fixed/40 px-2 py-0.5 text-[11px] font-bold text-tertiary">
                          {medalLabel(medal)}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              ) : (
                <section className="rounded-xl border border-tertiary/30 bg-tertiary-fixed/30 p-3" aria-labelledby="highest-level-title">
                  <p id="highest-level-title" className="text-[12px] font-bold text-tertiary">به بالاترین سطح رسیدی.</p>
                </section>
              )}

              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                aria-expanded={showAll}
                aria-controls="all-levels-list"
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl py-2.5 text-[13px] font-bold text-primary transition-colors hover:bg-primary-fixed"
              >
                {showAll ? "بستن فهرست" : "همه سطح‌ها"}
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  {showAll ? "expand_less" : "expand_more"}
                </span>
              </button>

              {showAll && (
                <div id="all-levels-list" role="list" aria-label="همه سطح‌ها" className="flex flex-col gap-2 pt-1">
                  {levels.map((row) => {
                    const isCurrent = row.level === currentLevel && row.stars === currentStars;
                    const medals = row.requiredMedals[0] ?? [];
                    return (
                      <div
                        key={`${row.level}-${row.stars}`}
                        role="listitem"
                        className={`rounded-xl border p-3 ${
                          isCurrent
                            ? "border-primary/40 bg-primary-fixed"
                            : "border-outline-variant/30 bg-surface-container"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[14px] font-bold text-on-surface">
                            {row.level}
                            <StarBadge stars={row.stars} total={3} size={13} />
                          </span>
                          {isCurrent && (
                            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-on-primary">
                              سطح فعلی
                            </span>
                          )}
                        </div>
                        <p className="text-right text-[12px] font-semibold text-primary">{requirementLabel(row)}</p>
                        {medals.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-tertiary" aria-hidden="true">military_tech</span>
                            {medals.map((medal) => (
                              <span key={medal.hours} className="rounded-full bg-tertiary-fixed/40 px-2 py-0.5 text-[11px] font-bold text-tertiary">
                                {medalLabel(medal)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
