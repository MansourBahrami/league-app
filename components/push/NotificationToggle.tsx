"use client";

import { useState, useEffect } from "react";
import { enablePush } from "@/components/push/PushRegister";

/** دکمه‌ی فعال‌سازی نوتیفیکیشن رقابتی (درخواست صریح اجازه از کاربر). */
export default function NotificationToggle() {
  const [state, setState] = useState<"unknown" | "granted" | "denied" | "default">("unknown");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setState(Notification.permission as "granted" | "denied" | "default");
    }
  }, []);

  async function handle() {
    setBusy(true);
    const res = await enablePush();
    setBusy(false);
    if (res.ok) setState("granted");
    else if (typeof Notification !== "undefined") setState(Notification.permission as "granted" | "denied" | "default");
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
