"use client";

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

export type ProductEvent =
  | "signed_in"
  | "signed_out"
  | "study_started"
  | "study_completed";

type EventProperties = Record<string, string | number | boolean | null>;

export function identifyAnalyticsUser(userId: string) {
  if (!userId) return;

  // شناسه داخلی دیتابیس پایدار است، اما نام و شماره موبایل هرگز ارسال نمی‌شوند.
  posthog.identify(userId);
  Sentry.setUser({ id: userId });
}

export function captureProductEvent(event: ProductEvent, properties?: EventProperties) {
  posthog.capture(event, properties);
}

export function resetAnalyticsUser() {
  posthog.reset();
  Sentry.setUser(null);
}
