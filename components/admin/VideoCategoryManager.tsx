"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { captureClientError } from "@/lib/analytics-client";

interface Category {
  id: string;
  title: string;
  requireSequential: boolean;
  videoCount: number;
}

export default function VideoCategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function createCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/admin/video-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "خطا در ایجاد دسته");
      setTitle("");
      router.refresh();
    } catch (caught) {
      captureClientError("admin.video_category_create", caught);
      setError(caught instanceof Error ? caught.message : "خطا در ایجاد دسته");
    } finally {
      setCreating(false);
    }
  }

  async function updateCategory(category: Category, data: { title?: string; requireSequential?: boolean }) {
    setBusyId(category.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/video-categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "خطا در ذخیره دسته");
      router.refresh();
    } catch (caught) {
      captureClientError("admin.video_category_update", caught, { categoryId: category.id });
      setError(caught instanceof Error ? caught.message : "خطا در ذخیره دسته");
    } finally {
      setBusyId(null);
    }
  }

  async function renameCategory(category: Category) {
    const nextTitle = prompt("عنوان جدید دسته", category.title)?.trim();
    if (!nextTitle || nextTitle === category.title) return;
    await updateCategory(category, { title: nextTitle });
  }

  async function deleteCategory(category: Category) {
    const note = category.videoCount > 0
      ? `\n${category.videoCount.toLocaleString("fa-IR")} ویدیوی این دسته حذف نمی‌شوند و به ویدیوهای تکی منتقل خواهند شد.`
      : "";
    if (!confirm(`دستهٔ «${category.title}» حذف شود؟${note}`)) return;
    setBusyId(category.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/video-categories/${category.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "خطا در حذف دسته");
      router.refresh();
    } catch (caught) {
      captureClientError("admin.video_category_delete", caught, { categoryId: category.id });
      setError(caught instanceof Error ? caught.message : "خطا در حذف دسته");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4">
      <div className="mb-4">
        <h2 className="text-[16px] font-extrabold text-on-surface">دسته‌بندی ویدیوها</h2>
        <p className="mt-1 text-[12px] leading-5 text-on-surface-variant">
          با روشن‌کردن مشاهدهٔ اجباری، هر ویدیو بعد از تکمیل حداقل ۹۰٪ ویدیوی قبلی باز می‌شود.
        </p>
      </div>

      <form onSubmit={createCategory} className="mb-4 flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="مثلاً دوره روش مطالعه"
          className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-[14px] text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="rounded-xl bg-primary px-4 py-2.5 text-[13px] font-bold text-on-primary disabled:opacity-50"
        >
          {creating ? "در حال ایجاد…" : "ایجاد دسته"}
        </button>
      </form>

      {initialCategories.length === 0 ? (
        <p className="rounded-xl bg-surface-container-low px-3 py-4 text-center text-[13px] text-outline">
          هنوز دسته‌ای تعریف نشده است.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {initialCategories.map((category) => {
            const busy = busyId === category.id;
            return (
              <div key={category.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface px-3 py-3">
                <div className="min-w-[150px] flex-1">
                  <p className="text-[14px] font-bold text-on-surface">{category.title}</p>
                  <p className="mt-0.5 text-[11px] text-outline">{category.videoCount.toLocaleString("fa-IR")} ویدیو</p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-on-surface-variant">
                  <span>مشاهده به‌ترتیب</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={category.requireSequential}
                    disabled={busy}
                    onClick={() => updateCategory(category, { requireSequential: !category.requireSequential })}
                    className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${category.requireSequential ? "bg-primary" : "bg-outline-variant"}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-surface-container-lowest shadow-sm transition-all ${category.requireSequential ? "right-1" : "right-6"}`} />
                  </button>
                </label>
                <button type="button" disabled={busy} onClick={() => renameCategory(category)} className="rounded-lg p-2 text-primary hover:bg-primary-fixed disabled:opacity-50" aria-label={`ویرایش عنوان ${category.title}`}>
                  <span className="material-symbols-outlined text-[19px]">edit</span>
                </button>
                <button type="button" disabled={busy} onClick={() => deleteCategory(category)} className="rounded-lg p-2 text-error hover:bg-error/10 disabled:opacity-50" aria-label={`حذف ${category.title}`}>
                  <span className={`material-symbols-outlined text-[19px] ${busy ? "animate-spin" : ""}`}>{busy ? "progress_activity" : "delete"}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
      {error && <p className="mt-3 text-[12px] font-semibold text-error">{error}</p>}
    </section>
  );
}
