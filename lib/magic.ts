import crypto from "crypto";
import { redis } from "@/lib/redis";

/**
 * توکن یکبارمصرف Magic Link.
 *
 * ربات تلگرام/بله هنگام `/start` این توکن را می‌سازد و لینک یکتا را به کاربر
 * می‌دهد. کاربر با کلیک، توکن مصرف می‌شود (یک‌بار) و سشن JWT دریافت می‌کند.
 * توکن‌ها در Redis با TTL کوتاه نگهداری می‌شوند.
 */

const PREFIX = "magic:";
const TTL_SECONDS = 15 * 60; // ۱۵ دقیقه اعتبار

export async function createMagicToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await redis.set(`${PREFIX}${token}`, userId, "EX", TTL_SECONDS);
  return token;
}

/** توکن را اعتبارسنجی و **مصرف** می‌کند (یک‌بارمصرف). userId یا null برمی‌گرداند. */
export async function consumeMagicToken(token: string): Promise<string | null> {
  if (!token) return null;
  const key = `${PREFIX}${token}`;
  // getdel: خواندن و حذف اتمیک (یک‌بارمصرف بودن تضمین می‌شود)
  const userId = await redis.getdel(key);
  return userId || null;
}
