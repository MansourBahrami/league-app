"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import MiniAppAutoLogin from "@/components/auth/MiniAppAutoLogin";
import { normalizeDigits } from "@/lib/phone";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ذخیره کد دعوت از لینک (?ref=CODE) تا بعد از ورود اعمال شود
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) localStorage.setItem("referral_code", ref);
  }, []);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      if (data._dev_otp) setOtp(data._dev_otp);
      setStep("otp");
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      // اعمال کد دعوت ذخیره‌شده (در صورت وجود)
      const ref = localStorage.getItem("referral_code");
      if (ref) {
        await fetch("/api/friends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: ref }),
        }).catch(() => {});
        localStorage.removeItem("referral_code");
      }
      router.push("/dashboard");
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden">
      {/* Cyber grid background */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(to right, var(--color-primary) 1px, transparent 1px), linear-gradient(to bottom, var(--color-primary) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* اسکریپت WebApp تلگرام/بله برای احراز خودکار مینی‌اپ */}
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <Suspense fallback={null}>
        <MiniAppAutoLogin />
      </Suspense>

      <div className="glass-card w-full max-w-sm rounded-2xl p-8 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              school
            </span>
          </div>
          <h1 className="text-[24px] font-extrabold text-primary">اپ G-camp</h1>
          <p className="text-[14px] text-on-surface-variant mt-1">درس بخون، امتیاز بگیر و خودتو با رقبات مقایسه کن</p>
        </div>

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-on-surface">شماره موبایل</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(normalizeDigits(e.target.value))}
                placeholder="09123456789"
                dir="ltr"
                className="w-full rounded-xl border border-outline-variant bg-white/80 px-4 py-3 text-[16px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-center"
                required
              />
            </div>
            {error && <p className="text-error text-[14px] text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="gamified-btn w-full bg-primary text-white font-bold text-[16px] py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  ارسال کد تأیید
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-on-surface">کد تأیید ۶ رقمی</label>
              <p className="text-[13px] text-on-surface-variant">کد به شماره {phone} ارسال شد</p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(normalizeDigits(e.target.value))}
                placeholder="------"
                maxLength={6}
                dir="ltr"
                className="w-full rounded-xl border border-outline-variant bg-white/80 px-4 py-3 text-[24px] font-mono text-primary placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-center tracking-[0.5rem]"
                required
              />
            </div>
            {error && <p className="text-error text-[14px] text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="gamified-btn w-full bg-primary text-white font-bold text-[16px] py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    login
                  </span>
                  ورود به اپلیکیشن
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              className="text-[14px] text-primary hover:underline text-center"
            >
              تغییر شماره موبایل
            </button>
          </form>
        )}
      </div>

      {/* Material Symbols font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        rel="stylesheet"
      />
    </div>
  );
}
