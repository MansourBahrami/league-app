"use client";

import { useEffect, useRef, useState } from "react";
import { gradeRequiresField, STUDENT_GRADES, STUDY_FIELDS } from "@/lib/student-profile";
import { captureClientError } from "@/lib/analytics-client";

interface Props {
  onComplete: () => void;
  /** برای سازگاری با فراخوان‌های قبلی؛ شماره از ورود OTP موجود است و در فرم پرسیده نمی‌شود. */
  hasPhone?: boolean;
}

type Stage = "grade" | "field";

export default function LeadCaptureModal({ onComplete }: Props) {
  const [stage, setStage] = useState<Stage>("grade");
  const [grade, setGrade] = useState("");
  const [field, setField] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstGradeRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const canFinishFromGrade = !!grade && !gradeRequiresField(grade);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstGradeRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    if (stage !== "field") return;
    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [stage]);

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
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

  async function saveProfile() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade,
          field: gradeRequiresField(grade) ? field : null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.isLeadComplete) {
        setError(data.error ?? "ذخیره اطلاعات انجام نشد؛ دوباره تلاش کن.");
        return;
      }
      onComplete();
    } catch (caught) {
      captureClientError("onboarding.lead_capture", caught);
      setError("ذخیره اطلاعات انجام نشد؛ دوباره تلاش کن.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!grade) {
      setError("پایه‌ات رو انتخاب کن.");
      return;
    }
    if (stage === "grade" && gradeRequiresField(grade)) {
      setError("");
      setStage("field");
      return;
    }
    if (gradeRequiresField(grade) && !field) {
      setError("رشته‌ات رو انتخاب کن.");
      return;
    }
    await saveProfile();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-on-surface/55 px-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-setup-title"
        aria-describedby="profile-setup-description"
        onKeyDown={handleDialogKeyDown}
        className="glass-card relative w-full max-w-[500px] rounded-2xl p-6 pb-8"
      >
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-3xl text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              {stage === "field" ? "menu_book" : "school"}
            </span>
          </div>
          {stage === "field" && <p className="mb-1 text-[11px] font-bold text-tertiary">مرحلهٔ آخر</p>}
          <h2 id="profile-setup-title" className="text-center text-[22px] font-extrabold text-on-surface">
            {stage === "field" ? "رشته‌ات چیه؟" : "کدوم پایه‌ای؟"}
          </h2>
          <p id="profile-setup-description" className="mt-1 text-center text-[13px] leading-6 text-on-surface-variant">
            {stage === "field"
              ? `برای پایهٔ ${grade}، رشته‌ات رو هم انتخاب کن.`
              : "تا رقابت‌ها و مأموریت‌های مناسب‌تری ببینی."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {stage === "grade" ? (
            <fieldset>
              <legend className="sr-only">انتخاب پایه تحصیلی</legend>
              <div className="grid grid-cols-3 gap-2">
                {STUDENT_GRADES.map((option, index) => (
                  <button
                    key={option}
                    ref={index === 0 ? firstGradeRef : undefined}
                    type="button"
                    aria-pressed={grade === option}
                    onClick={() => {
                      setGrade(option);
                      if (!gradeRequiresField(option)) setField("");
                      setError("");
                    }}
                    className={`min-h-11 rounded-xl border px-2 py-2.5 text-[13px] font-semibold transition-all ${
                      grade === option
                        ? "scale-[1.02] border-primary bg-primary text-on-primary shadow-md"
                        : "border-outline-variant bg-surface-container-lowest/65 text-on-surface-variant hover:bg-primary-fixed"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <fieldset>
              <legend className="sr-only">انتخاب رشته تحصیلی</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STUDY_FIELDS.map((option, index) => (
                  <button
                    key={option}
                    ref={index === 0 ? firstFieldRef : undefined}
                    type="button"
                    aria-pressed={field === option}
                    onClick={() => {
                      setField(option);
                      setError("");
                    }}
                    className={`min-h-11 rounded-xl border px-2 py-2.5 text-[13px] font-semibold transition-all ${
                      field === option
                        ? "scale-[1.02] border-primary bg-primary text-on-primary shadow-md"
                        : "border-outline-variant bg-surface-container-lowest/65 text-on-surface-variant hover:bg-primary-fixed"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {error && <p role="alert" className="text-center text-[13px] text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="gamified-btn mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-[16px] font-bold text-on-primary shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                در حال ذخیره…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {stage === "field" || canFinishFromGrade ? "check_circle" : "arrow_back"}
                </span>
                {stage === "field" || canFinishFromGrade ? "ذخیره و ادامه" : "ادامه"}
              </>
            )}
          </button>

          {stage === "field" && (
            <button
              type="button"
              onClick={() => {
                setStage("grade");
                setError("");
              }}
              className="w-full py-1 text-center text-[13px] font-semibold text-primary hover:underline"
            >
              تغییر پایه
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
