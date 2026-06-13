/**
 * ارسال پیامک از طریق کاوه‌نگار (سرویس پیامک ایرانی).
 *
 * متغیرهای محیطی لازم:
 *   KAVENEGAR_API_KEY  → کلید API از پنل کاوه‌نگار
 *   KAVENEGAR_SENDER   → شماره خط فرستنده (اختیاری؛ اگر نباشد خط پیش‌فرض حساب استفاده می‌شود)
 *
 * از endpoint ساده‌ی sms/send.json استفاده می‌کنیم (با خط فرستنده‌ی اختصاصی).
 * کاوه‌نگار از ایران (سرور لیارا) کاملاً در دسترس است.
 */

const KAVENEGAR_BASE = "https://api.kavenegar.com/v1";

interface KavenegarResponse {
  return?: { status: number; message: string };
  entries?: unknown[];
}

/** ارسال کد OTP به شماره موبایل. در صورت موفقیت true برمی‌گرداند. */
export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  const apiKey = process.env.KAVENEGAR_API_KEY;
  const sender = process.env.KAVENEGAR_SENDER;

  if (!apiKey) {
    console.error("[sms] KAVENEGAR_API_KEY تنظیم نشده است");
    return false;
  }

  const message = `کد ورود شما به لیگ مطالعه:\n${code}\n\nاین کد تا ۵ دقیقه معتبر است.`;
  const params = new URLSearchParams({ receptor: phone, message });
  if (sender) params.set("sender", sender);

  const url = `${KAVENEGAR_BASE}/${apiKey}/sms/send.json?${params.toString()}`;

  try {
    const res = await fetch(url, { method: "GET" });
    const data = (await res.json()) as KavenegarResponse;
    if (data.return?.status !== 200) {
      console.error("[sms] ارسال کاوه‌نگار ناموفق:", data.return);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[sms] خطا در ارتباط با کاوه‌نگار:", err);
    return false;
  }
}
