"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="fa" dir="rtl">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#fef9ef", color: "#1f3056" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
          <h1>یک مشکل غیرمنتظره پیش آمد</h1>
          <p>خطا ثبت شد؛ لطفاً دوباره تلاش کن.</p>
          <button type="button" onClick={unstable_retry} style={{ border: 0, borderRadius: 16, padding: "12px 24px", color: "white", background: "#1f3056", fontWeight: 700 }}>
            تلاش دوباره
          </button>
        </main>
      </body>
    </html>
  );
}
