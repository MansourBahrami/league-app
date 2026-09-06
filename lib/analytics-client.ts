"use client";

import { captureException, setUser, withScope } from "@sentry/nextjs";
import { withPostHog } from "@/lib/posthog-client";

export type ProductEvent =
  | "signed_in"
  | "signed_out"
  | "otp_requested"
  | "otp_failed"
  | "study_started"
  | "study_start_failed"
  | "study_paused"
  | "study_resumed"
  | "study_sync_failed"
  | "study_end_failed"
  | "study_completed"
  | "mission_joined"
  | "mission_viewed"
  | "mission_failed"
  | "video_opened"
  | "video_playback_failed"
  | "video_completed"
  | "video_progress_failed"
  | "video_purchase_result"
  | "leaderboard_viewed"
  | "reaction_toggled"
  | "push_permission_result";

type EventProperties = Record<string, string | number | boolean | null>;

export type PerformanceEvent = "web_vital" | "route_navigation";

export function identifyAnalyticsUser(userId: string) {
  if (!userId) return;

  // شناسه داخلی دیتابیس پایدار است، اما نام و شماره موبایل هرگز ارسال نمی‌شوند.
  withPostHog((posthog) => posthog.identify(userId));
  setUser({ id: userId });
}

export function captureProductEvent(event: ProductEvent, properties?: EventProperties) {
  withPostHog((posthog) => posthog.capture(event, properties));
}

export function capturePerformanceEvent(event: PerformanceEvent, properties: EventProperties) {
  withPostHog((posthog) => posthog.capture(event, properties));
}

export function captureClientError(
  operation: string,
  error: unknown,
  properties: EventProperties = {},
) {
  const normalized = error instanceof Error ? error : new Error(String(error));
  withScope((scope) => {
    scope.setTag("operation", operation);
    scope.setContext("operation_context", properties);
    captureException(normalized);
  });
}

export function resetAnalyticsUser() {
  withPostHog((posthog) => posthog.reset());
  setUser(null);
}
