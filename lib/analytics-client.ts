"use client";

import * as Sentry from "@sentry/nextjs";
import { withPostHog } from "@/lib/posthog-client";

export type ProductEvent =
  | "signed_in"
  | "signed_out"
  | "study_started"
  | "study_completed";

type EventProperties = Record<string, string | number | boolean | null>;

export type PerformanceEvent = "web_vital" | "route_navigation";

export function identifyAnalyticsUser(userId: string) {
  if (!userId) return;

  // شناسه داخلی دیتابیس پایدار است، اما نام و شماره موبایل هرگز ارسال نمی‌شوند.
  withPostHog((posthog) => posthog.identify(userId));
  Sentry.setUser({ id: userId });
}

export function captureProductEvent(event: ProductEvent, properties?: EventProperties) {
  withPostHog((posthog) => posthog.capture(event, properties));
}

export function capturePerformanceEvent(event: PerformanceEvent, properties: EventProperties) {
  withPostHog((posthog) => posthog.capture(event, properties));
}

export function resetAnalyticsUser() {
  withPostHog((posthog) => posthog.reset());
  Sentry.setUser(null);
}
