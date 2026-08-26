import webpush from "web-push";
import { prisma } from "@/lib/db";
import { captureCaughtError, logOperationalEvent } from "@/lib/observability";

/**
 * Web Push (PWA) — ارسال نوتیفیکیشن پس‌زمینه به مرورگر کاربر.
 *
 * کلیدهای VAPID از env خوانده می‌شوند. برای تولید کلید:
 *   npx web-push generate-vapid-keys
 * و در .env قرار دهید: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
 * (کلید عمومی باید در NEXT_PUBLIC_VAPID_PUBLIC_KEY هم باشد تا کلاینت subscribe کند).
 */

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;

  let subject = (process.env.VAPID_SUBJECT || "mailto:info@gcamp.ir").trim();
  if (!subject.startsWith("mailto:") && !subject.startsWith("http://") && !subject.startsWith("https://")) {
    subject = subject.includes("@") ? `mailto:${subject}` : `https://${subject}`;
  }

  try {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
    return true;
  } catch (err) {
    captureCaughtError("push.configure", err);
    return false;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string; // مسیر باز شدن با کلیک (پیش‌فرض /dashboard)
  tag?: string; // برای جایگزینی نوتیف هم‌نوع
}

/** ارسال نوتیف به همه دستگاه‌های یک کاربر. اشتراک‌های منقضی (۴۱۰/۴۰۴) پاک می‌شوند. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

  const data = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch((caught) => {
            captureCaughtError("push.subscription_cleanup", caught, { status });
          });
        } else {
          captureCaughtError("push.deliver", err, { status: status ?? null });
        }
      }
    })
  );

  logOperationalEvent("push.delivery", { userId, subscriptions: subs.length, sent });
  return sent;
}

export function isPushConfigured(): boolean {
  return ensureConfigured();
}
