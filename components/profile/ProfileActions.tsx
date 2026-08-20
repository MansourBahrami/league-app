"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gradeRequiresField, STUDENT_GRADES, STUDY_FIELDS } from "@/lib/student-profile";

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
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const canSave = !!name.trim() && !!grade && (!gradeRequiresField(grade) || !!field);

  function openEditor() {
    setName(user.name ?? "");
    setGrade(user.grade ?? "");
    setField(user.field ?? "");
    setError("");
    setShowEdit(true);
  }

  function closeEditor() {
    if (saving) return;
    setShowEdit(false);
    setName(user.name ?? "");
    setGrade(user.grade ?? "");
    setField(user.field ?? "");
    setError("");
  }

  useEffect(() => {
    if (!showEdit) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => nameInputRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [showEdit]);

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !saving) {
      event.preventDefault();
      closeEditor();
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

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), grade, field: gradeRequiresField(grade) ? field : null }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      const data = await response?.json().catch(() => null) as { error?: string } | null;
      setError(data?.error ?? "تغییرات ذخیره نشد؛ دوباره تلاش کن.");
      return;
    }
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
          type="button"
          onClick={openEditor}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/30 text-primary text-[14px] font-semibold hover:bg-primary-fixed transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          ویرایش پروفایل
        </button>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-error/20 text-error text-[14px] font-semibold hover:bg-error/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          خروج
        </button>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-on-surface/55 px-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            onKeyDown={handleDialogKeyDown}
            className="glass-card max-h-[calc(100dvh-7rem)] w-full max-w-[500px] overflow-y-auto rounded-2xl p-6 pb-8"
          >
            <div className="flex justify-between items-center mb-5">
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                aria-label="بستن ویرایش پروفایل"
                className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <h3 id="edit-profile-title" className="text-[17px] font-bold text-on-surface">ویرایش پروفایل</h3>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-name" className="text-[14px] font-semibold text-on-surface text-right">نام نمایشی</label>
                <p id="profile-name-help" className="text-right text-[11.5px] text-on-surface-variant">در رده‌بندی نمایش داده می‌شه.</p>
                <input
                  ref={nameInputRef}
                  id="profile-name"
                  type="text"
                  required
                  maxLength={80}
                  autoComplete="name"
                  aria-describedby="profile-name-help"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest/80 px-4 py-3 text-[16px] text-right transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1.5" role="group" aria-labelledby="profile-grade-label">
                <p id="profile-grade-label" className="text-[14px] font-semibold text-on-surface text-right">پایه</p>
                <div className="grid grid-cols-4 gap-2">
                  {STUDENT_GRADES.map((g) => (
                    <button key={g} type="button" aria-pressed={grade === g} onClick={() => { setGrade(g); if (!gradeRequiresField(g)) setField(""); }}
                      className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${grade === g ? "bg-primary text-on-primary border-primary" : "border-outline-variant text-on-surface-variant hover:bg-primary-fixed"}`}
                    >{g}</button>
                  ))}
                </div>
              </div>

              {gradeRequiresField(grade) && <div className="flex flex-col gap-1.5" role="group" aria-labelledby="profile-field-label">
                <p id="profile-field-label" className="text-[14px] font-semibold text-on-surface text-right">رشته</p>
                <div className="grid grid-cols-3 gap-2">
                  {STUDY_FIELDS.map((f) => (
                    <button key={f} type="button" aria-pressed={field === f} onClick={() => setField(f)}
                      className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${field === f ? "bg-primary text-on-primary border-primary" : "border-outline-variant text-on-surface-variant hover:bg-primary-fixed"}`}
                    >{f}</button>
                  ))}
                </div>
              </div>}

              {error && <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-center text-[12.5px] text-error">{error}</p>}

              <button
                type="submit"
                disabled={saving || !canSave}
                className="gamified-btn mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-[16px] font-bold text-on-primary shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {saving ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : "ذخیره"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
