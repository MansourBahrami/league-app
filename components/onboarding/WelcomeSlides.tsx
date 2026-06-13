"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* ---------- ویژوال هر اسلاید ---------- */

function TimerVisual() {
  return (
    <div className="glass-card rounded-2xl p-6 w-full flex flex-col items-center gap-4 shadow-lg">
      <span className="text-[52px] leading-none font-extrabold text-[#4648d4]" dir="ltr" style={{ fontVariant: "tabular-nums" }}>
        ۶۰:۰۰
      </span>
      <div className="w-full h-2 bg-[#e5eeff] rounded-full overflow-hidden" dir="ltr">
        <div className="h-full w-2/3 bg-gradient-to-l from-[#4648d4] to-[#6063ee] rounded-full" />
      </div>
      <div className="flex gap-2" dir="rtl">
        {[30, 60, 90, 120].map((m) => (
          <span key={m} className={`px-3 py-1.5 rounded-full text-[13px] font-semibold ${m === 60 ? "bg-[#4648d4] text-white" : "border border-[#c7c4d7] text-[#464554]"}`}>{m}</span>
        ))}
      </div>
      <div className="gamified-btn w-full bg-[#4648d4] text-white font-bold text-[16px] py-3 rounded-xl flex justify-center items-center gap-2">
        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
        شروع مطالعه
      </div>
    </div>
  );
}

function RewardVisual() {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5 bg-[#dce9ff] px-4 py-3 rounded-2xl shadow-sm">
          <span className="material-symbols-outlined text-[#4648d4] text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          <span className="text-[22px] font-extrabold text-[#4648d4]">+۴</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#ffddb8]/50 px-4 py-3 rounded-2xl shadow-sm">
          <span className="material-symbols-outlined text-[#ffb95f] text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>generating_tokens</span>
          <span className="text-[22px] font-extrabold text-[#825100]">+۴</span>
        </div>
      </div>
      <div className="glass-card rounded-2xl p-4 w-full flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[13px] font-semibold text-[#4648d4]">سطح: ثابت‌قدم</span>
          <span className="text-[13px] text-[#464554]">۲۰۰ / ۵۰۰ XP</span>
        </div>
        <div className="h-3 w-full bg-[#dce9ff] rounded-full overflow-hidden">
          <div className="h-full w-2/5 bg-gradient-to-l from-[#4648d4] to-[#6063ee] rounded-full" />
        </div>
      </div>
      <p className="text-[13px] text-[#464554]">هر ۱۵ دقیقه مطالعه = ۱ XP + ۱ سکه</p>
    </div>
  );
}

function LeaderboardVisual() {
  const rows = [
    { rank: "۱", name: "سارا", xp: "۸۴۰", me: false },
    { rank: "۲", name: "تو", xp: "۷۹۰", me: true },
    { rank: "۳", name: "علی", xp: "۷۲۰", me: false },
  ];
  return (
    <div className="glass-card rounded-2xl p-4 w-full flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.rank} className={`flex items-center gap-3 rounded-xl p-2.5 ${r.me ? "bg-[#e1e0ff] border border-[#4648d4]/30" : "bg-white/60"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold ${r.rank === "۱" ? "bg-[#ffb95f] text-[#2a1700]" : "bg-[#dce9ff] text-[#4648d4]"}`}>{r.rank}</span>
          <span className={`flex-1 text-[15px] font-bold ${r.me ? "text-[#4648d4]" : "text-[#0b1c30]"}`}>{r.name}</span>
          <span className="text-[14px] font-bold text-[#825100]">{r.xp} XP</span>
        </div>
      ))}
      <div className="bg-[#fff7eb] rounded-xl p-2 text-center mt-1">
        <span className="text-[12px] font-semibold text-[#825100]">فقط ۵۰ XP تا نفر اول! 🔥</span>
      </div>
    </div>
  );
}

function VideosVisual() {
  return (
    <div className="flex flex-col gap-3 w-full">
      {["تکنیک حفظ نکردن و یادگیری مفهوم", "چطور ساعت مطالعه‌مونو ببریم بالا؟"].map((title, i) => (
        <div key={i} className="glass-card rounded-2xl p-3 flex flex-row-reverse items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-[#e1e0ff] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#4648d4] text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          </div>
          <div className="flex-1 text-right">
            <span className="bg-[#dce9ff] text-[#4648d4] px-2 py-0.5 rounded text-[10px] font-bold">رایگان</span>
            <p className="text-[14px] font-bold text-[#0b1c30] mt-1 leading-tight">{title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function InstallVisual() {
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* iOS */}
      <div className="glass-card rounded-2xl p-3 flex items-center gap-3 flex-row-reverse">
        <div className="w-11 h-11 rounded-xl bg-[#e5eeff] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[#4648d4] text-[24px]">ios_share</span>
        </div>
        <div className="flex-1 text-right">
          <p className="text-[13px] font-bold text-[#0b1c30]">آیفون (Safari)</p>
          <p className="text-[12px] text-[#464554]">دکمه اشتراک‌گذاری ← «Add to Home Screen»</p>
        </div>
      </div>
      {/* Android */}
      <div className="glass-card rounded-2xl p-3 flex items-center gap-3 flex-row-reverse">
        <div className="w-11 h-11 rounded-xl bg-[#e5eeff] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[#006c49] text-[24px]">android</span>
        </div>
        <div className="flex-1 text-right">
          <p className="text-[13px] font-bold text-[#0b1c30]">اندروید (Chrome)</p>
          <p className="text-[12px] text-[#464554]">منوی ⋮ ← «افزودن به صفحه اصلی»</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- داده اسلایدها ---------- */

const SLIDES = [
  {
    icon: "timer",
    title: "تایمرو روشن کن و درسو شروع کن",
    desc: "با یه لمس، تایمر مطالعه‌ات شروع میشه. تمرکز کن و بذار زمان برات کار کنه.",
    visual: <TimerVisual />,
  },
  {
    icon: "bolt",
    title: "به ازای درس، امتیاز و سکه بگیر",
    desc: "هر دقیقه‌ای که می‌خونی به XP و سکه تبدیل میشه. سطحت بالا میره و مدال جمع می‌کنی.",
    visual: <RewardVisual />,
  },
  {
    icon: "leaderboard",
    title: "عملکرد خودتو نسبت به بقیه ببین و رقابت کن",
    desc: "توی لیدربورد ببین کجای رقابت ایستادی و با هم‌رده‌های خودت مسابقه بده.",
    visual: <LeaderboardVisual />,
  },
  {
    icon: "school",
    title: "رایگان یاد بگیر، مثل یه «رتبه‌برتر» درس بخون",
    desc: "ویدیوهای آموزشی تکنیک‌های مطالعه و برنامه‌ریزی رو رایگان تماشا کن و جلو بزن.",
    visual: <VideosVisual />,
  },
  {
    icon: "add_to_home_screen",
    title: "اپ رو به صفحه گوشیت اضافه کن",
    desc: "برای دسترسی سریع و حس یه اپ واقعی، صفحه رو به هوم‌اسکرین گوشیت اضافه کن. فقط چند ثانیه طول می‌کشه!",
    visual: <InstallVisual />,
  },
];

const HOUR_OPTIONS = [
  { label: "کمتر از ۱ ساعت", value: 0.5 },
  { label: "۱ تا ۲ ساعت", value: 1.5 },
  { label: "۲ تا ۴ ساعت", value: 3 },
  { label: "۴ تا ۶ ساعت", value: 5 },
  { label: "بیشتر از ۶ ساعت", value: 7 },
];

/* ---------- کامپوننت اصلی ---------- */

export default function WelcomeSlides() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0..3 اسلایدها، 4 پرسش ساعت
  const [pastHours, setPastHours] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const isQuestion = step === SLIDES.length;

  async function finish() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasSeenIntro: true, pastAvgStudyHours: pastHours ?? 1.5 }),
    }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-[#f8f9ff] flex flex-col">
      {/* پس‌زمینه گرید */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(to right, #4648d4 1px, transparent 1px), linear-gradient(to bottom, #4648d4 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      {/* دکمه رد کردن */}
      {!isQuestion && (
        <div className="flex justify-start p-4 relative z-10">
          <button onClick={() => setStep(SLIDES.length)} className="text-[14px] text-[#767586] hover:text-[#4648d4] font-semibold">
            رد کردن
          </button>
        </div>
      )}

      {/* محتوا */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 max-w-[480px] mx-auto w-full">
        {!isQuestion ? (
          <div key={step} className="flex flex-col items-center gap-6 w-full feed-item-enter">
            <div className="w-16 h-16 rounded-2xl bg-[#4648d4] flex items-center justify-center shadow-lg shadow-[#4648d4]/30">
              <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{SLIDES[step].icon}</span>
            </div>
            <div className="w-full">{SLIDES[step].visual}</div>
            <div className="text-center">
              <h2 className="text-[22px] font-extrabold text-[#0b1c30] leading-snug mb-2">{SLIDES[step].title}</h2>
              <p className="text-[15px] text-[#464554] leading-relaxed">{SLIDES[step].desc}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 w-full feed-item-enter">
            <div className="w-16 h-16 rounded-2xl bg-[#4648d4] flex items-center justify-center shadow-lg shadow-[#4648d4]/30">
              <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
            </div>
            <div className="text-center">
              <h2 className="text-[22px] font-extrabold text-[#0b1c30] mb-2">روزهای اخیر چقدر درس می‌خوندی؟</h2>
              <p className="text-[15px] text-[#464554]">تا اولین ماموریتت رو متناسب با خودت بچینیم.</p>
            </div>
            <div className="flex flex-col gap-2.5 w-full">
              {HOUR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPastHours(opt.value)}
                  className={`w-full py-3.5 rounded-xl text-[15px] font-semibold transition-all border ${
                    pastHours === opt.value
                      ? "bg-[#4648d4] text-white border-[#4648d4] shadow-md scale-[1.02]"
                      : "border-[#c7c4d7] text-[#464554] hover:bg-[#e1e0ff]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* پایین: نقطه‌ها + دکمه */}
      <div className="p-6 relative z-10 max-w-[480px] mx-auto w-full flex flex-col gap-4">
        {!isQuestion && (
          <div className="flex justify-center gap-2">
            {SLIDES.map((_, i) => (
              <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-[#4648d4]" : "w-2 bg-[#c7c4d7]"}`} />
            ))}
          </div>
        )}

        {!isQuestion ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="gamified-btn w-full bg-[#4648d4] text-white font-bold text-[16px] py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#4648d4]/20"
          >
            {step === SLIDES.length - 1 ? "بزن بریم!" : "بعدی"}
            <span className="material-symbols-outlined text-[20px]" style={{ transform: "scaleX(-1)" }}>arrow_forward</span>
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={saving}
            className="gamified-btn w-full bg-[#4648d4] text-white font-bold text-[16px] py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#4648d4]/20 disabled:opacity-60"
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                شروع کن
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
