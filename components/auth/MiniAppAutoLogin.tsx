"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * هنگام باز شدن اپ داخل مینی‌اپ تلگرام/بله، به‌صورت خودکار وارد می‌شود.
 * پیام‌رسان از پارامتر `?mp=tg|bale` در URL مینی‌اپ تشخیص داده می‌شود.
 * بیرون از مینی‌اپ هیچ کاری نمی‌کند (فرم شماره نمایش داده می‌شود).
 */

interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand?: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export default function MiniAppAutoLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "trying" | "failed">("idle");

  useEffect(() => {
    const mp = searchParams.get("mp");
    const messenger = mp === "bale" ? "bale" : mp === "tg" || mp === "telegram" ? "telegram" : null;
    if (!messenger) return; // بیرون از مینی‌اپ

    // اسکریپت WebApp پیام‌رسان باید بارگذاری شده باشد؛ کمی صبر می‌کنیم تا inject شود.
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      const wa = window.Telegram?.WebApp;
      if (wa?.initData) {
        clearInterval(timer);
        setStatus("trying");
        try {
          wa.ready();
          wa.expand?.();
          const res = await fetch("/api/auth/miniapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: wa.initData, messenger }),
          });
          if (res.ok) {
            router.replace("/dashboard");
          } else {
            setStatus("failed");
          }
        } catch {
          setStatus("failed");
        }
      } else if (tries > 20) {
        clearInterval(timer); // ~۴ ثانیه صبر کردیم، خبری نشد
      }
    }, 200);

    return () => clearInterval(timer);
  }, [searchParams, router]);

  if (status === "trying") {
    return (
      <div className="fixed inset-0 z-[70] bg-[#f8f9ff] flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined animate-spin text-[#4648d4] text-[40px]">progress_activity</span>
        <p className="text-[15px] text-[#464554]">در حال ورود خودکار…</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mb-4 bg-[#ffddb8]/30 border border-[#a36700]/20 rounded-xl p-3 text-center">
        <p className="text-[13px] text-[#825100]">ورود خودکار ناموفق بود. با شماره موبایل وارد شو.</p>
      </div>
    );
  }

  return null;
}
