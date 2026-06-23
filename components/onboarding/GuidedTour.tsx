"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { enablePush } from "@/components/push/PushRegister";

/**
 * تور راهنمای درون‌اپ (جایگزین اسلایدهای ابتدایی).
 *
 * به‌جای یک overlay تمام‌صفحه‌ی جدا، کاربر را داخل خودِ اپ می‌برد و هر فیچر را
 * سرِ جای واقعی‌اش با «نورافکن» (spotlight) روی عنصر واقعی + یک کارت توضیح نشان
 * می‌دهد.
 *
 * ناوبری بین صفحات «کلیک‌محور» است: گامِ kind="nav" دکمه‌ی واقعیِ نوار پایین را
 * هایلایت می‌کند و از کاربر می‌خواهد خودش رویش بزند؛ وقتی به صفحه‌ی مقصد رسید،
 * تور خودکار به گامِ توضیحِ آن صفحه می‌رود. (هیچ ناوبری خودکاری انجام نمی‌شود.)
 *
 * این کامپوننت داخل AppShell سوار می‌شود؛ چون layout گروهِ (app) هنگام ناوبری بین
 * صفحات unmount نمی‌شود، state تور (گامِ جاری) بین صفحات حفظ می‌ماند.
 *
 * نکته‌ها:
 *  - عناصر هدف با data-tour="..." در UI واقعی علامت‌گذاری شده‌اند.
 *  - گام «سوال ساعت مطالعه» داده لازم دارد (pastAvgStudyHours) پس کارتِ مرکزی است.
 *  - گام نوتیفیکیشن دکمه‌ی «اجازه می‌دم» دارد (enablePush).
 *  - در پایان فقط یک‌بار PATCH می‌زنیم: hasSeenIntro=true + pastAvgStudyHours.
 */

type StepKind = "question" | "spotlight" | "centered" | "nav";

interface TourStep {
  id: string;
  kind: StepKind;
  selector?: string; // مقدار data-tour برای گام spotlight/nav
  navTo?: string; // مسیر مقصد برای گام nav (منتظر می‌مانیم کاربر برسد)
  icon: string;
  title: string;
  desc: string;
  action?: "push"; // درخواست اجازه‌ی نوتیف هنگام «بعدی»
  cta?: string; // متن دلخواه دکمه‌ی اصلی
}

const STEPS: TourStep[] = [
  {
    id: "welcome",
    kind: "question",
    icon: "waving_hand",
    title: "خوش اومدی! بریم آشنا شیم 👋",
    desc: "روزهای اخیر روزی چقدر درس می‌خوندی؟ تا اولین ماموریتت رو متناسب با خودت بچینیم.",
  },
  {
    id: "timer",
    kind: "spotlight",
    selector: "timer",
    icon: "timer",
    title: "تایمرو روشن کن و درسو شروع کن",
    desc: "مدت رو انتخاب کن و با یه لمس، تایمر مطالعه‌ات شروع میشه. تمرکز کن و بذار زمان برات کار کنه.",
  },
  {
    id: "mission",
    kind: "spotlight",
    selector: "mission",
    icon: "flag",
    title: "ماموریت امروزت اینجاست",
    desc: "هر روز یه هدف مطالعه و یه ویدیوی کوتاه داری. کارت رو پر کن تا روزِت کامل بشه و جلو بری.",
  },
  {
    id: "rewards",
    kind: "spotlight",
    selector: "rewards",
    icon: "bolt",
    title: "به ازای درس، امتیاز و سکه بگیر",
    desc: "هر ۱۵ دقیقه مطالعه = ۱ XP + ۱ سکه. اینجا بالای صفحه همیشه XP و سکه‌ات رو می‌بینی؛ سطحت بالا میره و مدال جمع می‌کنی.",
  },
  {
    id: "notifications",
    kind: "spotlight",
    selector: "inbox",
    icon: "notifications_active",
    title: "بذار حواسمون بهت باشه",
    desc: "با اجازه‌ی نوتیفیکیشن، وقتی رقیبت ازت جلو می‌زنه یا زنجیره‌ی مطالعه‌ات در خطره بهت خبر می‌دیم تا عقب نیفتی.",
    action: "push",
    cta: "اجازه می‌دم",
  },
  {
    id: "go-feed",
    kind: "nav",
    selector: "nav-feed",
    navTo: "/feed",
    icon: "bolt",
    title: "بریم سراغ «بورد زنده»",
    desc: "روی دکمه‌ی «بورد زنده» پایین صفحه بزن تا با هم بریم اونجا.",
  },
  {
    id: "feed",
    kind: "spotlight",
    selector: "feed",
    icon: "bolt",
    title: "اینجا بورد زنده‌ست",
    desc: "فعالیت زنده‌ی بقیه رو لحظه‌ای می‌بینی و می‌تونی بهشون واکنش بدی. حسِ رقابت و انرژی همین‌جا جریان داره!",
  },
  {
    id: "go-leaderboard",
    kind: "nav",
    selector: "nav-leaderboard",
    navTo: "/leaderboard",
    icon: "leaderboard",
    title: "حالا بریم «جدول‌برتر»",
    desc: "روی دکمه‌ی «جدول‌برتر» پایین صفحه بزن تا رتبه‌بندی رو ببینی.",
  },
  {
    id: "leaderboard",
    kind: "spotlight",
    selector: "leaderboard",
    icon: "leaderboard",
    title: "با هم‌رده‌های خودت رقابت کن",
    desc: "توی جدول‌برتر ببین بین هم‌سطح‌هات کجای رقابت ایستادی و برای بالا رفتن تلاش کن.",
  },
  {
    id: "install",
    kind: "centered",
    icon: "add_to_home_screen",
    title: "اپ رو به صفحه گوشیت اضافه کن",
    desc: "آیفون (Safari): دکمه اشتراک‌گذاری ← «Add to Home Screen». اندروید (Chrome): منوی ⋮ ← «افزودن به صفحه اصلی». فقط چند ثانیه طول می‌کشه!",
    cta: "بزن بریم!",
  },
];

const HOUR_OPTIONS = [
  { label: "کمتر از ۱ ساعت", value: 0.5 },
  { label: "۱ تا ۲ ساعت", value: 1.5 },
  { label: "۲ تا ۴ ساعت", value: 3 },
  { label: "۴ تا ۶ ساعت", value: 5 },
  { label: "بیشتر از ۶ ساعت", value: 7 },
];

const SPOTLIGHT_PAD = 8; // فاصله‌ی حفره‌ی نورافکن تا عنصر
const FIND_TIMEOUT = 4000; // اگر عنصر هدف پیدا نشد، fallback به کارت مرکزی
const VIEWPORT_MARGIN = 16; // حداقل حاشیه‌ی کارت تا لبه‌ی صفحه

export default function GuidedTour() {
  const router = useRouter();
  const pathname = usePathname();

  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [located, setLocated] = useState(false); // جست‌وجوی عنصر spotlight تمام شد (پیدا یا منقضی)
  const [pastHours, setPastHours] = useState<number | null>(null);
  const [busyPush, setBusyPush] = useState(false);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(0); // ارتفاع واقعی کارت توضیح (برای clamp داخل صفحه)

  const step = STEPS[index];
  const wantsSpotlight = step.kind === "spotlight" || step.kind === "nav";
  const hasSpotlight = wantsSpotlight && !!rect;
  // در حال جست‌وجوی عنصر هدف: فقط پس‌زمینه‌ی تیره، بدون کارت (تا جای اشتباه پرش نکند)
  const locating = wantsSpotlight && !rect && !located;

  // رفتن به گام دیگر: ریست وضعیت نورافکن داخل هندلر (نه افکت) تا رندر آبشاری نشود
  const goTo = useCallback((i: number) => {
    setRect(null);
    setLocated(false);
    setIndex(i);
  }, []);

  // گام nav: وقتی کاربر خودش به صفحه‌ی مقصد رسید، خودکار برو گام بعد
  // (به‌روزرسانی state را به فریم بعد موکول می‌کنیم تا رندر آبشاری داخل افکت نشود)
  useEffect(() => {
    if (step.kind !== "nav" || !step.navTo || pathname !== step.navTo) return;
    const raf = requestAnimationFrame(() => goTo(index + 1));
    return () => cancelAnimationFrame(raf);
  }, [step.kind, step.navTo, pathname, index, goTo]);

  // پیدا کردن و اندازه‌گیری عنصر هدفِ گام جاری (spotlight و nav)
  useEffect(() => {
    if (!wantsSpotlight) return;

    let cancelled = false;
    let raf = 0;
    const start = Date.now();

    const locate = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.selector}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        // بعد از فرونشستن اسکرول، rect را بخوان
        window.setTimeout(() => {
          if (cancelled) return;
          setRect(el.getBoundingClientRect());
          setLocated(true);
        }, 380);
        return;
      }
      if (Date.now() - start > FIND_TIMEOUT) {
        setLocated(true); // fallback: کارت مرکزی بدون نورافکن
        return;
      }
      raf = requestAnimationFrame(locate);
    };
    raf = requestAnimationFrame(locate);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [index, pathname, wantsSpotlight, step.selector]);

  // به‌روزرسانی محل حفره هنگام اسکرول/تغییر اندازه
  useEffect(() => {
    if (!rect || !wantsSpotlight) return;
    const update = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.selector}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [rect, wantsSpotlight, step.selector]);

  // اندازه‌گیری ارتفاع واقعی کارت توضیح تا بتوانیم موقعیتش را داخل صفحه clamp کنیم
  // (عنصرِ هدفِ بلند نباید باعث شود کارت از بالا/پایینِ صفحه بیرون بزند)
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const update = () => setCardH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, located, hasSpotlight]);

  const finish = useCallback(async () => {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasSeenIntro: true, pastAvgStudyHours: pastHours ?? 1.5 }),
    }).catch(() => {});
    if (pathname !== "/dashboard") router.push("/dashboard");
    router.refresh();
  }, [pastHours, pathname, router]);

  const next = useCallback(async () => {
    if (step.action === "push") {
      setBusyPush(true);
      await enablePush().catch(() => {});
      setBusyPush(false);
    }
    if (index === STEPS.length - 1) {
      await finish();
      return;
    }
    goTo(index + 1);
  }, [step.action, index, finish, goTo]);

  const isLast = index === STEPS.length - 1;
  const isQuestion = step.kind === "question";
  const isNav = step.kind === "nav";
  const nextDisabled = (isQuestion && pastHours === null) || busyPush || saving;
  const ctaLabel = step.cta ?? (isLast ? "شروع کن" : "بعدی");

  // محل قرارگیری کارت توضیح برای گام نورافکن: زیر عنصر اگر جا باشد، وگرنه بالا.
  // با اندازه‌ی واقعیِ کارت داخل صفحه clamp می‌شود تا روی عنصرهای بلند هم بیرون نزند.
  const cardPos: React.CSSProperties = {};
  if (hasSpotlight && rect) {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const gap = SPOTLIGHT_PAD + 14;
    const needed = cardH + gap;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    let top: number;
    if (spaceBelow >= needed) top = rect.bottom + gap; // زیر عنصر جا هست
    else if (spaceAbove >= needed) top = rect.top - gap - cardH; // بالای عنصر جا هست
    else top = spaceBelow >= spaceAbove ? rect.bottom + gap : rect.top - gap - cardH; // عنصر بلند: سمت بازتر
    // clamp داخل viewport با حاشیه‌ی امن
    cardPos.top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - cardH - VIEWPORT_MARGIN));
    cardPos.opacity = cardH > 0 ? 1 : 0; // تا قبل از اندازه‌گیری مخفی بماند (بدون پرش)
  }

  return (
    // root کلیک‌ها را عبور می‌دهد (pointer-events-none)؛ فقط لایه‌های لازم آن را می‌گیرند
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* پس‌زمینه‌ی تیره: برای گام مرکزی/سوال یا وقتی عنصر پیدا نشد — جلوی کلیکِ صفحه را می‌گیرد */}
      {!hasSpotlight && <div className="absolute inset-0 pointer-events-auto bg-[#0b1c30]/75 backdrop-blur-[2px]" />}

      {/* گامِ spotlight غیرِ nav: یک بلاکرِ شفاف تا صفحه‌ی پشت کلیک‌پذیر نباشد.
          گامِ nav این بلاکر را ندارد تا کاربر بتواند روی دکمه‌ی واقعیِ نوار پایین بزند. */}
      {hasSpotlight && !isNav && <div className="absolute inset-0 pointer-events-auto" />}

      {/* حفره‌ی نورافکن روی عنصر واقعی (با سایه‌ی بزرگ، بقیه‌ی صفحه تیره می‌شود) */}
      {hasSpotlight && rect && (
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-300"
          style={{
            top: rect.top - SPOTLIGHT_PAD,
            left: rect.left - SPOTLIGHT_PAD,
            width: rect.width + SPOTLIGHT_PAD * 2,
            height: rect.height + SPOTLIGHT_PAD * 2,
            boxShadow: "0 0 0 9999px rgba(11,28,48,0.75)",
            border: "2px solid var(--color-primary)",
          }}
        />
      )}

      {/* کارت توضیح (حین جست‌وجوی عنصر هدف نشان داده نمی‌شود تا جای اشتباه پرش نکند) */}
      {!locating && (
        <div
          className={
            hasSpotlight
              ? "absolute left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[440px] px-0 pointer-events-auto transition-opacity duration-150"
              : "absolute inset-0 flex items-center justify-center p-4 pointer-events-auto"
          }
          style={hasSpotlight ? cardPos : undefined}
        >
          <div
            key={step.id}
            ref={cardRef}
            className="feed-item-enter w-full max-w-[440px] max-h-[calc(100dvh-32px)] overflow-y-auto bg-surface rounded-2xl shadow-2xl border border-outline-variant/30 p-5 flex flex-col gap-3.5"
          >
            {/* آیکن + رد کردن */}
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                <span className="material-symbols-outlined text-on-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {step.icon}
                </span>
              </div>
              <button onClick={finish} className="text-[13px] text-on-surface-variant hover:text-primary font-semibold">
                رد کردن
              </button>
            </div>

            {/* عنوان + توضیح */}
            <div className="text-right">
              <h2 className="text-[19px] font-extrabold text-on-surface leading-snug mb-1.5">{step.title}</h2>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">{step.desc}</p>
            </div>

            {/* گزینه‌های سوال ساعت مطالعه */}
            {isQuestion && (
              <div className="flex flex-col gap-2">
                {HOUR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPastHours(opt.value)}
                    className={`w-full py-3 rounded-xl text-[14px] font-semibold transition-all border ${
                      pastHours === opt.value
                        ? "bg-primary text-on-primary border-primary shadow-md scale-[1.01]"
                        : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* نقطه‌های پیشرفت + اکشن */}
            <div className="flex flex-col gap-3 mt-1">
              <div className="flex justify-center gap-1.5">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-primary" : "w-1.5 bg-outline-variant"}`}
                  />
                ))}
              </div>

              {isNav ? (
                // گام ناوبری: دکمه‌ای نیست؛ کاربر باید روی دکمه‌ی هایلایت‌شده‌ی نوار پایین بزند
                <div className="flex items-center justify-center gap-2 text-primary font-bold text-[14px] py-1.5">
                  <span className="material-symbols-outlined text-[22px] animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>
                    touch_app
                  </span>
                  روی دکمه‌ی هایلایت‌شده بزن
                </div>
              ) : (
                <button
                  onClick={next}
                  disabled={nextDisabled}
                  className="gamified-btn w-full bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {busyPush || saving ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  ) : (
                    <>
                      {ctaLabel}
                      {isLast ? (
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                      ) : (
                        <span className="material-symbols-outlined text-[20px]" style={{ transform: "scaleX(-1)" }}>arrow_forward</span>
                      )}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
