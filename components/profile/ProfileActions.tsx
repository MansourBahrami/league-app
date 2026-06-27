"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GRADES = ["دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل"];
const FIELDS = ["ریاضی", "تجربی", "انسانی", "هنر", "فنی-حرفه‌ای"];

interface Props {
  user: {
    name: string | null;
    grade: string | null;
    field: string | null;
  };
}

export default function ProfileActions({ user }: Props) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState(user.name ?? "");
  const [grade, setGrade] = useState(user.grade ?? "");
  const [field, setField] = useState(user.field ?? "");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, grade, field }),
    });
    setSaving(false);
    setShowEdit(false);
    router.refresh();
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => setShowEdit(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/30 text-primary text-[14px] font-semibold hover:bg-primary-fixed transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          ویرایش پروفایل
        </button>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-error/20 text-error text-[14px] font-semibold hover:bg-error/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          خروج
        </button>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center px-4 pt-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))] bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-[500px] rounded-2xl p-6 pb-8">
            <div className="flex justify-between items-center mb-5">
              <button onClick={() => setShowEdit(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h3 className="text-[17px] font-bold text-on-surface">ویرایش پروفایل</h3>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface text-right">اسم</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant bg-white/80 px-4 py-3 text-[16px] text-right focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface text-right">پایه</label>
                <div className="grid grid-cols-4 gap-2">
                  {GRADES.map((g) => (
                    <button key={g} type="button" onClick={() => setGrade(g)}
                      className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${grade === g ? "bg-primary text-white border-primary" : "border-outline-variant text-on-surface-variant hover:bg-primary-fixed"}`}
                    >{g}</button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface text-right">رشته</label>
                <div className="grid grid-cols-3 gap-2">
                  {FIELDS.map((f) => (
                    <button key={f} type="button" onClick={() => setField(f)}
                      className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${field === f ? "bg-primary text-white border-primary" : "border-outline-variant text-on-surface-variant hover:bg-primary-fixed"}`}
                    >{f}</button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="gamified-btn w-full bg-primary text-white font-bold text-[16px] py-4 rounded-xl flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primary/20"
              >
                {saving ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : "ذخیره تغییرات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
