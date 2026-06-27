"use client";

import { useState } from "react";
import { normalizeDigits } from "@/lib/phone";

interface Props {
  onComplete: () => void;
  /** آیا کاربر از قبل موبایلِ ثبت‌شده دارد (ورود با OTP) — اگر بله، مرحله‌ی موبایل رد می‌شود */
  hasPhone?: boolean;
}

const GRADES = ["دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل"];
const FIELDS = ["ریاضی", "تجربی", "انسانی", "هنر", "فنی-حرفه‌ای"];

export default function LeadCaptureModal({ onComplete, hasPhone = false }: Props) {
  const [stage, setStage] = useState<"info" | "otp">("info");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [field, setField] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !grade || !field) {
      setError("لطفاً نام، پایه و رشته را کامل کن");
      return;
    }
    if (!hasPhone && !/^09[0-9]{9}$/.test(phone)) {
      setError("شماره موبایل معتبر وارد کن (۰۹...)");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // ذخیره نام/پایه/رشته
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), grade, field }),
      });
      if (!res.ok) throw new Error();

      if (hasPhone) {
        onComplete(); // موبایل از قبل تأییدشده → لید کامل است
        return;
      }
      // ارسال کد به موبایل
      const otpRes = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const otpData = await otpRes.json().catch(() => ({}));
      if (!otpRes.ok) {
        setError(otpData.error ?? "ارسال کد ناموفق بود");
        return;
      }
      if (otpData._dev_otp) setCode(otpData._dev_otp);
      setStage("otp");
    } catch {
      setError("خطا در ذخیره اطلاعات، دوباره امتحان کن");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { setError("کد تأیید را وارد کن"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/profile/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "کد اشتباه است"); return; }
      onComplete();
    } catch {
      setError("خطا در تأیید، دوباره امتحان کن");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-outline-variant bg-white/80 px-4 py-3 text-[16px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-right";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 pt-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))] bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="glass-card w-full max-w-[500px] rounded-2xl p-6 pb-8 relative">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-3">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {stage === "otp" ? "sms" : "emoji_events"}
            </span>
          </div>
          <h2 className="text-[22px] font-extrabold text-on-surface text-center">
            {stage === "otp" ? "تأیید شماره موبایل" : "اولین جلسه‌ات تموم شد!"}
          </h2>
          <p className="text-[14px] text-on-surface-variant text-center mt-1">
            {stage === "otp"
              ? `کد ۶ رقمی به ${phone} ارسال شد`
              : "برای ادامه، این اطلاعات رو کامل کن"}
          </p>
        </div>

        {stage === "info" ? (
          <form onSubmit={handleInfoSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">اسمت چیه؟</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: علی" className={inputCls} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">چه پایه‌ای هستی؟</label>
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map((g) => (
                  <button key={g} type="button" onClick={() => setGrade(g)}
                    className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${grade === g ? "bg-primary text-white border-primary shadow-md scale-[1.03]" : "border-outline-variant text-on-surface-variant hover:bg-primary-fixed"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">رشته‌ات؟</label>
              <div className="grid grid-cols-3 gap-2">
                {FIELDS.map((f) => (
                  <button key={f} type="button" onClick={() => setField(f)}
                    className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${field === f ? "bg-primary text-white border-primary shadow-md scale-[1.03]" : "border-outline-variant text-on-surface-variant hover:bg-primary-fixed"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {!hasPhone && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">شماره موبایل (با تأیید پیامکی)</label>
                <input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(normalizeDigits(e.target.value))} placeholder="09123456789" dir="ltr" className={`${inputCls} text-center`} required />
              </div>
            )}

            {error && <p className="text-error text-[13px] text-center">{error}</p>}

            <button type="submit" disabled={loading} className="gamified-btn w-full bg-primary text-white font-bold text-[16px] py-4 rounded-xl flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primary/20 disabled:opacity-60">
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{hasPhone ? "check_circle" : "send"}</span>
                  {hasPhone ? "ثبت و ادامه" : "ارسال کد تأیید"}
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
            <input
              type="text" inputMode="numeric" value={code}
              onChange={(e) => setCode(normalizeDigits(e.target.value))}
              placeholder="------" maxLength={6} dir="ltr"
              className="w-full rounded-xl border border-outline-variant bg-white/80 px-4 py-3 text-[24px] font-mono text-primary placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-center tracking-[0.5rem]"
              required
            />
            {error && <p className="text-error text-[13px] text-center">{error}</p>}
            <button type="submit" disabled={loading} className="gamified-btn w-full bg-primary text-white font-bold text-[16px] py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-60">
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  تأیید و ادامه
                </>
              )}
            </button>
            <button type="button" onClick={() => { setStage("info"); setError(""); }} className="text-[13px] text-primary hover:underline text-center">
              ویرایش شماره موبایل
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
