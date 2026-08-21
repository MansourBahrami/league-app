import "server-only";

import { PostHog } from "posthog-node";

type EventProperties = Record<string, string | number | boolean | null>;

interface ServerEvent {
  distinctId: string;
  event: "signed_in" | "study_started" | "study_completed";
  properties?: EventProperties;
  insertId?: string;
}

/**
 * رویدادهای اصلی محصول را بعد از پاسخ HTTP ارسال می‌کند. خطای سرویس تحلیل
 * هیچ‌وقت نباید مسیر مطالعه یا ورود کاربر را خراب کند.
 */
export async function captureServerEvent({ distinctId, event, properties, insertId }: ServerEvent) {
  const token = process.env.POSTHOG_PROJECT_TOKEN ?? process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) return;

  const client = new PostHog(token, {
    host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    await client.captureImmediate({
      distinctId,
      event,
      properties: {
        ...properties,
        ...(insertId ? { $insert_id: insertId } : {}),
      },
    });
  } catch (error) {
    console.error("analytics event failed", { event, error });
  } finally {
    await client.shutdown(2_000).catch(() => undefined);
  }
}
