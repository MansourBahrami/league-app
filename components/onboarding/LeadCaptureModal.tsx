"use client";

import { useState } from "react";

interface Props {
  onComplete: () => void;
}

const GRADES = ["دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل"];
const FIELDS = ["ریاضی", "تجربی", "انسانی", "هنر", "فنی-حرفه‌ای"];

export default function LeadCaptureModal({ onComplete }: Props) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [field, setField] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !grade || !field) {
      setError("لطفاً همه فیلدها را پر کن");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), grade, field }),
      });
      if (!res.ok) throw new Error();
      onComplete();
    } catch {
      setError("خطا در ذخیره اطلاعات، دوباره امتحان کن");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full max-w-[500px] rounded-2xl p-6 pb-8 relative animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#4648d4] flex items-center justify-center shadow-lg shadow-[#4648d4]/30 mb-3">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              emoji_events
            </span>
          </div>
          <h2 className="text-[22px] font-extrabold text-[#0b1c30] text-center">اولین جلسه‌ات تموم شد!</h2>
          <p className="text-[14px] text-[#464554] text-center mt-1">
            قبل از ادامه، یه اطلاعات کوچیک از خودت بده
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-semibold text-[#0b1c30]">اسمت چیه؟</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: علی"
              className="w-full rounded-xl border border-[#c7c4d7] bg-white/80 px-4 py-3 text-[16px] text-[#0b1c30] placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#4648d4]/20 transition-all text-right"
              required
            />
          </div>

          {/* Grade */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-semibold text-[#0b1c30]">چه پایه‌ای هستی؟</label>
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${
                    grade === g
                      ? "bg-[#4648d4] text-white border-[#4648d4] shadow-md scale-[1.03]"
                      : "border-[#c7c4d7] text-[#464554] hover:bg-[#e1e0ff]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-semibold text-[#0b1c30]">رشته‌ات؟</label>
            <div className="grid grid-cols-3 gap-2">
              {FIELDS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setField(f)}
                  className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${
                    field === f
                      ? "bg-[#4648d4] text-white border-[#4648d4] shadow-md scale-[1.03]"
                      : "border-[#c7c4d7] text-[#464554] hover:bg-[#e1e0ff]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[#ba1a1a] text-[13px] text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="gamified-btn w-full bg-[#4648d4] text-white font-bold text-[16px] py-4 rounded-xl flex items-center justify-center gap-2 mt-2 shadow-lg shadow-[#4648d4]/20 disabled:opacity-60"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                ثبت و ادامه
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
