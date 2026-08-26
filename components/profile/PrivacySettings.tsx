"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { captureClientError, resetAnalyticsUser } from "@/lib/analytics-client";

export default function PrivacySettings({
  initialProfilePublic,
  initialActivityPublic,
}: {
  initialProfilePublic: boolean;
  initialActivityPublic: boolean;
}) {
  const router = useRouter();
  const [profilePublic, setProfilePublic] = useState(initialProfilePublic);
  const [activityPublic, setActivityPublic] = useState(initialActivityPublic);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  async function save(nextProfile: boolean, nextActivity: boolean) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/privacy/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profilePublic: nextProfile, activityPublic: nextActivity }),
    }).catch((caught) => {
      captureClientError("privacy.settings", caught);
      return null;
    });
    setSaving(false);
    setMessage(response?.ok ? "تنظیمات حریم خصوصی ذخیره شد." : "ذخیره تنظیمات ناموفق بود.");
    if (!response?.ok) {
      setProfilePublic(initialProfilePublic);
      setActivityPublic(initialActivityPublic);
    }
  }

  async function removeAccount() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/privacy/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation }),
    }).catch((caught) => {
      captureClientError("privacy.delete_account", caught);
      return null;
    });
    setSaving(false);
    if (!response?.ok) {
      const data = await response?.json().catch((caught) => {
        captureClientError("privacy.delete_response", caught);
        return null;
      }) as { error?: string } | null;
      setMessage(data?.error ?? "حذف حساب انجام نشد.");
      return;
    }
    resetAnalyticsUser();
    router.replace("/login");
  }

  return (
    <section className="glass-card rounded-xl p-4" aria-labelledby="privacy-title">
      <h3 id="privacy-title" className="text-[15px] font-bold text-on-surface">حریم خصوصی و داده‌ها</h3>
      <div className="mt-3 space-y-3">
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span className="text-[14px] text-on-surface">نمایش پروفایل به دیگران</span>
          <input type="checkbox" checked={profilePublic} disabled={saving} onChange={(event) => {
            const value = event.target.checked;
            setProfilePublic(value);
            void save(value, activityPublic);
          }} className="h-5 w-5 accent-primary" />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span className="text-[14px] text-on-surface">نمایش فعالیت در بورد زنده</span>
          <input type="checkbox" checked={activityPublic} disabled={saving} onChange={(event) => {
            const value = event.target.checked;
            setActivityPublic(value);
            void save(profilePublic, value);
          }} className="h-5 w-5 accent-primary" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-outline-variant/50 pt-3">
        <a href="/api/privacy/export" download className="flex min-h-11 items-center rounded-xl border border-outline-variant px-4 text-[14px] font-bold text-primary">دریافت خروجی داده‌ها</a>
        <button type="button" onClick={() => setShowDelete((value) => !value)} className="min-h-11 rounded-xl px-4 text-[14px] font-bold text-error">حذف حساب</button>
      </div>
      {showDelete && (
        <div className="mt-3 rounded-xl bg-error-container/60 p-3">
          <p className="text-[13px] leading-6 text-on-error-container">این کار برگشت‌پذیر نیست. برای تأیید، عبارت «حذف حساب من» را وارد کن.</p>
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-error/30 bg-surface-container-lowest px-3 text-[16px]" aria-label="عبارت تأیید حذف حساب" />
          <button type="button" onClick={removeAccount} disabled={saving || confirmation !== "حذف حساب من"} className="mt-2 min-h-11 w-full rounded-xl bg-error px-4 text-[14px] font-bold text-on-error disabled:opacity-50">حذف دائمی حساب و داده‌ها</button>
        </div>
      )}
      {message && <p role="status" className="mt-2 text-[13px] text-on-surface-variant">{message}</p>}
    </section>
  );
}
