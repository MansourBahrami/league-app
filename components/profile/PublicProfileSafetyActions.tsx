"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { captureClientError } from "@/lib/analytics-client";

const REPORT_REASONS = ["نامناسب", "مزاحمت", "تقلب", "جعل هویت", "سایر"];

export default function PublicProfileSafetyActions({ targetUserId }: { targetUserId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [busy, setBusy] = useState<"block" | "report" | null>(null);
  const [message, setMessage] = useState("");

  async function report() {
    setBusy("report");
    setMessage("");
    const response = await fetch(`/api/privacy/report/${targetUserId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }).catch((caught) => {
      captureClientError("privacy.report_user", caught);
      return null;
    });
    setBusy(null);
    setMessage(response?.ok ? "گزارش ثبت شد و توسط مدیر بررسی می‌شود." : "ثبت گزارش ناموفق بود؛ دوباره تلاش کن.");
  }

  async function block() {
    if (!window.confirm("این کاربر مسدود شود؟ فعالیت‌های همدیگر را نخواهید دید.")) return;
    setBusy("block");
    const response = await fetch(`/api/privacy/block/${targetUserId}`, { method: "POST" }).catch((caught) => {
      captureClientError("privacy.block_user", caught);
      return null;
    });
    setBusy(null);
    if (response?.ok) router.replace("/leaderboard");
    else setMessage("مسدودسازی انجام نشد؛ دوباره تلاش کن.");
  }

  return (
    <section className="glass-card rounded-xl p-4" aria-labelledby="profile-safety-title">
      <h2 id="profile-safety-title" className="text-[14px] font-bold text-on-surface">ایمنی و گزارش</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="report-reason" className="sr-only">دلیل گزارش</label>
        <select
          id="report-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-11 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-[14px] text-on-surface"
        >
          {REPORT_REASONS.map((item) => <option key={item}>{item}</option>)}
        </select>
        <button type="button" onClick={report} disabled={busy !== null} className="min-h-11 rounded-xl border border-error/30 px-4 text-[14px] font-bold text-error disabled:opacity-50">
          {busy === "report" ? "در حال ثبت..." : "گزارش"}
        </button>
        <button type="button" onClick={block} disabled={busy !== null} className="min-h-11 rounded-xl bg-error-container px-4 text-[14px] font-bold text-on-error-container disabled:opacity-50">
          {busy === "block" ? "در حال مسدودسازی..." : "مسدودسازی"}
        </button>
      </div>
      {message && <p role="status" className="mt-2 text-[13px] text-on-surface-variant">{message}</p>}
    </section>
  );
}
