import { randomUUID } from "node:crypto";
import { PostHog } from "posthog-node";
import { prisma } from "@/lib/db";
import { captureCaughtError } from "@/lib/observability";
import { mapWithConcurrency } from "@/lib/concurrency";

type EventProperties = Record<string, string | number | boolean | null>;

interface ServerEvent {
  distinctId: string;
  event:
    | "signed_in" | "otp_requested" | "otp_failed"
    | "study_started" | "study_completed" | "study_discarded"
    | "onboarding_started" | "onboarding_step_completed" | "onboarding_completed" | "lead_completed"
    | "mission_joined" | "mission_completed" | "mission_failed"
    | "video_completed" | "tournament_joined" | "reaction_toggled";
  properties?: EventProperties;
  insertId?: string;
  /** فقط برای load test محلی: رویداد durable می‌شود ولی به سرویس خارجی ارسال نمی‌شود. */
  deferDelivery?: boolean;
}

function analyticsConfig() {
  const token = process.env.POSTHOG_PROJECT_TOKEN ?? process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  return token ? { token, host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com" } : null;
}

async function deliverOutboxEvent(row: {
  id: string;
  distinctId: string;
  event: string;
  properties: unknown;
  insertId: string;
  attempts: number;
}) {
  const config = analyticsConfig();
  if (!config) return false;
  const client = new PostHog(config.token, { host: config.host, flushAt: 1, flushInterval: 0 });
  try {
    await client.captureImmediate({
      distinctId: row.distinctId,
      event: row.event,
      properties: {
        ...((row.properties ?? {}) as EventProperties),
        $insert_id: row.insertId,
      },
    });
    await prisma.productEventOutbox.update({
      where: { id: row.id },
      data: { status: "sent", sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
    });
    return true;
  } catch (error) {
    const attempts = row.attempts + 1;
    const retryMinutes = Math.min(360, 2 ** Math.min(attempts, 8));
    await prisma.productEventOutbox.update({
      where: { id: row.id },
      data: {
        attempts,
        lastError: error instanceof Error ? error.name : "delivery_error",
        nextAttemptAt: new Date(Date.now() + retryMinutes * 60_000),
      },
    }).catch((outboxError) => {
      captureCaughtError("analytics.outbox_retry_update", outboxError, { event: row.event, attempts });
    });
    captureCaughtError("analytics.capture", error, { event: row.event, attempts });
    return false;
  } finally {
    await client.shutdown(2_000).catch((error) => {
      captureCaughtError("analytics.shutdown", error, { event: row.event });
    });
  }
}

/** رویداد ابتدا durable می‌شود و سپس تلاش ارسال فوری انجام می‌گیرد. */
export async function captureServerEvent({
  distinctId,
  event,
  properties,
  insertId,
  deferDelivery = false,
}: ServerEvent) {
  if (!analyticsConfig() && !deferDelivery) return;
  const stableInsertId = insertId ?? `${event}:${distinctId}:${randomUUID()}`;
  const row = await prisma.productEventOutbox.upsert({
    where: { insertId: stableInsertId },
    update: {},
    create: {
      distinctId,
      event,
      properties: properties ?? {},
      insertId: stableInsertId,
      status: deferDelivery ? "suppressed" : "pending",
    },
  });
  if (!deferDelivery && row.status !== "sent") await deliverOutboxEvent(row);
}

export async function flushAnalyticsOutbox(limit = 100) {
  if (!analyticsConfig()) return { pending: 0, sent: 0, configured: false };
  const rows = await prisma.productEventOutbox.findMany({
    where: { status: "pending", nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const results = await mapWithConcurrency(rows, 5, deliverOutboxEvent);
  return { pending: rows.length, sent: results.filter(Boolean).length, configured: true };
}
