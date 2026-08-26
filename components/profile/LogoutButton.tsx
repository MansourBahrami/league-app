"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { captureClientError, captureProductEvent, resetAnalyticsUser } from "@/lib/analytics-client";

export default function LogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setLoggingOut(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout_failed");
      captureProductEvent("signed_out");
      resetAnalyticsUser();
      router.push("/login");
    } catch (caught) {
      captureClientError("auth.logout", caught);
      setError("خروج انجام نشد؛ اتصال اینترنت را بررسی کن و دوباره تلاش کن.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex items-center justify-center gap-2 self-start rounded-xl border border-error/20 px-4 py-3 text-[14px] font-semibold text-error transition-colors hover:bg-error/10 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          {loggingOut ? "progress_activity" : "logout"}
        </span>
        {loggingOut ? "در حال خروج..." : "خروج"}
      </button>
      {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
    </div>
  );
}
