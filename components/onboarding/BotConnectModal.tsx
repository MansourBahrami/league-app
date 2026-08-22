"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Messenger = "telegram" | "bale";

interface Props {
  available: { telegram: boolean; bale: boolean };
  onComplete: () => void;
  onDismiss: () => void;
}

export default function BotConnectModal({ available, onComplete, onDismiss }: Props) {
  const [loading, setLoading] = useState<Messenger | "dismiss" | null>(null);
  const [error, setError] = useState("");
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const hasBothMessengers = available.telegram && available.bale;
  const title = hasBothMessengers
    ? "یادآوری‌ها رو در پیام‌رسان بگیر"
    : available.bale
      ? "یادآوری‌ها رو در بله بگیر"
      : "یادآوری‌ها رو در تلگرام بگیر";

  const refreshStatus = useCallback(async () => {
    const res = await fetch("/api/profile/bot-link", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return false;
    const data = (await res.json()) as { telegram?: boolean; bale?: boolean };
    if (data.telegram || data.bale) {
      onComplete();
      return true;
    }
    return false;
  }, [onComplete]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    initialFocusRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  // بررسی وضعیت با تغییر فوکوس یا برگشت کاربر به مرورگر
  useEffect(() => {
    const onReturn = () => {
      void refreshStatus();
      // در صورت بازگشت کاربر، اگر هنوز متصل نشده بود وضعیت loading را ریست کن تا دکمه قفل نماند
      window.setTimeout(() => {
        setLoading((curr) => (curr === "dismiss" ? curr : null));
      }, 1500);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onReturn();
    };

    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshStatus]);

  // پولینگ دوره‌ای تا زمان اتصال (هر ۲ ثانیه)
  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshStatus();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [refreshStatus]);

  async function connect(messenger: Messenger) {
    setLoading(messenger);
    setError("");
    const res = await fetch("/api/profile/bot-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messenger }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { url?: string; error?: string } | undefined;
    if (!res?.ok || !data?.url) {
      setError(data?.error ?? "ساخت لینک اتصال انجام نشد؛ دوباره تلاش کن.");
      setLoading(null);
      return;
    }
    window.location.assign(data.url);
  }

  async function dismiss() {
    setLoading("dismiss");
    await fetch("/api/profile/bot-link", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismiss: true }),
    }).catch(() => null);
    onDismiss();
  }

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onKeyDown={(event) => {
        if (event.key === "Escape" && loading === null) void dismiss();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bot-connect-title"
        aria-describedby="bot-connect-description"
        className="glass-card w-full max-w-[460px] rounded-2xl p-6 text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/25">
          <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
        </div>
        <h2 id="bot-connect-title" className="text-[21px] font-extrabold text-on-surface">{title}</h2>
        <p id="bot-connect-description" className="mt-2 text-[14px] leading-7 text-on-surface-variant">
          برای زمان مطالعه، مأموریت‌ها و حفظ زنجیره.
        </p>

        <div className="mt-5 grid gap-3">
          {available.telegram && (
            <button ref={initialFocusRef} type="button" onClick={() => connect("telegram")} disabled={loading !== null} className="gamified-btn flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[15px] font-bold text-on-primary disabled:opacity-60">
              <span className="material-symbols-outlined text-[20px]">send</span>
              {loading === "telegram" ? "در حال آماده‌سازی…" : "اتصال تلگرام"}
            </button>
          )}
          {available.bale && (
            <button ref={available.telegram ? undefined : initialFocusRef} type="button" onClick={() => connect("bale")} disabled={loading !== null} className="gamified-btn flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-[15px] font-bold text-on-secondary disabled:opacity-60">
              <span className="material-symbols-outlined text-[20px]">forum</span>
              {loading === "bale" ? "در حال آماده‌سازی…" : "اتصال بله"}
            </button>
          )}
        </div>

        {!available.telegram && !available.bale && (
          <p className="mt-4 rounded-xl bg-error/10 p-3 text-[13px] text-error">ربات‌ها هنوز روی سرور پیکربندی نشده‌اند.</p>
        )}
        {error && <p role="alert" className="mt-3 text-[13px] text-error">{error}</p>}

        <button type="button" onClick={dismiss} disabled={loading !== null} className="mt-4 text-[13px] font-semibold text-on-surface-variant hover:text-on-surface disabled:opacity-50">
          {loading === "dismiss" ? "در حال ثبت…" : "بعداً"}
        </button>
      </section>
    </div>
  );
}
