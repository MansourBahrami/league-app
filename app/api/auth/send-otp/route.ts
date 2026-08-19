import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sendOtpSms } from "@/lib/sms";
import { normalizePhone } from "@/lib/phone";
import { deleteOtp, generateOtp, rateLimitIdentity, storeOtp, takeRateLimit } from "@/lib/otp";

function isValidIranPhone(phone: string): boolean {
  return /^09[0-9]{9}$/.test(phone);
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json().catch(() => ({}));
    // ارقام فارسی/عربی پشتیبانی می‌شوند: اول نرمال‌سازی، بعد اعتبارسنجی
    const normalized = normalizePhone(String(phone ?? ""));
    if (!normalized || !isValidIranPhone(normalized)) {
      return NextResponse.json({ error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    // محدودیت نرخ: حداکثر ۱ کد هر ۶۰ ثانیه و ۵ کد در ساعت برای هر شماره
    // (جلوگیری از اسپم پیامک و بمباران شماره)
    const cooldownKey = `otp_cd:${normalized}`;
    const cooldownTaken = await redis.set(cooldownKey, "1", "EX", 60, "NX");
    if (!cooldownTaken) {
      return NextResponse.json({ error: "کمی صبر کن و دوباره تلاش کن" }, { status: 429 });
    }

    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientIp = req.headers.get("x-real-ip") ?? forwarded ?? "unknown";
    const [phoneAllowed, ipAllowed] = await Promise.all([
      takeRateLimit(`otp_rl:${normalized}`, 5, 3600),
      takeRateLimit(`otp_ip_rl:${rateLimitIdentity(clientIp)}`, 20, 3600),
    ]);
    if (!phoneAllowed || !ipAllowed) {
      return NextResponse.json({ error: "تعداد درخواست زیاد است؛ یک ساعت دیگر تلاش کن" }, { status: 429 });
    }

    const otp = generateOtp();
    const expirySeconds = parseInt(process.env.OTP_EXPIRY_SECONDS ?? "300");
    await storeOtp(normalized, otp, Number.isFinite(expirySeconds) ? expirySeconds : 300);

    // در محیط dev کد را مستقیم برمی‌گردانیم (بدون مصرف پیامک)
    if (process.env.NODE_ENV !== "production") {
      console.log(`OTP for ${normalized}: ${otp}`);
      return NextResponse.json({ message: "کد ارسال شد", _dev_otp: otp });
    }

    // در production کد واقعاً با پیامک کاوه‌نگار فرستاده می‌شود
    const sent = await sendOtpSms(normalized, otp);
    if (!sent) {
      await deleteOtp(normalized);
      return NextResponse.json(
        { error: "ارسال پیامک با مشکل مواجه شد، لطفاً کمی بعد دوباره تلاش کنید" },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: "کد تأیید به شماره موبایل شما ارسال شد" });
  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
