"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";

export default function MissionRoomsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-[600px] flex-col items-center justify-center gap-4 px-6 text-center" dir="rtl">
      <span className="material-symbols-outlined text-5xl text-error" aria-hidden="true">error</span>
      <h1 className="text-lg font-extrabold text-on-surface">خطا در بارگذاری بخش مأموریت‌ها</h1>
      <p className="text-xs text-on-surface-variant leading-relaxed">
        مشکلی در دریافت اطلاعات پیش آمد. می‌توانید دوباره تلاش کنید یا به صفحه اصلی برگردید.
      </p>
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={reset}
          className="gamified-btn rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary shadow-md"
        >
          تلاش دوباره
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl border border-outline-variant/60 bg-surface-container px-5 py-2.5 text-xs font-bold text-on-surface"
        >
          بازگشت به خانه
        </Link>
      </div>
    </div>
  );
}
