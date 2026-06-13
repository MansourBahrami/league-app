import webpush from "web-push";
import { prisma } from "@/lib/db";

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
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", pub, priv);
  configured = true;
  return true;
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
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    })
  );

  return sent;
}

export function isPushConfigured(): boolean {
  return ensureConfigured();
}
