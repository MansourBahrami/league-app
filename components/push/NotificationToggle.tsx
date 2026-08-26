"use client";

import { useState, useEffect } from "react";
import { enablePush } from "@/components/push/PushRegister";
import { captureProductEvent } from "@/lib/analytics-client";

/** دکمه‌ی فعال‌سازی نوتیفیکیشن رقابتی (درخواست صریح اجازه از کاربر). */
export default function NotificationToggle() {
  const [state, setState] = useState<"unknown" | "granted" | "denied" | "default">("unknown");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!("Notification" in window)) return;

    // خواندن وضعیت مرورگر را یک تیک عقب می‌اندازیم تا رندر اولیه‌ی سرور و کلاینت
    // یکسان بماند و state نیز به‌صورت هم‌زمان داخل effect تغییر نکند.
    const timer = window.setTimeout(() => {
      setState(Notification.permission as "granted" | "denied" | "default");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handle() {
    setBusy(true);
    setMessage("");
    const res = await enablePush();
    captureProductEvent("push_permission_result", {
      result: res.ok ? "granted" : (Notification.permission ?? "unsupported"),
      configured: res.reason !== "کلید نوتیفیکیشن پیکربندی نشده",
    });
    setBusy(false);
    if (res.ok) setState("granted");
    else {
      setMessage(res.reason ?? "فعال‌سازی نوتیفیکیشن ناموفق بود");
      if (typeof Notification !== "undefined") {
        setState(Notification.permission as "granted" | "denied" | "default");
      }
    }
  }

  // وقتی هنوز وضعیت مشخص نیست یا نوتیف‌ها از قبل فعال‌اند، کارت نمایش داده نمی‌شود
  if (state === "unknown" || state === "granted") return null;

  return (
    <section className="glass-card rounded-xl p-4 flex items-center gap-3">
      <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        notifications
      </span>
      <div className="text-right flex-1">
        <p className="text-[15px] font-bold text-on-surface">نوتیفیکیشن رقابتی</p>
        <p className="text-[12px] text-on-surface-variant">
          {state === "denied"
            ? "در تنظیمات مرورگر اجازه را فعال کن"
            : "خبردار شو وقتی رقیبت جلو می‌زنه یا زنجیره‌ات در خطره"}
        </p>
        {message && <p role="alert" className="mt-1 text-[12px] text-error">{message}</p>}
      </div>
      <button
        onClick={handle}
        disabled={busy || state === "denied"}
        className="gamified-btn bg-primary text-on-primary text-[13px] font-bold px-4 py-2 rounded-xl shadow-md shadow-primary/20 disabled:opacity-50"
      >
        {busy ? "..." : "فعال‌سازی"}
      </button>
    </section>
  );
}
