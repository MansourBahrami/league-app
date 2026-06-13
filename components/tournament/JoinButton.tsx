"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tournamentId: string;
  entryCost: number;
  disabled?: boolean;
  disabledReason?: string;
}

export default function JoinButton({ tournamentId, entryCost, disabled, disabledReason }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/tournaments/${tournamentId}/join`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(data.error ?? "خطا");
  }

  if (disabled) {
    return <p className="text-center text-[14px] text-outline py-3">{disabledReason}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={join}
        disabled={busy}
        className="gamified-btn w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
        {entryCost > 0 ? `پیوستن با ${entryCost.toLocaleString("fa-IR")} سکه` : "پیوستن رایگان"}
      </button>
      {error && <p className="text-error text-[13px] text-center">{error}</p>}
    </div>
  );
}
