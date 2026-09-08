import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sendOtpSms } from "@/lib/sms";
import { normalizePhone } from "@/lib/phone";
import { deleteOtp, generateOtp, rateLimitIdentity, storeOtp, takeRateLimit } from "@/lib/otp";
import { recordAuthAttempt } from "@/lib/auth-attempt";
import { captureCaughtError } from "@/lib/observability";
import { getConfiguredProductionTestOtp } from "@/lib/production-test-login";

function isValidIranPhone(phone: string): boolean {
  return /^09[0-9]{9}$/.test(phone);
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let identityHash = rateLimitIdentity("unknown");
  try {
    const { phone } = await req.json().catch(() => ({}));
    // ارقام فارسی/عربی پشتیبانی می‌شوند: اول نرمال‌سازی، بعد اعتبارسنجی
    const normalized = normalizePhone(String(phone ?? ""));
    identityHash = rateLimitIdentity(normalized || String(phone ?? "invalid"));
    if (!normalized || !isValidIranPhone(normalized)) {
      await recordAuthAttempt({ identityHash, action: "otp_request", status: "failed", errorCode: "invalid_phone", durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
      return NextResponse.json({ error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    // محدودیت نرخ: حداکثر ۱ کد هر ۶۰ ثانیه و ۵ کد در ساعت برای هر شماره
    // (جلوگیری از اسپم پیامک و بمباران شماره)
    const cooldownKey = `otp_cd:${normalized}`;
    const cooldownTaken = await redis.set(cooldownKey, "1", "EX", 60, "NX");
    if (!cooldownTaken) {
      await recordAuthAttempt({ identityHash, action: "otp_request", status: "rate_limited", errorCode: "cooldown", durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
      return NextResponse.json({ error: "کمی صبر کن و دوباره تلاش کن" }, { status: 429 });
    }

    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientIp = req.headers.get("x-real-ip") ?? forwarded ?? "unknown";
    const [phoneAllowed, ipAllowed] = await Promise.all([
      takeRateLimit(`otp_rl:${normalized}`, 5, 3600),
      takeRateLimit(`otp_ip_rl:${rateLimitIdentity(clientIp)}`, 20, 3600),
    ]);
    if (!phoneAllowed || !ipAllowed) {
      await recordAuthAttempt({ identityHash, action: "otp_request", status: "rate_limited", errorCode: phoneAllowed ? "ip_limit" : "phone_limit", durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
      return NextResponse.json({ error: "تعداد درخواست زیاد است؛ یک ساعت دیگر تلاش کن" }, { status: 429 });
    }

    const productionTestOtp = getConfiguredProductionTestOtp(normalized);
    const otp = productionTestOtp ?? generateOtp();
    const expirySeconds = parseInt(process.env.OTP_EXPIRY_SECONDS ?? "300");
    await storeOtp(normalized, otp, Number.isFinite(expirySeconds) ? expirySeconds : 300);

    // مسیر عملیاتی موقت: فرم و verify عادی باقی می‌مانند، فقط SMS برای شمارهٔ
    // allowlistشده ارسال نمی‌شود. کد در پاسخ API افشا نمی‌شود.
    if (productionTestOtp) {
      await recordAuthAttempt({ identityHash, action: "otp_request", status: "succeeded", durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
      return NextResponse.json({ message: "کد تأیید به شماره موبایل شما ارسال شد" });
    }

    // در محیط dev کد را مستقیم برمی‌گردانیم (بدون مصرف پیامک)
    if (process.env.NODE_ENV !== "production") {
      await recordAuthAttempt({ identityHash, action: "otp_request", status: "succeeded", durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
      return NextResponse.json({ message: "کد ارسال شد", _dev_otp: otp });
    }

    // در production کد واقعاً با پیامک کاوه‌نگار فرستاده می‌شود
    const sent = await sendOtpSms(normalized, otp);
    if (!sent) {
      await deleteOtp(normalized);
      await recordAuthAttempt({ identityHash, action: "otp_request", status: "failed", errorCode: "provider_failed", durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
      return NextResponse.json(
        { error: "ارسال پیامک با مشکل مواجه شد، لطفاً کمی بعد دوباره تلاش کنید" },
        { status: 502 }
      );
    }

    await recordAuthAttempt({ identityHash, action: "otp_request", status: "succeeded", durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
    return NextResponse.json({ message: "کد تأیید به شماره موبایل شما ارسال شد" });
  } catch (err) {
    captureCaughtError("auth.send_otp", err, { requestId: req.headers.get("x-request-id") });
    await recordAuthAttempt({ identityHash, action: "otp_request", status: "failed", errorCode: "internal_error", durationMs: Date.now() - startedAt, requestId: req.headers.get("x-request-id") });
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
