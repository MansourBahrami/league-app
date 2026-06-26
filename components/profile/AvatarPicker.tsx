"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const AVATARS = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"].map((a) => `/avatars/${a}.svg`);

const OUTPUT_SIZE = 256; // عکس آپلودی به مربع ۲۵۶px کاهش می‌یابد (چند ده KB)
const MAX_INPUT_BYTES = 8 * 1024 * 1024; // سقف فایل ورودی قبل از پردازش

interface Props {
  currentUrl: string | null;
  name: string | null;
}

// فایل انتخابی را در کلاینت به یک مربعِ مرکزی ۲۵۶px تبدیل و به WebP (یا JPEG) فشرده می‌کند.
async function fileToSquareBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/webp", 0.85);
  });
  if (blob) return blob;
  // fallback اگر مرورگر WebP encode را پشتیبانی نکند
  const jpeg = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
  });
  if (!jpeg) throw new Error("encode failed");
  return jpeg;
}

export default function AvatarPicker({ currentUrl, name }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // پیش‌نمایش عکس آپلودی قبل از تأیید نهایی
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(url: string) {
    setSaving(url);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: url }),
    }).catch(() => null);
    setSaving(null);
    if (res?.ok) {
      closeAll();
      router.refresh();
    } else {
      setError("ذخیره نشد، دوباره تلاش کن");
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // اجازه‌ی انتخاب دوباره‌ی همان فایل
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("یک فایل تصویری انتخاب کن");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("تصویر خیلی بزرگ است (حداکثر ۸ مگابایت)");
      return;
    }
    try {
      const blob = await fileToSquareBlob(file);
      setPreview({ url: URL.createObjectURL(blob), blob });
    } catch {
      setError("نشد این تصویر را پردازش کنیم");
    }
  }

  async function confirmUpload() {
    if (!preview) return;
    setSaving("__upload__");
    setError(null);
    const res = await fetch("/api/profile/avatar", {
      method: "POST",
      headers: { "Content-Type": preview.blob.type },
      body: preview.blob,
    }).catch(() => null);
    setSaving(null);
    if (res?.ok) {
      closeAll();
      router.refresh();
    } else {
      const msg = await res?.json().catch(() => null);
      setError(msg?.error ?? "آپلود نشد، دوباره تلاش کن");
    }
  }

  async function removeAvatar() {
    setSaving("__remove__");
    setError(null);
    const res = await fetch("/api/profile/avatar", { method: "DELETE" }).catch(() => null);
    setSaving(null);
    if (res?.ok) {
      closeAll();
      router.refresh();
    } else {
      setError("حذف نشد، دوباره تلاش کن");
    }
  }

  function closeAll() {
    setOpen(false);
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setError(null);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 mb-3 group">
        {currentUrl ? (
          <img src={currentUrl} className="w-full h-full object-cover" alt={name ?? "avatar"} />
        ) : (
          <div className="w-full h-full bg-primary-fixed flex items-center justify-center text-[36px] font-extrabold text-primary">
            {name ? name[0] : "؟"}
          </div>
        )}
        {/* دکمه ویرایش روی آواتار */}
        <span className="absolute bottom-0 inset-x-0 bg-primary/80 text-white text-[10px] font-bold py-1 flex items-center justify-center gap-0.5">
          <span className="material-symbols-outlined text-[12px]">edit</span>
          تغییر
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 pt-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))] bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={closeAll}>
          <div className="glass-card w-full max-w-[420px] rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            {/* ورودی فایل پنهان */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />

            {preview ? (
              /* مرحله‌ی پیش‌نمایش و تأیید عکس آپلودی */
              <>
                <h3 className="text-[16px] font-bold text-on-surface text-center mb-4">تأیید عکس پروفایل</h3>
                <div className="flex justify-center mb-4">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20">
                    <img src={preview.url} className="w-full h-full object-cover" alt="پیش‌نمایش" />
                  </div>
                </div>
                {error && <p className="text-[12px] text-error text-center mb-3">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={confirmUpload}
                    disabled={!!saving}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[14px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {saving === "__upload__" ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    ) : (
                      "تأیید و ذخیره"
                    )}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!!saving}
                    className="px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-[14px] font-semibold disabled:opacity-50"
                  >
                    عکس دیگر
                  </button>
                </div>
              </>
            ) : (
              /* مرحله‌ی انتخاب: آپلود عکس یا آواتار آماده */
              <>
                <h3 className="text-[16px] font-bold text-on-surface text-center mb-4">عکس پروفایل</h3>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mb-4 py-3 rounded-xl border-2 border-dashed border-primary/40 text-primary text-[14px] font-bold flex items-center justify-center gap-1.5 hover:bg-primary-fixed/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
                  آپلود عکس از گالری
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <span className="flex-1 h-px bg-outline/20" />
                  <span className="text-[11px] text-outline">یا یک آواتار آماده</span>
                  <span className="flex-1 h-px bg-outline/20" />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {AVATARS.map((url) => {
                    const isCurrent = url === currentUrl;
                    return (
                      <button
                        key={url}
                        type="button"
                        onClick={() => pick(url)}
                        disabled={!!saving}
                        className={`relative rounded-full overflow-hidden border-2 transition-all ${
                          isCurrent ? "border-primary scale-105" : "border-transparent hover:border-primary/40"
                        } disabled:opacity-50`}
                      >
                        <img src={url} className="w-full h-full object-cover" alt="avatar" />
                        {saving === url && (
                          <span className="absolute inset-0 flex items-center justify-center bg-white/60">
                            <span className="material-symbols-outlined animate-spin text-primary text-[20px]">progress_activity</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {error && <p className="text-[12px] text-error text-center mt-3">{error}</p>}

                {/* حذف عکس فعلی و بازگشت به حالت بدون عکس */}
                {currentUrl && (
                  <button
                    onClick={removeAvatar}
                    disabled={!!saving}
                    className="w-full mt-4 py-2 text-[13px] font-semibold text-error hover:bg-error/10 rounded-xl disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {saving === "__remove__" ? (
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        حذف عکس فعلی
                      </>
                    )}
                  </button>
                )}

                <button onClick={closeAll} className="w-full mt-2 py-2 text-[13px] font-semibold text-outline hover:text-primary">
                  بستن
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
