import crypto from "crypto";
import { redis } from "@/lib/redis";

const OTP_TTL_SECONDS = 5 * 60;
const OTP_MAX_ATTEMPTS = 5;

function otpSecret(): string {
  const secret = process.env.OTP_HASH_SECRET ?? process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("OTP_HASH_SECRET یا JWT_SECRET در production الزامی است.");
  }
  return secret ?? "dev-only-otp-secret";
}

function digestOtp(phone: string, code: string): string {
  return crypto
    .createHmac("sha256", otpSecret())
    .update(`g-camp:otp:${phone}:${code}`)
    .digest("hex");
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function storeOtp(phone: string, code: string, ttlSeconds = OTP_TTL_SECONDS): Promise<void> {
  const key = `otp:${phone}`;
  await redis
    .multi()
    .hset(key, { digest: digestOtp(phone, code), attempts: "0" })
    .expire(key, ttlSeconds)
    .exec();
}

export type OtpConsumeResult = "valid" | "invalid" | "expired" | "locked";

/**
 * مقایسه، شمارش تلاش و مصرف OTP در یک اسکریپت اتمیک Redis انجام می‌شود تا
 * دو درخواست همزمان نتوانند یک کد را دوبار مصرف کنند.
 */
export async function consumeOtp(phone: string, code: string): Promise<OtpConsumeResult> {
  const script = `
    local stored = redis.call('HGET', KEYS[1], 'digest')
    if not stored then return -1 end
    if stored == ARGV[1] then
      redis.call('DEL', KEYS[1])
      return 1
    end
    local attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
    if attempts >= tonumber(ARGV[2]) then
      redis.call('DEL', KEYS[1])
      return -2
    end
    return 0
  `;
  const result = Number(await redis.eval(script, 1, `otp:${phone}`, digestOtp(phone, code), OTP_MAX_ATTEMPTS));
  if (result === 1) return "valid";
  if (result === -1) return "expired";
  if (result === -2) return "locked";
  return "invalid";
}

export async function deleteOtp(phone: string): Promise<void> {
  await redis.del(`otp:${phone}`);
}

/** شمارنده اتمیک پنجره‌ای؛ مقدار false یعنی سقف مصرف شده است. */
export async function takeRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const script = `
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
    if count > tonumber(ARGV[1]) then return 0 end
    return 1
  `;
  return Number(await redis.eval(script, 1, key, limit, windowSeconds)) === 1;
}

export function rateLimitIdentity(value: string): string {
  return crypto.createHash("sha256").update(value || "unknown").digest("hex").slice(0, 24);
}
