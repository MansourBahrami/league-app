"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { normalizeDigits, normalizePhone } from "@/lib/phone";

type Step = "phone" | "otp";

const POSTER_SLIDES = [
  {
    id: "timer",
    badge: "تایمر ضد حواس‌پرتی",
    icon: "timer",
    title: "ثبت دقیق زمان • هر ۱۵ دقیقه = ۱ XP و ۱ سکه",
    desc: "با تایمر اختصاصی G-camp درس بخون، امتیاز واقعی بگیر و سکه‌هات رو جمع کن.",
    image: "/posters/01-focus-active.jpg",
    tag: "نمای زنده تایمر و مأموریت مطالعه",
  },
  {
    id: "leaderboard",
    badge: "لیگ هفتگی هم‌سطح‌ها",
    icon: "leaderboard",
    title: "رقابت عادلانه با بچه‌های هم‌پایه در سراسر ایران",
    desc: "رده‌بندی زنده بر اساس مجموع XP هفت روز اخیر؛ خودتو با رقبای هم‌سطح مقایسه کن.",
    image: "/posters/02-weekly-leaderboard.jpg",
    tag: "جدول رده‌بندی و سکوی رتبه‌برترها",
  },
  {
    id: "profile",
    badge: "مدال‌ها و ستاره‌ها",
    icon: "military_tech",
    title: "هدف‌گذاری کن، مدال بگیر و سطحت رو ببر بالا",
    desc: "با انجام مأموریت‌های هفتگی، مدال‌های اختصاصی جمع کن و ستاره‌های طلایی بگیر.",
    image: "/posters/04-profile-progress.jpg",
    tag: "پروفایل اختصاصی و تالار مدال‌ها",
  },
  {
    id: "feed",
    badge: "بورد زنده دانش‌آموزان",
    icon: "groups",
    title: "تنها درس نخون؛ حس خوب مطالعه گروهی",
    desc: "ببین همین الان کیا دارن درس می‌خونن، بهشون انرژی بده و با هم جلو برید.",
    image: "/posters/03-live-board.jpg",
    tag: "بورد زنده مطالعه و رقابت",
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

  // اسلایدر خودکار پوسترها
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % POSTER_SLIDES.length);
    }, 4000);
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

  // فوکوس خودکار روی اینپوت
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
      setError("لطفاً شماره موبایل معتبر ۱۱ رقمی (مثلاً ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
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
      setError("لطفاً کد ۶ رقمی دریافتی را کامل وارد کنید.");
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
      // اعمال کد دعوت ذخیره‌شده
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

  const currentPoster = POSTER_SLIDES[activeSlide];

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-4 py-5 relative overflow-x-hidden bg-surface">
      {/* Background cyber grid & soft aura */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-primary) 1px, transparent 1px), linear-gradient(to bottom, var(--color-primary) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="fixed top-10 left-1/2 -translate-x-1/2 w-[380px] h-[380px] bg-tertiary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[480px] flex flex-col gap-4 relative z-10 my-auto">
        {/* Header / Brand */}
        <header className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/40 bg-tertiary-fixed/60 px-3 py-1 text-[11px] font-extrabold text-tertiary mb-2.5 shadow-sm">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              workspace_premium
            </span>
            باشگاه مطالعه و رقابت دانش‌آموزان
          </div>

          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                school
              </span>
            </div>
            <h1 className="text-[25px] font-extrabold text-primary tracking-tight">G-camp</h1>
          </div>

          <p className="text-[14.5px] font-extrabold text-on-surface leading-snug">
            درس بخون، امتیاز بگیر و خودتو با رُقبات مقایسه کن!
          </p>
        </header>

        {/* Poster Showcase Card (محیط واقعی اپ) */}
        <section
          aria-label="پوسترهای محیط واقعی برنامه"
          className="glass-card rounded-[26px] border border-outline-variant/60 p-3.5 shadow-xl relative overflow-hidden"
        >
          {/* Tag on top of screenshot */}
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary text-[12px]">
                <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {currentPoster.icon}
                </span>
              </span>
              <span className="text-[11.5px] font-extrabold text-primary">{currentPoster.badge}</span>
            </div>
            <span className="text-[10px] font-bold text-on-surface-variant/80 bg-surface-container px-2 py-0.5 rounded-full">
              {currentPoster.tag}
            </span>
          </div>

          {/* Screenshot Poster Container */}
          <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-outline-variant/50 bg-black/5 shadow-inner">
            {POSTER_SLIDES.map((slide, idx) => {
              const isCurrent = idx === activeSlide;
              return (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    isCurrent ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    sizes="(max-width: 600px) 100vw, 480px"
                    className="object-cover object-top"
                    priority={idx === 0}
                  />
                  {/* Subtle gradient overlay at bottom for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
                  <div className="absolute bottom-2 right-3 left-3 text-right text-white">
                    <p className="text-[12px] font-extrabold drop-shadow-md leading-tight">{slide.title}</p>
                    <p className="text-[10px] text-white/90 drop-shadow-sm mt-0.5 line-clamp-1">{slide.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Slide Switcher / Dots */}
          <div className="flex items-center justify-between mt-2.5 px-1 pt-1.5 border-t border-outline-variant/30">
            <div className="flex items-center gap-1.5">
              {POSTER_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`پوستر ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === activeSlide ? "w-6 bg-primary" : "w-2 bg-outline-variant hover:bg-outline"
                  }`}
                />
              ))}
            </div>
            <span className="text-[10.5px] font-bold text-tertiary">
              {(activeSlide + 1).toLocaleString("fa-IR")} از {POSTER_SLIDES.length.toLocaleString("fa-IR")}
            </span>
          </div>
        </section>

        {/* Auth Box (Phone / OTP) */}
        <main className="glass-card rounded-[24px] border border-primary/25 p-4 sm:p-5 shadow-2xl relative">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-3.5">
              <div className="text-right">
                <h3 className="text-[15px] font-extrabold text-on-surface">ورود یا ثبت‌نام سریع</h3>
                <p className="text-[11.5px] text-on-surface-variant mt-0.5">
                  شماره موبایلت رو وارد کن تا کد تأیید برات پیامک بشه:
                </p>
              </div>

              <div className="flex flex-col gap-1.5 text-right">
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
                    className="w-full rounded-xl border border-outline-variant/80 bg-surface-container-lowest/90 px-4 py-3 text-[17px] font-bold text-on-surface placeholder:text-outline/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-center tracking-wider"
                    required
                  />
                  <span className="material-symbols-outlined absolute right-3 text-outline text-[20px] pointer-events-none">
                    phone_iphone
                  </span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-1.5 rounded-xl bg-error-container/60 px-3 py-2 text-[11.5px] text-error font-medium text-right">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="gamified-btn w-full bg-primary text-on-primary font-extrabold text-[14.5px] py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                ) : (
                  <>
                    <span>دریافت کد و ورود رایگان</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-on-surface-variant/80 text-center">
                <span
                  className="material-symbols-outlined text-[13px] text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified_user
                </span>
                <span>ثبت‌نام کمتر از ۱۰ ثانیه زمان می‌بره • بدون نیاز به پسورد</span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3.5">
              <div className="text-right">
                <h3 className="text-[15px] font-extrabold text-on-surface">کد تأیید پیامک‌شده</h3>
                <p className="text-[11.5px] text-on-surface-variant mt-0.5">
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
                  className="w-full rounded-xl border border-outline-variant/80 bg-surface-container-lowest/90 px-4 py-3 text-[22px] font-mono font-bold text-primary placeholder:text-outline/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-center tracking-[0.55rem]"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 rounded-xl bg-error-container/60 px-3 py-2 text-[11.5px] text-error font-medium text-right">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="gamified-btn w-full bg-primary text-on-primary font-extrabold text-[14.5px] py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                ) : (
                  <>
                    <span
                      className="material-symbols-outlined text-[19px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      login
                    </span>
                    <span>ورود به باشگاه G-camp</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1 text-[11.5px]">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setError("");
                  }}
                  className="text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
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

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-card rounded-2xl p-2 text-center border border-outline-variant/40">
            <span className="text-[13px] font-extrabold text-primary block">۱۵ دقیقه</span>
            <span className="text-[9.5px] font-bold text-on-surface-variant">۱ XP + ۱ سکه</span>
          </div>
          <div className="glass-card rounded-2xl p-2 text-center border border-outline-variant/40">
            <span className="text-[13px] font-extrabold text-tertiary block">لیگ زنده</span>
            <span className="text-[9.5px] font-bold text-on-surface-variant">رقابت هم‌سطح‌ها</span>
          </div>
          <div className="glass-card rounded-2xl p-2 text-center border border-outline-variant/40">
            <span className="text-[13px] font-extrabold text-secondary block">۱۰۰٪ رایگان</span>
            <span className="text-[9.5px] font-bold text-on-surface-variant">شروع بدون هزینه</span>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="mt-4 text-center text-[10.5px] text-outline relative z-10">
        G-camp • درس بخون، امتیاز بگیر و خودتو با رقبات مقایسه کن
      </footer>
    </div>
  );
}
