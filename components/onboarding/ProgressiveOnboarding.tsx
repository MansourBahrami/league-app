"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { enablePush } from "@/components/push/PushRegister";
import { captureClientError } from "@/lib/analytics-client";
import {
  ONBOARDING_HINTS,
  type OnboardingHint,
} from "@/lib/onboarding-hints";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type SetupStep = "push" | "install";

interface OnboardingContextValue {
  hasHint: (hint: OnboardingHint) => boolean;
  markHints: (...hints: OnboardingHint[]) => Promise<boolean>;
  reportStudyState: (active: boolean) => void;
  suppressSetup: () => void;
  resumeSetup: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useProgressiveOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useProgressiveOnboarding must be used inside ProgressiveOnboarding");
  return context;
}

interface SetupPromptDialogProps {
  step: SetupStep;
  busy: SetupStep | "dismiss" | null;
  feedback: string;
  showInstallHelp: boolean;
  onAction: () => void;
  onInstallHelpDone: () => void;
  onLater: () => void;
  onAcknowledge: () => void;
}

function SetupPromptDialog({
  step,
  busy,
  feedback,
  showInstallHelp,
  onAction,
  onInstallHelpDone,
  onLater,
  onAcknowledge,
}: SetupPromptDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const title = step === "push" ? "اعلان‌ها رو روشن کن" : "G-camp رو به صفحهٔ اصلی اضافه کن";
  const description = step === "push"
    ? "برای یادآوری زمان مطالعه و هدفت."
    : "سریع‌تر بازش کن و مستقیم به تایمر برس.";

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

  useEffect(() => {
    const focusTimer = window.setTimeout(() => primaryButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [feedback, showInstallHelp]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && busy === null) {
      event.preventDefault();
      if (feedback) onAcknowledge();
      else onLater();
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

  return (
    <div className="fixed inset-0 z-[78] flex items-end justify-center bg-on-surface/55 px-3 pb-[calc(5.75rem_+_env(safe-area-inset-bottom))] pt-16 backdrop-blur-[2px] sm:items-center sm:pb-4">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
        aria-describedby="setup-description"
        onKeyDown={handleKeyDown}
        className="glass-card w-full max-w-[480px] rounded-[2rem] border border-outline-variant/45 p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg ${step === "push" ? "bg-secondary-container text-on-secondary-container shadow-secondary/15" : "bg-primary text-on-primary shadow-primary/20"}`}>
            <span className="material-symbols-outlined text-[25px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {step === "push" ? "notifications_active" : "add_to_home_screen"}
            </span>
          </span>
          <div className="min-w-0 flex-1 text-right">
            <h2 id="setup-title" className="text-[19px] font-extrabold leading-8 text-on-surface">{title}</h2>
            <p id="setup-description" className="mt-1 text-[13px] leading-6 text-on-surface-variant">{description}</p>
          </div>
        </div>

        {feedback && (
          <p role="status" className="mt-4 rounded-xl bg-surface-container-high px-3 py-2.5 text-[12.5px] leading-6 text-on-surface-variant">
            {feedback}
          </p>
        )}

        {step === "install" && showInstallHelp && !feedback && (
          <div className="mt-4 rounded-xl bg-primary-fixed/65 p-3 text-[12.5px] leading-6 text-on-surface">
            {isIOS
              ? "در Safari بزن روی اشتراک‌گذاری ← Add to Home Screen"
              : "از منوی مرورگر، «نصب برنامه» را بزن."}
          </div>
        )}

        <div className="mt-5 grid gap-2">
          {feedback ? (
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={onAcknowledge}
              disabled={busy !== null}
              className="gamified-btn w-full rounded-xl bg-primary py-3.5 text-[14px] font-bold text-on-primary shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {busy === "dismiss" ? "در حال ثبت…" : "باشه"}
            </button>
          ) : step === "install" && showInstallHelp ? (
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={onInstallHelpDone}
              disabled={busy !== null}
              className="gamified-btn w-full rounded-xl bg-primary py-3.5 text-[14px] font-bold text-on-primary shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {busy === "install" ? "در حال ثبت…" : "انجام شد"}
            </button>
          ) : (
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={onAction}
              disabled={busy !== null}
              className="gamified-btn w-full rounded-xl bg-primary py-3.5 text-[14px] font-bold text-on-primary shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {busy === step
                ? (step === "push" ? "در حال فعال‌سازی…" : "در حال نصب…")
                : (step === "push" ? "فعال‌کردن اعلان‌ها" : "اضافه‌کردن")}
            </button>
          )}

          {!feedback && (
            <button
              type="button"
              onClick={onLater}
              disabled={busy !== null}
              className="w-full py-2 text-[13px] font-semibold text-on-surface-variant hover:text-on-surface disabled:opacity-50"
            >
              {busy === "dismiss" ? "در حال ثبت…" : "بعداً"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

interface Props {
  initialHints: string[];
  hasCompletedSession: boolean;
  initialSetupSnoozed: boolean;
  allowSetupPrompt: boolean;
  children: React.ReactNode;
}

export default function ProgressiveOnboarding({
  initialHints,
  hasCompletedSession,
  initialSetupSnoozed,
  allowSetupPrompt,
  children,
}: Props) {
  const [hints, setHints] = useState(() => new Set(initialHints));
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [busy, setBusy] = useState<SetupStep | "dismiss" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackShouldSnooze, setFeedbackShouldSnooze] = useState(false);
  const [lockedStep, setLockedStep] = useState<SetupStep | null>(null);
  const [studyActive, setStudyActive] = useState(false);
  const [studyStateKnown, setStudyStateKnown] = useState(false);
  const [setupSuppressed, setSetupSuppressed] = useState(false);
  const [setupSnoozed, setSetupSnoozed] = useState(initialSetupSnoozed);
  const [setupHandledThisVisit, setSetupHandledThisVisit] = useState(false);

  const hasHint = useCallback((hint: OnboardingHint) => hints.has(hint), [hints]);

  const markHints = useCallback(async (...nextHints: OnboardingHint[]) => {
    const unique = [...new Set(nextHints)].filter((hint) => !hints.has(hint));
    if (unique.length === 0) return true;

    setHints((current) => new Set([...current, ...unique]));
    if (unique.some((hint) => hint === ONBOARDING_HINTS.PUSH_PROMPTED || hint === ONBOARDING_HINTS.INSTALL_PROMPTED)) {
      setSetupSnoozed(false);
    }
    const response = await fetch("/api/onboarding/hints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hints: unique }),
    }).catch((caught) => {
      captureClientError("onboarding.hints", caught, { hints_count: unique.length });
      return null;
    });
    return !!response?.ok;
  }, [hints]);

  const reportStudyState = useCallback((active: boolean) => {
    setStudyActive(active);
    setStudyStateKnown(true);
  }, []);

  const suppressSetup = useCallback(() => setSetupSuppressed(true), []);
  const resumeSetup = useCallback(() => setSetupSuppressed(false), []);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  useEffect(() => {
    const installed = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const autoHints: OnboardingHint[] = [];
    if (installed && !hasHint(ONBOARDING_HINTS.INSTALL_PROMPTED)) autoHints.push(ONBOARDING_HINTS.INSTALL_PROMPTED);
    const pushGranted = typeof Notification !== "undefined"
      && Notification.permission === "granted"
      && !hasHint(ONBOARDING_HINTS.PUSH_PROMPTED);
    if (pushGranted) autoHints.push(ONBOARDING_HINTS.PUSH_PROMPTED);
    if (autoHints.length > 0) {
      void (async () => {
        if (pushGranted) await enablePush().catch((caught) => {
          captureClientError("onboarding.push_refresh", caught);
        });
        await markHints(...autoHints);
      })();
    }
  }, [hasHint, markHints]);

  const value = useMemo(
    () => ({ hasHint, markHints, reportStudyState, suppressSetup, resumeSetup }),
    [hasHint, markHints, reportStudyState, resumeSetup, suppressSetup],
  );
  const rewardsExplained = hasHint(ONBOARDING_HINTS.REWARDS_EXPLAINED);
  const pushHandled = hasHint(ONBOARDING_HINTS.PUSH_PROMPTED);
  const installHandled = hasHint(ONBOARDING_HINTS.INSTALL_PROMPTED);
  const activeSetupStep: SetupStep = lockedStep ?? (pushHandled ? "install" : "push");
  const showSetup = allowSetupPrompt
    && !setupSuppressed
    && !setupSnoozed
    && !setupHandledThisVisit
    && hasCompletedSession
    && rewardsExplained
    && studyStateKnown
    && !studyActive
    && (!pushHandled || !installHandled);

  function closeSetupForVisit() {
    setSetupHandledThisVisit(true);
    setFeedback("");
    setFeedbackShouldSnooze(false);
    setLockedStep(null);
    setShowInstallHelp(false);
  }

  async function postponeSetup() {
    setBusy("dismiss");
    const response = await fetch("/api/onboarding/setup-snooze", { method: "POST" }).catch((caught) => {
      captureClientError("onboarding.setup_snooze", caught);
      return null;
    });
    if (!response?.ok) {
      setFeedback("تعویق یادآوری ثبت نشد؛ دوباره تلاش کن.");
      setFeedbackShouldSnooze(true);
      setBusy(null);
      return;
    }
    setSetupSnoozed(true);
    setBusy(null);
    closeSetupForVisit();
  }

  async function requestPush() {
    setLockedStep("push");
    setBusy("push");
    setFeedback("");
    setFeedbackShouldSnooze(false);
    const result = await enablePush().catch(() => ({ ok: false as const, reason: "درخواست اعلان انجام نشد." }));
    const permission = typeof Notification === "undefined" ? "default" : Notification.permission;
    if (result.ok || permission === "denied" || permission === "granted") {
      await markHints(ONBOARDING_HINTS.PUSH_PROMPTED);
    } else {
      setFeedbackShouldSnooze(true);
    }
    setFeedback(result.ok ? "اعلان‌ها فعال شد." : (result.reason ?? "اعلان‌ها فعال نشد؛ بعداً دوباره امتحان کن."));
    setBusy(null);
  }

  async function requestInstall() {
    setLockedStep("install");
    setFeedback("");
    setFeedbackShouldSnooze(false);
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }

    setBusy("install");
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    setInstallPrompt(null);
    if (choice.outcome === "accepted") {
      await markHints(ONBOARDING_HINTS.INSTALL_PROMPTED);
      setFeedback("G-camp به صفحهٔ اصلی اضافه شد.");
    } else {
      setFeedbackShouldSnooze(true);
      setFeedback("نصب انجام نشد؛ ۷ روز دیگه دوباره یادآوری می‌کنیم.");
    }
    setBusy(null);
  }

  async function finishInstallHelp() {
    setBusy("install");
    await markHints(ONBOARDING_HINTS.INSTALL_PROMPTED);
    setBusy(null);
    closeSetupForVisit();
  }

  async function acknowledgeFeedback() {
    if (feedbackShouldSnooze) {
      await postponeSetup();
      return;
    }
    closeSetupForVisit();
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}

      {showSetup && (
        <SetupPromptDialog
          step={activeSetupStep}
          busy={busy}
          feedback={feedback}
          showInstallHelp={showInstallHelp}
          onAction={activeSetupStep === "push" ? requestPush : requestInstall}
          onInstallHelpDone={finishInstallHelp}
          onLater={postponeSetup}
          onAcknowledge={acknowledgeFeedback}
        />
      )}
    </OnboardingContext.Provider>
  );
}
