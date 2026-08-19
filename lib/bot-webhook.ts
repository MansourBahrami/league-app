import crypto from "crypto";
import type { NextRequest } from "next/server";

/** Telegram و API سازگار بله secret_token را در این header برمی‌گردانند. */
export function isBotWebhookAuthorized(req: NextRequest): boolean {
  const expected = process.env.BOT_WEBHOOK_SECRET;
  const received = req.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
