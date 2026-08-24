"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "جی‌کمپ دقیقاً چیه؟",
    answer:
      "جی‌کمپ یک کمپ مطالعه برای دانش‌آموزها و کنکوری‌هاست. با تایمر درس می‌خونی، می‌بینی بقیه هم مشغول مطالعه‌ان، کنار هم‌هدف‌هات مأموریت انجام می‌دی و برای زمان تأییدشده XP و سکه می‌گیری. هدفش ساده‌ست: موقع درس‌خوندن احساس نکنی تنهایی.",
  },
  {
    question: "برای استفاده از جی‌کمپ باید پول پرداخت کنم؟",
    answer:
      "نه. ورود و استفاده از امکانات اصلی جی‌کمپ رایگانه. بعضی مأموریت‌ها یا ویدیوها با سکه باز می‌شن؛ سکه رو هم با درس‌خوندن و انجام مأموریت‌ها داخل خود جی‌کمپ به دست میاری.",
  },
  {
    question: "XP و سکه چطور حساب می‌شن؟",
    answer:
      "هر ۱۵ دقیقه مطالعه‌ای که سرور تأیید کنه، دقیقاً ۱ XP و ۱ سکه داره. XP جایگاه و مسیر رشدت رو جلو می‌بره؛ سکه رو می‌تونی برای مأموریت‌ها، بعضی ویدیوها و امکانات داخل اپ خرج کنی.",
  },
  {
    question: "چطور می‌فهمم بقیه هم دارن درس می‌خونن؟",
    answer:
      "در بورد زنده، شروع جلسه‌ها و پیشرفت‌های تازه رو می‌بینی و می‌تونی به فعالیت بقیه واکنش نشون بدی. در کمپ مأموریت هم کنار کسانی قرار می‌گیری که هدفی شبیه تو دارن. جدول برتر و جدول دوست‌ها هم برای دیدن روند هفت روز اخیر در دسترسه.",
  },
  {
    question: "زمان مطالعه چطور تأیید می‌شه؟",
    answer:
      "شروع، مکث، ادامه و پایان هر جلسه روی سرور ثبت می‌شه. پاداش از زمان سپری‌شدهٔ واقعی، منهای مکث‌ها و فقط تا سقف مدت جلسه‌ای که انتخاب کردی محاسبه می‌شه؛ پس یک بازهٔ زمانی دوبار پاداش نمی‌گیره.",
  },
  {
    question: "لازمه جی‌کمپ رو از مارکت نصب کنم؟",
    answer:
      "نه. جی‌کمپ یک وب‌اپه و مستقیم در مرورگر باز می‌شه. اگر دوست داشته باشی، در اندروید از منوی مرورگر گزینهٔ «نصب برنامه» و در آیفون از Share گزینهٔ «Add to Home Screen» رو بزن تا مثل یک اپ روی صفحهٔ اصلی گوشی باشه.",
  },
  {
    question: "اتصال بله یا تلگرام اجباریه؟",
    answer:
      "نه، ورود به جی‌کمپ فقط با شمارهٔ موبایل و کد تأیید انجام می‌شه. اتصال بله یا تلگرام اختیاریه و فقط برای دریافت یادآوری‌های مطالعه و خبرهای حساب کاربرد داره؛ هر وقت بخوای از پروفایل می‌تونی اتصال رو مدیریت کنی.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="flex flex-col gap-3">
      {FAQS.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              isOpen
                ? "bg-surface-container-high border-primary/20 shadow-sm"
                : "bg-surface-container-lowest border-outline-variant/60 hover:border-primary/20"
            }`}
          >
            <button
              onClick={() => toggle(idx)}
              className="w-full flex items-center justify-between p-4 md:p-5 text-right font-bold text-on-surface cursor-pointer select-none gap-4"
              aria-expanded={isOpen}
            >
              <span className="text-[15px] md:text-[17px] leading-snug flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                {faq.question}
              </span>
              <span
                className={`material-symbols-outlined text-[22px] text-primary shrink-0 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                keyboard_arrow_down
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-5 md:px-5 md:pb-6 text-on-surface-variant text-[14px] md:text-[15px] leading-relaxed border-t border-outline-variant/30 pt-3">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
