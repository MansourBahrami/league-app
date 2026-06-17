"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AVATARS = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"].map((a) => `/avatars/${a}.svg`);

interface Props {
  currentUrl: string | null;
  name: string | null;
}

export default function AvatarPicker({ currentUrl, name }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  async function pick(url: string) {
    setSaving(url);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: url }),
    }).catch(() => null);
    setSaving(null);
    if (res?.ok) {
      setOpen(false);
      router.refresh();
    }
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="glass-card w-full max-w-[420px] rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold text-on-surface text-center mb-4">یه آواتار انتخاب کن</h3>
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
            <button onClick={() => setOpen(false)} className="w-full mt-4 py-2 text-[13px] font-semibold text-outline hover:text-primary">
              بستن
            </button>
          </div>
        </div>
      )}
    </>
  );
}
