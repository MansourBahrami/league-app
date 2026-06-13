"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface VideoData {
  id?: string;
  title: string;
  description: string | null;
  day: number;
  durationMin: number;
  hlsUrl: string;
  thumbnailUrl: string | null;
  grades: string[];
  ctaLabel: string | null;
  ctaUrl: string | null;
  isActive: boolean;
}

const GRADES = ["دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل"];

export default function VideoForm({ initial }: { initial?: VideoData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<VideoData>(
    initial ?? {
      title: "",
      description: "",
      day: 1,
      durationMin: 10,
      hlsUrl: "",
      thumbnailUrl: "",
      grades: [],
      ctaLabel: "",
      ctaUrl: "",
      isActive: true,
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof VideoData>(key: K, value: VideoData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleGrade(g: string) {
    setForm((f) => ({
      ...f,
      grades: f.grades.includes(g) ? f.grades.filter((x) => x !== g) : [...f.grades, g],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.hlsUrl.trim()) {
      setError("عنوان و آدرس ویدیو الزامی است");
      return;
    }
    setSaving(true);
    setError("");
    const url = isEdit ? `/api/admin/videos/${initial!.id}` : "/api/admin/videos";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      router.push("/admin/videos");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "خطا در ذخیره");
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-[#c7c4d7] bg-white px-4 py-2.5 text-[15px] text-[#0b1c30] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#4648d4]/20 transition-all";
  const labelCls = "text-[13px] font-semibold text-[#0b1c30]";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-2xl p-6 border border-[#c7c4d7]/30">
      <h1 className="text-[20px] font-extrabold text-[#0b1c30]">{isEdit ? "ویرایش ویدیو" : "ویدیوی جدید"}</h1>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>عنوان *</label>
        <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>توضیحات</label>
        <textarea className={inputCls} rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>روز مسیر آنبوردینگ</label>
        <input type="number" min={1} className={inputCls} value={form.day} onChange={(e) => set("day", parseInt(e.target.value) || 1)} />
        <p className="text-[12px] text-[#767586]">طول مسیر آنبوردینگ = بزرگ‌ترین شماره روزی که ویدیوی فعال دارد. برای بلندتر کردن مسیر، ویدیوی روزِ بالاتر اضافه کنید.</p>
      </div>

      {/* پایه تحصیلی — چندانتخابی */}
      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>پایه‌های هدف (چند پایه قابل انتخاب است)</label>
        <div className="flex flex-wrap gap-2">
          {GRADES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => toggleGrade(g)}
              className={`px-3 py-2 rounded-xl text-[13px] font-semibold border transition-all flex items-center gap-1 ${
                form.grades.includes(g) ? "bg-[#4648d4] text-white border-[#4648d4]" : "border-[#c7c4d7] text-[#464554] hover:bg-[#e1e0ff]"
              }`}
            >
              {form.grades.includes(g) && <span className="material-symbols-outlined text-[14px]">check</span>}
              {g}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-[#767586]">
          {form.grades.length === 0 ? "هیچ پایه‌ای انتخاب نشده → برای همه پایه‌ها نمایش داده می‌شود." : `برای: ${form.grades.join("، ")}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>مدت (دقیقه)</label>
          <input type="number" min={1} className={inputCls} value={form.durationMin} onChange={(e) => set("durationMin", parseInt(e.target.value) || 0)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>وضعیت</label>
          <button type="button" onClick={() => set("isActive", !form.isActive)}
            className={`py-2.5 rounded-xl text-[14px] font-semibold border ${form.isActive ? "bg-[#d4f5e6] text-[#006c49] border-[#006c49]/30" : "bg-[#f3f3f3] text-[#767586] border-[#c7c4d7]"}`}>
            {form.isActive ? "فعال" : "غیرفعال"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>آدرس ویدیو (HLS .m3u8 یا mp4) *</label>
        <input dir="ltr" className={inputCls} value={form.hlsUrl} onChange={(e) => set("hlsUrl", e.target.value)} placeholder="https://...m3u8" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>آدرس تصویر بندانگشتی (اختیاری)</label>
        <input dir="ltr" className={inputCls} value={form.thumbnailUrl ?? ""} onChange={(e) => set("thumbnailUrl", e.target.value)} placeholder="https://..." />
      </div>

      {/* دکمه CTA زیر ویدیو (مثلاً درخواست مشاوره) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>متن دکمه CTA (اختیاری)</label>
          <input className={inputCls} value={form.ctaLabel ?? ""} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="درخواست مشاوره رایگان" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>لینک دکمه CTA</label>
          <input dir="ltr" className={inputCls} value={form.ctaUrl ?? ""} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="https://..." />
        </div>
      </div>
      <p className="text-[12px] text-[#767586] -mt-2">هر دو فیلد را پر کنید تا دکمه زیر ویدیو نمایش داده شود.</p>

      {error && <p className="text-[#ba1a1a] text-[13px]">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="flex-1 py-3 rounded-xl border border-[#c7c4d7] text-[#464554] text-[14px] font-semibold">
          انصراف
        </button>
        <button type="submit" disabled={saving} className="flex-grow bg-[#4648d4] text-white font-bold text-[15px] py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : (isEdit ? "ذخیره تغییرات" : "ایجاد ویدیو")}
        </button>
      </div>
    </form>
  );
}
