"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { millisecondsUntilNextTehranDay, tehranDayKey } from "@/lib/date";

/**
 * اگر PWA هنگام عبور از نیمه‌شب تهران باز یا در پس‌زمینه باشد، داده‌های روزمحور
 * Server Component را تازه می‌کند. refresh وضعیت محلی تایمر مطالعه را حفظ می‌کند.
 */
export default function TehranDayBoundaryRefresh() {
  const router = useRouter();
  const currentDayRef = useRef(tehranDayKey());

  useEffect(() => {
    let timeoutId: number | undefined;

    function scheduleNextCheck() {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      const delay = Math.max(1_000, millisecondsUntilNextTehranDay() + 250);
      timeoutId = window.setTimeout(checkDayBoundary, delay);
    }

    function checkDayBoundary() {
      const nextDayKey = tehranDayKey();
      if (nextDayKey !== currentDayRef.current) {
        currentDayRef.current = nextDayKey;
        router.refresh();
      }
      scheduleNextCheck();
    }

    function checkWhenVisible() {
      if (document.visibilityState === "visible") checkDayBoundary();
    }

    window.addEventListener("focus", checkDayBoundary);
    window.addEventListener("pageshow", checkDayBoundary);
    document.addEventListener("visibilitychange", checkWhenVisible);
    scheduleNextCheck();

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      window.removeEventListener("focus", checkDayBoundary);
      window.removeEventListener("pageshow", checkDayBoundary);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [router]);

  return null;
}
