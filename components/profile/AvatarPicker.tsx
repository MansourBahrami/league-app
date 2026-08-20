"use client";

import { useEffect, useRef, useState } from "react";
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
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // پیش‌نمایش عکس آپلودی قبل از تأیید نهایی
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function clearPreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreview(null);
  }

  function openPicker() {
    clearPreview();
    setSelectedAvatar(null);
    setConfirmingRemoval(false);
    setError(null);
    setOpen(true);
  }

  async function saveReadyAvatar(url: string) {
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
      setError("عکس ذخیره نشد؛ دوباره تلاش کن.");
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // اجازه‌ی انتخاب دوباره‌ی همان فایل
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("یک تصویر انتخاب کن.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("حجم تصویر باید کمتر از ۸ مگابایت باشه.");
      return;
    }
    try {
      const blob = await fileToSquareBlob(file);
      clearPreview();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreview({ url, blob });
    } catch {
      setError("پردازش تصویر انجام نشد؛ تصویر دیگری انتخاب کن.");
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
      setError("عکس ذخیره نشد؛ دوباره تلاش کن.");
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
      setError("عکس حذف نشد؛ دوباره تلاش کن.");
    }
  }

  function closeAll() {
    if (saving) return;
    setOpen(false);
    clearPreview();
    setSelectedAvatar(null);
    setConfirmingRemoval(false);
    setError(null);
  }

  function returnToPicker() {
    clearPreview();
    setConfirmingRemoval(false);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [confirmingRemoval, open, preview]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !saving) {
      event.preventDefault();
      closeAll();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const dialogTitle = preview
    ? "این عکس ذخیره بشه؟"
    : confirmingRemoval
      ? "عکس پروفایل حذف بشه؟"
      : "عکس پروفایل";

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        aria-label="تغییر عکس پروفایل"
        className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 mb-3 group"
      >
        {currentUrl ? (
          <img src={currentUrl} className="w-full h-full object-cover" alt={name ? `عکس پروفایل ${name}` : "عکس پروفایل"} />
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
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-dialog-title"
            aria-describedby={confirmingRemoval ? "avatar-remove-description" : undefined}
            onKeyDown={handleDialogKeyDown}
            className="glass-card w-full max-w-[420px] rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ورودی فایل پنهان */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />

            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 id="avatar-dialog-title" className="text-[16px] font-bold text-on-surface">{dialogTitle}</h3>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeAll}
                disabled={!!saving}
                aria-label="بستن انتخاب عکس پروفایل"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {preview ? (
              /* مرحله‌ی پیش‌نمایش و تأیید عکس آپلودی */
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20">
                    <img src={preview.url} className="w-full h-full object-cover" alt="پیش‌نمایش" />
                  </div>
                </div>
                {error && <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-[12px] text-error text-center mb-3">{error}</p>}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={confirmUpload}
                    disabled={!!saving}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[14px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {saving === "__upload__" ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    ) : (
                      "ذخیره عکس"
                    )}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!!saving}
                    className="px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-[14px] font-semibold disabled:opacity-50"
                  >
                    انتخاب عکس دیگر
                  </button>
                  <button
                    type="button"
                    onClick={returnToPicker}
                    disabled={!!saving}
                    className="px-4 py-2 text-[13px] font-semibold text-on-surface-variant hover:text-primary disabled:opacity-50"
                  >
                    بازگشت
                  </button>
                </div>
              </>
            ) : confirmingRemoval ? (
              <>
                <p id="avatar-remove-description" className="mb-5 text-[13px] leading-6 text-on-surface-variant">
                  بعداً می‌تونی دوباره عکس یا آواتار انتخاب کنی.
                </p>
                {error && <p role="alert" className="mb-3 rounded-xl bg-error/10 px-3 py-2 text-center text-[12px] text-error">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={removeAvatar}
                    disabled={!!saving}
                    className="flex-1 rounded-xl bg-error py-2.5 text-[14px] font-bold text-on-error disabled:opacity-50"
                  >
                    {saving === "__remove__" ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    ) : (
                      "حذف عکس"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmingRemoval(false); setError(null); }}
                    disabled={!!saving}
                    className="flex-1 rounded-xl bg-surface-container-high py-2.5 text-[14px] font-semibold text-on-surface disabled:opacity-50"
                  >
                    انصراف
                  </button>
                </div>
              </>
            ) : (
              /* مرحله‌ی انتخاب: آپلود عکس یا آواتار آماده */
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mb-4 py-3 rounded-xl border-2 border-dashed border-primary/40 text-primary text-[14px] font-bold flex items-center justify-center gap-1.5 hover:bg-primary-fixed/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
                  انتخاب عکس از گالری
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <span className="flex-1 h-px bg-outline/20" />
                  <span className="text-[11px] text-outline">یا انتخاب آواتار</span>
                  <span className="flex-1 h-px bg-outline/20" />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {AVATARS.map((url, index) => {
                    const isCurrent = url === currentUrl;
                    const isSelected = selectedAvatar ? url === selectedAvatar : isCurrent;
                    return (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setSelectedAvatar(isCurrent ? null : url)}
                        disabled={!!saving}
                        aria-label={`آواتار ${(index + 1).toLocaleString("fa-IR")}${isCurrent ? "، عکس فعلی" : ""}`}
                        aria-pressed={isSelected}
                        className={`relative rounded-full overflow-hidden border-2 transition-all ${
                          isSelected ? "border-primary scale-105" : "border-transparent hover:border-primary/40"
                        } disabled:opacity-50`}
                      >
                        <img src={url} className="w-full h-full object-cover" alt="" />
                      </button>
                    );
                  })}
                </div>

                {error && <p role="alert" className="mt-3 rounded-xl bg-error/10 px-3 py-2 text-[12px] text-error text-center">{error}</p>}

                {selectedAvatar && selectedAvatar !== currentUrl && (
                  <button
                    type="button"
                    onClick={() => saveReadyAvatar(selectedAvatar)}
                    disabled={!!saving}
                    className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl bg-primary py-3 text-[14px] font-bold text-on-primary disabled:opacity-50"
                  >
                    {saving === selectedAvatar ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    ) : (
                      "ذخیره آواتار"
                    )}
                  </button>
                )}

                {/* حذف عکس فعلی و بازگشت به حالت بدون عکس */}
                {currentUrl && (
                  <button
                    type="button"
                    onClick={() => { setConfirmingRemoval(true); setError(null); }}
                    disabled={!!saving}
                    className="w-full mt-4 py-2 text-[13px] font-semibold text-error hover:bg-error/10 rounded-xl disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    حذف عکس
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
