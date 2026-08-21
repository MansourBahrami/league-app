"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { captureProductEvent, resetAnalyticsUser } from "@/lib/analytics-client";

export default function LogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    captureProductEvent("signed_out");
    resetAnalyticsUser();
    router.push("/login");
  }

  return (
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
  );
}
