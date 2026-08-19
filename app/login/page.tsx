"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { normalizeDigits, normalizePhone } from "@/lib/phone";

type Step = "phone" | "otp";

const VALUE_PROPS = [
  {
    icon: "timer",
    badge: "تایمر ضد حواس‌پرتی",
    title: "هر ۱۵ دقیقه مطالعه = ۱ XP + ۱ سکه",
    desc: "زمان واقعی تمرکزت رو با تایمر هوشمند ثبت کن و برای هر دقیقه تلاش، پاداش سروری و امتیاز واقعی بگیر.",
    gradient: "from-primary/15 to-primary/5",
    iconBg: "bg-primary text-on-primary",
  },
  {
    icon: "leaderboard",
    badge: "لیگ و رده‌بندی کشوری",
    title: "با هم‌سطح‌های خودت در سراسر ایران رقابت کن",
    desc: "رده‌بندی عادلانه بر اساس امتیاز ۷ روز اخیر. با بچه‌های هم‌پایه رقابت کن یا رفقات رو به مسابقه اختصاصی دعوت کن.",
    gradient: "from-secondary/15 to-secondary/5",
    iconBg: "bg-secondary text-on-secondary",
  },
  {
    icon: "military_tech",
    badge: "اتاق مأموریت و مدال‌ها",
    title: "هدف‌گذاری کن، مدال بگیر و سطحت رو بالا ببر",
    desc: "مأموریت‌های روزانه و هفتگی بردار، با هم‌هدف‌هات درس بخون و با گرفتن مدال‌های افتخار ستاره‌دار شو.",
    gradient: "from-tertiary/20 to-tertiary/5",
    iconBg: "bg-tertiary text-on-tertiary",
  },
  {
    icon: "smart_toy",
    badge: "ربات اختصاصی بله و تلگرام",
    title: "زنجیره مطالعه‌ات رو هیچ‌وقت از دست نده",
    desc: "یادآوری‌های خودکار و گزارش روزانه مستقیم روی پیام‌رسان محبوبت تا همیشه در اوج انگیزه بمونی.",
    gradient: "from-primary/15 to-tertiary/10",
    iconBg: "bg-primary-container text-on-primary",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // ذخیره کد دعوت از لینک (?ref=CODE) تا بعد از ورود اعمال شود
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) localStorage.setItem("referral_code", ref);
  }, []);

  // اسلایدر خودکار ویژگی‌ها
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % VALUE_PROPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // تایمر ارسال مجدد کد
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  // فوکوس خودکار روی اینپوت بعد از تغییر استپ
  useEffect(() => {
    if (step === "phone") {
      phoneInputRef.current?.focus();
    } else {
      otpInputRef.current?.focus();
    }
  }, [step]);

  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");
    const cleaned = normalizePhone(phone);
    if (!cleaned.startsWith("09") || cleaned.length !== 11) {
      setError("لطفاً یک شماره موبایل معتبر ۱۱ رقمی (مثلاً ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ارسال کد با خطا مواجه شد.");
        return;
      }
      if (data._dev_otp) setOtp(data._dev_otp);
      setStep("otp");
      setResendTimer(60);
    } catch {
      setError("خطا در ارتباط با سرور. لطفاً اتصال اینترنت را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cleanedCode = normalizeDigits(otp).trim();
    if (cleanedCode.length < 5) {
      setError("لطفاً کد تأیید دریافتی را کامل وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(phone), code: cleanedCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "کد تأیید نادرست یا منقضی شده است.");
        return;
      }
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
      setError("خطا در ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-4 py-6 relative overflow-x-hidden bg-surface">
      {/* Background cyber grid & aura */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-primary) 1px, transparent 1px), linear-gradient(to bottom, var(--color-primary) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="fixed top-12 left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-tertiary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[320px] h-[320px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[460px] flex flex-col gap-5 relative z-10 my-auto">
        {/* Header / Brand */}
        <header className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-tertiary/40 bg-tertiary-fixed/60 px-3.5 py-1 text-[11.5px] font-extrabold text-tertiary mb-3 shadow-sm">
            <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              workspace_premium
            </span>
            باشگاه مطالعه و رقابت دانش‌آموزان
          </div>

          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-11 h-11 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                school
              </span>
            </div>
            <h1 className="text-[26px] font-extrabold text-primary tracking-tight">G-camp</h1>
          </div>

          <p className="text-[15px] font-extrabold text-on-surface leading-snug">
            درس بخون، امتیاز بگیر و خودتو با رُقبات مقایسه کن!
          </p>
          <p className="text-[12px] text-on-surface-variant mt-1">
            تبدیل ساعت‌های مطالعه به XP، سکه، مدال و رتبه کشوری
          </p>
        </header>

        {/* Feature Carousel / Value Props Card */}
        <section
          aria-label="امکانات کلیدی اپلیکیشن"
          className="glass-card rounded-[24px] border border-outline-variant/60 p-4 shadow-xl overflow-hidden relative"
        >
          <div className="relative min-h-[110px] flex flex-col justify-between">
            {VALUE_PROPS.map((prop, idx) => {
              const isCurrent = idx === activeSlide;
              return (
                <div
                  key={prop.title}
                  className={`transition-all duration-500 flex items-start gap-3 ${
                    isCurrent
                      ? "opacity-100 translate-y-0 relative z-10"
                      : "opacity-0 translate-y-2 absolute inset-0 pointer-events-none"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${prop.iconBg} shadow-md`}
                  >
                    <span
                      className="material-symbols-outlined text-[21px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {prop.icon}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1 text-right">
                    <span className="text-[10.5px] font-extrabold text-tertiary">{prop.badge}</span>
                    <h2 className="text-[13.5px] font-extrabold text-on-surface leading-snug mt-0.5">
                      {prop.title}
                    </h2>
                    <p className="text-[11.5px] leading-5 text-on-surface-variant mt-1">
                      {prop.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-3 pt-2 border-t border-outline-variant/30">
            {VALUE_PROPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                aria-label={`اسلاید ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === activeSlide ? "w-6 bg-primary" : "w-1.5 bg-outline-variant hover:bg-outline"
                }`}
              />
            ))}
          </div>
        </section>

        {/* Auth Box (Phone / OTP) */}
        <main className="glass-card rounded-[24px] border border-primary/25 p-5 shadow-2xl relative">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div className="text-right">
                <h3 className="text-[16px] font-extrabold text-on-surface">ورود یا ثبت‌نام سریع</h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5">
                  شماره موبایلت رو وارد کن تا کد تأیید برات پیامک بشه.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 text-right">
                <label htmlFor="phone-input" className="text-[12.5px] font-bold text-on-surface">
                  شماره موبایل
                </label>
                <div className="relative flex items-center">
                  <input
                    id="phone-input"
                    ref={phoneInputRef}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(normalizeDigits(e.target.value))}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    dir="ltr"
                    maxLength={11}
                    className="w-full rounded-xl border border-outline-variant/80 bg-surface-container-lowest/90 px-4 py-3.5 text-[17px] font-bold text-on-surface placeholder:text-outline/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-center tracking-wider"
                    required
                  />
                  <span className="material-symbols-outlined absolute right-3 text-outline text-[20px] pointer-events-none">
                    phone_iphone
                  </span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-1.5 rounded-xl bg-error-container/60 px-3 py-2 text-[12px] text-error font-medium text-right">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="gamified-btn w-full bg-primary text-on-primary font-extrabold text-[15px] py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                ) : (
                  <>
                    <span>دریافت کد و شروع رایگان</span>
                    <span className="material-symbols-outlined text-[19px]">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-on-surface-variant/80 text-center">
                <span
                  className="material-symbols-outlined text-[14px] text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified_user
                </span>
                <span>ثبت‌نام کمتر از ۱۰ ثانیه زمان می‌بره • بدون نیاز به پسورد</span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div className="text-right">
                <h3 className="text-[16px] font-extrabold text-on-surface">کد تأیید پیامک‌شده</h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5">
                  کد ۶ رقمی ارسال‌شده به <span className="font-bold text-primary" dir="ltr">{phone}</span> را وارد کن:
                </p>
              </div>

              <div className="flex flex-col gap-1.5 text-right">
                <input
                  ref={otpInputRef}
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(normalizeDigits(e.target.value))}
                  placeholder="------"
                  maxLength={6}
                  dir="ltr"
                  className="w-full rounded-xl border border-outline-variant/80 bg-surface-container-lowest/90 px-4 py-3.5 text-[24px] font-mono font-bold text-primary placeholder:text-outline/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-center tracking-[0.6rem]"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 rounded-xl bg-error-container/60 px-3 py-2 text-[12px] text-error font-medium text-right">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="gamified-btn w-full bg-primary text-on-primary font-extrabold text-[15px] py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                ) : (
                  <>
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      login
                    </span>
                    <span>ورود به باشگاه G-camp</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1 text-[12px]">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setError("");
                  }}
                  className="text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  ویرایش شماره
                </button>

                {resendTimer > 0 ? (
                  <span className="text-on-surface-variant font-medium">
                    ارسال مجدد ({resendTimer.toLocaleString("fa-IR")} ثانیه)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="text-tertiary font-bold hover:underline"
                  >
                    ارسال مجدد کد
                  </button>
                )}
              </div>
            </form>
          )}
        </main>

        {/* Mini stats badges */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-card rounded-2xl p-2.5 text-center border border-outline-variant/40">
            <span className="text-[14px] font-extrabold text-primary block">۱۵ دقیقه</span>
            <span className="text-[10px] font-bold text-on-surface-variant">۱ XP + ۱ سکه</span>
          </div>
          <div className="glass-card rounded-2xl p-2.5 text-center border border-outline-variant/40">
            <span className="text-[14px] font-extrabold text-tertiary block">لیگ زنده</span>
            <span className="text-[10px] font-bold text-on-surface-variant">رقابت هم‌سطح‌ها</span>
          </div>
          <div className="glass-card rounded-2xl p-2.5 text-center border border-outline-variant/40">
            <span className="text-[14px] font-extrabold text-secondary block">۱۰۰٪ رایگان</span>
            <span className="text-[10px] font-bold text-on-surface-variant">شروع بدون هزینه</span>
          </div>
        </div>
      </div>

      {/* Footer copyright / tagline */}
      <footer className="mt-6 text-center text-[11px] text-outline relative z-10">
        G-camp • درس بخون، امتیاز بگیر و خودتو با رقبات مقایسه کن
      </footer>
    </div>
  );
}
