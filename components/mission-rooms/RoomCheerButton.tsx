"use client";

import { useState } from "react";

const OPTIONS = [
  { key: "lets_go", label: "بزن بریم", icon: "fitness_center" },
  { key: "keep_going", label: "ادامه بده", icon: "local_fire_department" },
  { key: "almost_there", label: "نزدیک شدی", icon: "track_changes" },
] as const;

export default function RoomCheerButton({ roomId, targetUserId }: { roomId: string; targetUserId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function send(cheer: string) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/mission-rooms/${roomId}/cheer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, cheer }),
    }).catch(() => null);
    const data = await response?.json().catch(() => ({})) as { message?: string; error?: string } | undefined;
    setBusy(false);
    setOpen(false);
    setMessage(response?.ok ? (data?.message ?? "ارسال شد") : (data?.error ?? "ارسال نشد"));
    window.setTimeout(() => setMessage(""), 2500);
  }

  return (
    <div className="mt-2">
      {open ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-surface-container p-1.5">
          {OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => send(option.key)}
              disabled={busy}
              className="flex-1 whitespace-nowrap rounded-lg bg-surface-container-lowest px-2 py-1.5 text-[10.5px] font-bold text-on-surface shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined align-middle text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{option.icon}</span>{" "}
              {option.label}
            </button>
          ))}
          <button type="button" onClick={() => setOpen(false)} className="px-2 text-[11px] text-outline">بستن</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-secondary/35 px-2.5 py-1 text-[10.5px] font-bold text-secondary"
        >
          <span className="material-symbols-outlined text-[14px]">volunteer_activism</span>
          تشویق
        </button>
      )}
      {message && <p className="mt-1 text-[10px] text-secondary" aria-live="polite">{message}</p>}
    </div>
  );
}
