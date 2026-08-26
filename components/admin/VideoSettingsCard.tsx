"use client";

import { useState } from "react";
import type { VideoUnlockMode } from "@/lib/settings";
import { captureClientError } from "@/lib/analytics-client";

interface Props {
  initialMode: VideoUnlockMode;
}

export default function VideoSettingsCard({ initialMode }: Props) {
  const [mode, setMode] = useState<VideoUnlockMode>(initialMode);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleModeChange(newMode: VideoUnlockMode) {
    setMode(newMode);
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUnlockMode: newMode }),
      });
      if (res.ok) {
        setMessage("تنظیمات با موفقیت ذخیره شد.");
      } else {
        setMessage("خطا در ذخیره تنظیمات.");
      }
    } catch (caught) {
      captureClientError("admin.video_settings", caught, { mode: newMode });
      setMessage("خطا در ارتباط با سرور.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  }

  return (
    <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/30 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
        <h2 className="text-[16px] font-bold text-on-surface">تنظیم دسترسی به ویدیوها برای کاربران</h2>
      </div>
      <p className="text-[13px] text-on-surface-variant">
        نحوه باز شدن ویدیوهای آموزشی برای کاربران را مشخص کنید (جدا از مسیر آنبوردینگ):
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
        <button
          type="button"
          onClick={() => handleModeChange("all")}
          disabled={saving}
          className={`flex items-start gap-3 p-3.5 rounded-xl border text-right transition-all ${
            mode === "all"
              ? "bg-primary-fixed/50 border-primary shadow-sm"
              : "bg-surface border-outline-variant/40 hover:bg-surface-container-high"
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] mt-0.5 ${mode === "all" ? "text-primary font-bold" : "text-outline"}`}>
            {mode === "all" ? "radio_button_checked" : "radio_button_unchecked"}
          </span>
          <div>
            <p className="text-[14px] font-bold text-on-surface">همه ویدیوها از ابتدا باز باشند</p>
            <p className="text-[12px] text-on-surface-variant mt-0.5">کاربر بلافاصله به تمام ویدیوهای متناسب با پایه خود دسترسی دارد.</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange("daily")}
          disabled={saving}
          className={`flex items-start gap-3 p-3.5 rounded-xl border text-right transition-all ${
            mode === "daily"
              ? "bg-primary-fixed/50 border-primary shadow-sm"
              : "bg-surface border-outline-variant/40 hover:bg-surface-container-high"
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] mt-0.5 ${mode === "daily" ? "text-primary font-bold" : "text-outline"}`}>
            {mode === "daily" ? "radio_button_checked" : "radio_button_unchecked"}
          </span>
          <div>
            <p className="text-[14px] font-bold text-on-surface">ویدیوها روزبه‌روز باز شوند</p>
            <p className="text-[12px] text-on-surface-variant mt-0.5">هر ویدیو بر اساس تعداد روزهای گذشته از ثبت‌نام کاربر در دسترس قرار می‌گیرد.</p>
          </div>
        </button>
      </div>

      {message && (
        <p className="text-[12px] font-semibold text-primary mt-1">{message}</p>
      )}
    </div>
  );
}
