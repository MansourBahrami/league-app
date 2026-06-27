"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TournamentData {
  id?: string;
  name: string;
  description: string | null;
  startAt: string; // datetime-local string
  endAt: string;
  entryCost: number;
  prizeXp: number;
  prizeCoins: number;
  levels: string[];
  isActive: boolean;
}

const LEVELS = ["تازه‌نفس", "ثابت‌قدم", "پیشرو", "سرآمد", "الگو"];

export default function TournamentForm({ initial }: { initial?: TournamentData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<TournamentData>(
    initial ?? {
      name: "",
      description: "",
      startAt: "",
      endAt: "",
      entryCost: 0,
      prizeXp: 100,
      prizeCoins: 50,
      levels: [],
      isActive: true,
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof TournamentData>(key: K, value: TournamentData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleLevel(l: string) {
    setForm((f) => ({ ...f, levels: f.levels.includes(l) ? f.levels.filter((x) => x !== l) : [...f.levels, l] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.startAt || !form.endAt) {
      setError("نام، زمان شروع و پایان الزامی است");
      return;
    }
    setSaving(true);
    setError("");
    const url = isEdit ? `/api/admin/tournaments/${initial!.id}` : "/api/admin/tournaments";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
      }),
    });
    if (res.ok) {
      router.push("/admin/tournaments");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "خطا در ذخیره");
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-[15px] text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";
  const labelCls = "text-[13px] font-semibold text-on-surface";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-2xl p-6 border border-outline-variant/30">
      <h1 className="text-[20px] font-extrabold text-on-surface">{isEdit ? "ویرایش تورنومنت" : "تورنومنت جدید"}</h1>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>نام *</label>
        <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>توضیحات</label>
        <textarea className={inputCls} rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>شروع *</label>
          <input type="datetime-local" className={inputCls} value={form.startAt} onChange={(e) => set("startAt", e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>پایان *</label>
          <input type="datetime-local" className={inputCls} value={form.endAt} onChange={(e) => set("endAt", e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>هزینه ورود (سکه)</label>
          <input type="number" min={0} className={inputCls} value={form.entryCost} onChange={(e) => set("entryCost", parseInt(e.target.value) || 0)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>جایزه XP</label>
          <input type="number" min={0} className={inputCls} value={form.prizeXp} onChange={(e) => set("prizeXp", parseInt(e.target.value) || 0)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>جایزه سکه</label>
          <input type="number" min={0} className={inputCls} value={form.prizeCoins} onChange={(e) => set("prizeCoins", parseInt(e.target.value) || 0)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>محدودیت سطح (خالی = همه سطوح)</label>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggleLevel(l)}
              className={`px-3 py-2 rounded-xl text-[13px] font-semibold border transition-all flex items-center gap-1 ${
                form.levels.includes(l) ? "bg-primary text-white border-primary" : "border-outline-variant text-on-surface-variant hover:bg-primary-fixed"
              }`}
            >
              {form.levels.includes(l) && <span className="material-symbols-outlined text-[14px]">check</span>}
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>وضعیت</label>
        <button type="button" onClick={() => set("isActive", !form.isActive)}
          className={`py-2.5 rounded-xl text-[14px] font-semibold border ${form.isActive ? "bg-[#d4f5e6] text-tertiary border-tertiary/30" : "bg-[#f3f3f3] text-outline border-outline-variant"}`}>
          {form.isActive ? "فعال" : "غیرفعال"}
        </button>
      </div>

      {error && <p className="text-error text-[13px]">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant text-[14px] font-semibold">
          انصراف
        </button>
        <button type="submit" disabled={saving} className="flex-grow bg-primary text-white font-bold text-[15px] py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : (isEdit ? "ذخیره تغییرات" : "ایجاد تورنومنت")}
        </button>
      </div>
    </form>
  );
}
