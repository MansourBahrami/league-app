"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-[600px] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="material-symbols-outlined text-5xl text-error" aria-hidden="true">error</span>
      <h1 className="text-xl font-extrabold text-on-surface">یک مشکل غیرمنتظره پیش آمد</h1>
      <p className="text-sm text-on-surface-variant">خطا ثبت شد. دوباره تلاش کن؛ اگر ادامه داشت بعداً برگرد.</p>
      <button type="button" onClick={unstable_retry} className="gamified-btn rounded-2xl bg-primary px-6 py-3 font-bold text-on-primary">
        تلاش دوباره
      </button>
    </main>
  );
}
