interface TestLoginEnvironment {
  NODE_ENV?: string;
  GCAMP_TEST_LOGIN_ENABLED?: string;
  GCAMP_TEST_LOGIN_PHONE?: string;
  GCAMP_TEST_LOGIN_OTP?: string;
  GCAMP_TEST_LOGIN_EXPIRES_AT?: string;
}

const MAX_ENABLE_WINDOW_MS = 6 * 60 * 60 * 1_000;

/**
 * OTP عملیاتیِ موقت برای تست یک حساب غیرادمین در production.
 *
 * این مسیر پیش‌فرض خاموش است و فقط وقتی همهٔ متغیرها معتبر باشند فعال می‌شود.
 * انقضا علاوه بر گذشته‌نبودن، حداکثر شش ساعت آینده پذیرفته می‌شود تا یک تنظیم
 * اشتباه نتواند راه ورود آزمایشیِ بلندمدت ایجاد کند. خود OTP همچنان با storeOtp
 * هش، پنج‌دقیقه‌ای و یکبارمصرف می‌شود و محدودیت نرخ عادی نیز برقرار است.
 */
export function getConfiguredProductionTestOtp(
  phone: string,
  nowMs = Date.now(),
  env: TestLoginEnvironment = process.env,
): string | null {
  if (env.NODE_ENV !== "production" || env.GCAMP_TEST_LOGIN_ENABLED !== "1") return null;
  if (!/^09\d{9}$/.test(phone) || env.GCAMP_TEST_LOGIN_PHONE !== phone) return null;

  const otp = env.GCAMP_TEST_LOGIN_OTP ?? "";
  if (!/^\d{6}$/.test(otp)) return null;

  const expiresAt = Date.parse(env.GCAMP_TEST_LOGIN_EXPIRES_AT ?? "");
  const remainingMs = expiresAt - nowMs;
  if (!Number.isFinite(expiresAt) || remainingMs <= 0 || remainingMs > MAX_ENABLE_WINDOW_MS) return null;

  return otp;
}
