"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeDigits, normalizePhone } from "@/lib/phone";
import { captureClientError, captureProductEvent } from "@/lib/analytics-client";
import { toPersianDigits } from "@/lib/format";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) localStorage.setItem("referral_code", ref);
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setInterval(() => {
      setResendTimer((previous) => previous - 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendTimer]);

  useEffect(() => {
    if (step === "otp") otpInputRef.current?.focus();
  }, [step]);

  async function handleSendOtp(event?: React.FormEvent) {
    event?.preventDefault();
    setError("");

    const cleaned = normalizePhone(phone);
    if (!cleaned.startsWith("09") || cleaned.length !== 11) {
      setError("لطفاً یک شماره موبایل معتبر ۱۱ رقمی وارد کن.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });
      const data = await response.json();

      if (!response.ok) {
        captureProductEvent("otp_failed", { stage: "request", status: response.status });
        setError(data.error || "ارسال کد با خطا مواجه شد.");
        return;
      }

      if (data._dev_otp) setOtp(data._dev_otp);
      captureProductEvent("otp_requested", { resend: step === "otp" });
      setStep("otp");
      setResendTimer(60);
    } catch (caught) {
      captureProductEvent("otp_failed", { stage: "request", status: 0 });
      captureClientError("auth.otp_request", caught);
      setError("خطا در ارتباط با سرور. لطفاً اتصال اینترنت را بررسی کن.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const cleanedCode = normalizeDigits(otp).trim();
    if (!/^\d{6}$/.test(cleanedCode)) {
      setError("لطفاً کد ۶ رقمی دریافتی را کامل وارد کن.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(phone), code: cleanedCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        captureProductEvent("otp_failed", { stage: "verify", status: response.status });
        setError(data.error || "کد تأیید نادرست یا منقضی شده است.");
        return;
      }

      const ref = localStorage.getItem("referral_code");
      if (ref) {
        const referralResponse = await fetch("/api/friends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: ref }),
        }).catch((caught) => {
          captureClientError("auth.referral_attach", caught);
          return null;
        });
        // خطای موقت شبکه/سرور باعث از دست‌رفتن کد دعوت نمی‌شود.
        if (referralResponse?.ok || (referralResponse && referralResponse.status < 500)) {
          localStorage.removeItem("referral_code");
        }
      }

      router.push("/dashboard");
    } catch (caught) {
      captureProductEvent("otp_failed", { stage: "verify", status: 0 });
      captureClientError("auth.otp_verify", caught);
      setError("خطا در ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  }

  function editPhone() {
    setStep("phone");
    setOtp("");
    setError("");
  }

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-x-hidden bg-surface px-6 text-on-surface">
      <div aria-hidden="true" className="app-grid-background pointer-events-none fixed inset-0 z-0 opacity-[0.03]" />

      <main className="relative z-10 mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center py-10">
        <div className="glass-card relative flex flex-col items-center overflow-hidden rounded-xl p-5">
          <div className="absolute right-0 top-0 z-0 h-24 w-full bg-gradient-to-b from-tertiary-fixed to-transparent opacity-50" />

          <div className="relative z-10 flex w-full flex-col items-center">
            <header className="mb-6 mt-1 flex justify-center" aria-label="G-camp">
              <Image
                src="/brand/gcamp-logo.webp"
                alt="G-camp"
                width={440}
                height={220}
                priority
                className="h-auto w-[220px]"
              />
            </header>

            <section className="mb-7 text-center" aria-labelledby="login-title">
              <h1 id="login-title" className="font-display text-[32px] font-extrabold leading-tight text-primary">
                تنهایی درس نخون!
              </h1>
              <p className="mx-auto mt-3 max-w-[320px] text-[16px] leading-7 text-on-surface-variant">
                وقتی بقیه هم دارن میخونن، ادامه دادن آسون‌تره.
              </p>
            </section>

            <section className="w-full">
            {step === "phone" ? (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-3" noValidate>
                <p className="text-center text-[13px] font-semibold text-on-surface-variant">
                  برای ثبت‌نام شمارتو وارد کن
                </p>
              <div>
                <label htmlFor="phone-input" className="sr-only">
                  شماره موبایل
                </label>
                <div className="relative flex items-center">
                  <input
                    id="phone-input"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(normalizeDigits(event.target.value))}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    dir="ltr"
                    maxLength={11}
                    aria-describedby={error ? "login-error" : undefined}
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-4 text-center text-[17px] font-bold tracking-wider text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    required
                  />
                </div>
              </div>

              {error && (
                <p id="login-error" role="alert" className="rounded-xl bg-error-container/70 px-3 py-2 text-center text-[11.5px] font-semibold text-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="gamified-btn flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[14.5px] font-extrabold text-on-primary shadow-lg shadow-primary/15 transition active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? (
                  <span>در حال ارسال...</span>
                ) : (
                  <span>دریافت کد و شروع مطالعه</span>
                )}
              </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3" noValidate>
              <p className="text-center text-[12px] text-on-surface-variant">
                کد ارسال‌شده به <span className="font-bold text-primary" dir="ltr">{toPersianDigits(phone)}</span>
              </p>

              <div>
                <label htmlFor="otp-input" className="sr-only">
                  کد تأیید
                </label>
                <input
                  id="otp-input"
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) => setOtp(normalizeDigits(event.target.value))}
                  placeholder="------"
                  maxLength={6}
                  dir="ltr"
                  aria-describedby={error ? "login-error" : undefined}
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-4 text-center font-mono text-[22px] font-bold tracking-[0.55rem] text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  required
                />
              </div>

              {error && (
                <p id="login-error" role="alert" className="rounded-xl bg-error-container/70 px-3 py-2 text-center text-[11.5px] font-semibold text-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="gamified-btn flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[14.5px] font-extrabold text-on-primary shadow-lg shadow-primary/15 transition active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? (
                  <span>در حال بررسی...</span>
                ) : (
                  <span>ورود به G-camp</span>
                )}
              </button>

              <div className="flex items-center justify-between pt-1 text-[11.5px] font-bold">
                <button type="button" onClick={editPhone} className="text-primary hover:underline">
                  ویرایش شماره
                </button>
                {resendTimer > 0 ? (
                  <span className="font-medium text-on-surface-variant">
                    ارسال مجدد ({resendTimer.toLocaleString("fa-IR")})
                  </span>
                ) : (
                  <button type="button" onClick={() => handleSendOtp()} disabled={loading} className="text-tertiary hover:underline disabled:opacity-60">
                    ارسال مجدد کد
                  </button>
                )}
              </div>
              </form>
            )}
            </section>
          </div>
        </div>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-[390px] justify-center pb-5">
        <Image
          src="/brand/institute-logo.webp"
          alt="لوگوی مؤسسه مادر"
          width={172}
          height={128}
          className="h-[64px] w-auto opacity-90"
        />
      </footer>
    </div>
  );
}
