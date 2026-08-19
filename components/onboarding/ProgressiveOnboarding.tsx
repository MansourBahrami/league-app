"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { enablePush } from "@/components/push/PushRegister";
import {
  ONBOARDING_HINTS,
  type OnboardingHint,
} from "@/lib/onboarding-hints";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface OnboardingContextValue {
  hasHint: (hint: OnboardingHint) => boolean;
  markHints: (...hints: OnboardingHint[]) => Promise<boolean>;
  reportStudyState: (active: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useProgressiveOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useProgressiveOnboarding must be used inside ProgressiveOnboarding");
  return context;
}

interface Props {
  initialHints: string[];
  hasCompletedSession: boolean;
  allowSetupPrompt: boolean;
  children: React.ReactNode;
}

export default function ProgressiveOnboarding({
  initialHints,
  hasCompletedSession,
  allowSetupPrompt,
  children,
}: Props) {
  const router = useRouter();
  const [hints, setHints] = useState(() => new Set(initialHints));
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [busy, setBusy] = useState<"push" | "install" | "dismiss" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [studyActive, setStudyActive] = useState(false);
  const [studyStateKnown, setStudyStateKnown] = useState(false);

  const hasHint = useCallback((hint: OnboardingHint) => hints.has(hint), [hints]);

  const markHints = useCallback(async (...nextHints: OnboardingHint[]) => {
    const unique = [...new Set(nextHints)].filter((hint) => !hints.has(hint));
    if (unique.length === 0) return true;

    setHints((current) => new Set([...current, ...unique]));
    const response = await fetch("/api/onboarding/hints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hints: unique }),
    }).catch(() => null);
    return !!response?.ok;
  }, [hints]);

  const reportStudyState = useCallback((active: boolean) => {
    setStudyActive(active);
    setStudyStateKnown(true);
  }, []);

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
        if (pushGranted) await enablePush().catch(() => null);
        await markHints(...autoHints);
      })();
    }
  }, [hasHint, markHints]);

  const value = useMemo(() => ({ hasHint, markHints, reportStudyState }), [hasHint, markHints, reportStudyState]);
  const rewardsExplained = hasHint(ONBOARDING_HINTS.REWARDS_EXPLAINED);
  const pushHandled = hasHint(ONBOARDING_HINTS.PUSH_PROMPTED);
  const installHandled = hasHint(ONBOARDING_HINTS.INSTALL_PROMPTED);
  const showSetup = allowSetupPrompt
    && hasCompletedSession
    && rewardsExplained
    && studyStateKnown
    && !studyActive
    && (!pushHandled || !installHandled);

  async function requestPush() {
    setBusy("push");
    setFeedback("");
    const result = await enablePush().catch(() => ({ ok: false as const, reason: "درخواست نوتیفیکیشن انجام نشد" }));
    await markHints(ONBOARDING_HINTS.PUSH_PROMPTED);
    setFeedback(result.ok ? "اعلان‌ها فعال شد." : (result.reason ?? "اعلان‌ها فعال نشد؛ بعداً از پروفایل می‌تونی دوباره امتحان کنی."));
    setBusy(null);
    if (installHandled) router.refresh();
  }

  async function requestInstall() {
    setFeedback("");
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }

    setBusy("install");
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    await markHints(ONBOARDING_HINTS.INSTALL_PROMPTED);
    setInstallPrompt(null);
    setFeedback(choice.outcome === "accepted" ? "G-camp به صفحهٔ اصلی اضافه شد." : "هر وقت خواستی می‌تونی از منوی مرورگر نصبش کنی.");
    setBusy(null);
    if (pushHandled) router.refresh();
  }

  async function finishInstallHelp() {
    setBusy("install");
    await markHints(ONBOARDING_HINTS.INSTALL_PROMPTED);
    setBusy(null);
    if (pushHandled) router.refresh();
  }

  async function dismissSetup() {
    setBusy("dismiss");
    const remaining: OnboardingHint[] = [];
    if (!pushHandled) remaining.push(ONBOARDING_HINTS.PUSH_PROMPTED);
    if (!installHandled) remaining.push(ONBOARDING_HINTS.INSTALL_PROMPTED);
    await markHints(...remaining);
    setBusy(null);
    router.refresh();
  }

  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <OnboardingContext.Provider value={value}>
      {children}

      {showSetup && (
        <div className="fixed inset-0 z-[78] flex items-end justify-center bg-on-surface/55 px-3 pb-[calc(5.75rem_+_env(safe-area-inset-bottom))] pt-16 backdrop-blur-[2px] sm:items-center sm:pb-4">
          <section role="dialog" aria-modal="true" aria-labelledby="setup-title" className="glass-card w-full max-w-[480px] rounded-[2rem] border border-outline-variant/45 p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-[25px]" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
              </span>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[11px] font-bold text-tertiary">بعد از اولین جلسه</p>
                <h2 id="setup-title" className="mt-0.5 text-[19px] font-extrabold text-on-surface">G-camp رو برای برگشتن آماده کن</h2>
                <p className="mt-1 text-[12.5px] leading-6 text-on-surface-variant">این دو مورد اختیاری‌اند و هر زمان از پروفایل قابل تغییرند.</p>
              </div>
            </div>

            {feedback && <p role="status" className="mt-3 rounded-xl bg-surface-container-high px-3 py-2 text-[12px] text-on-surface-variant">{feedback}</p>}

            <div className="mt-4 grid gap-2.5">
              {!pushHandled && (
                <div className="rounded-2xl border border-outline-variant/55 bg-surface-container-lowest/75 p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
                      <span className="material-symbols-outlined text-[21px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
                    </span>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-[14px] font-extrabold text-on-surface">یادآوری مطالعه و زنجیره</p>
                      <p className="mt-0.5 text-[11.5px] leading-5 text-on-surface-variant">فقط برای اتفاق‌های مهم؛ مثل زمان مطالعه یا جلو زدن رقیب.</p>
                    </div>
                    <button type="button" onClick={requestPush} disabled={busy !== null} className="shrink-0 rounded-xl bg-primary px-3 py-2 text-[12px] font-bold text-on-primary disabled:opacity-50">
                      {busy === "push" ? "…" : "فعال کن"}
                    </button>
                  </div>
                </div>
              )}

              {!installHandled && (
                <div className="rounded-2xl border border-outline-variant/55 bg-surface-container-lowest/75 p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-fixed/55 text-tertiary">
                      <span className="material-symbols-outlined text-[21px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_to_home_screen</span>
                    </span>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-[14px] font-extrabold text-on-surface">اضافه به صفحهٔ اصلی</p>
                      <p className="mt-0.5 text-[11.5px] leading-5 text-on-surface-variant">مثل یک اپ بازش کن و سریع‌تر به تایمر برگرد.</p>
                    </div>
                    <button type="button" onClick={requestInstall} disabled={busy !== null} className="shrink-0 rounded-xl border border-primary px-3 py-2 text-[12px] font-bold text-primary disabled:opacity-50">
                      {busy === "install" ? "…" : installPrompt ? "نصب" : "راهنما"}
                    </button>
                  </div>

                  {showInstallHelp && (
                    <div className="mt-3 rounded-xl bg-primary-fixed/65 p-3 text-[12px] leading-6 text-on-surface">
                      {isIOS
                        ? "در Safari روی دکمهٔ اشتراک‌گذاری بزن و «Add to Home Screen» را انتخاب کن."
                        : "منوی مرورگر را باز کن و «نصب برنامه» یا «افزودن به صفحهٔ اصلی» را بزن."}
                      <button type="button" onClick={finishInstallHelp} disabled={busy !== null} className="mt-2 block w-full rounded-lg bg-primary py-2 font-bold text-on-primary disabled:opacity-50">متوجه شدم</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button type="button" onClick={dismissSetup} disabled={busy !== null} className="mt-3 w-full py-2 text-[12.5px] font-semibold text-on-surface-variant hover:text-on-surface disabled:opacity-50">
              {busy === "dismiss" ? "در حال ثبت…" : "فعلاً نه"}
            </button>
          </section>
        </div>
      )}
    </OnboardingContext.Provider>
  );
}
