import crypto from "crypto";

/**
 * اعتبارسنجی initData مینی‌اپ تلگرام/بله.
 *
 * تلگرام (و بله که از همان پروتکل پیروی می‌کند) هنگام باز شدن مینی‌اپ یک رشته‌ی
 * امضاشده‌ی `initData` می‌دهد. صحت آن با HMAC-SHA256 و توکن ربات بررسی می‌شود تا
 * مطمئن شویم داده دستکاری نشده و واقعاً از پیام‌رسان آمده است.
 *
 * مرجع: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

export interface MiniAppUser {
  id: string; // شناسه عددی کاربر در پیام‌رسان (به‌صورت رشته)
  firstName?: string;
  lastName?: string;
  username?: string;
}

export type Messenger = "telegram" | "bale";

/** کلید مخفی HMAC را از توکن ربات می‌سازد (مطابق مستندات تلگرام). */
function secretKey(botToken: string): Buffer {
  return crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
}

/**
 * initData را اعتبارسنجی می‌کند و در صورت معتبر بودن کاربر را برمی‌گرداند.
 * @param initData رشته‌ی query-string که از مینی‌اپ می‌آید
 * @param botToken توکن ربات همان پیام‌رسان
 * @param maxAgeSeconds حداکثر عمر مجاز داده (پیش‌فرض ۱ روز) برای جلوگیری از replay
 */
export function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400
): MiniAppUser | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  // ساخت data-check-string: همه‌ی فیلدها به‌جز hash، مرتب‌شده، با \n جدا
  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hash") pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const computed = crypto
    .createHmac("sha256", secretKey(botToken))
    .update(dataCheckString)
    .digest("hex");

  // مقایسه‌ی امن در برابر timing attack
  if (computed.length !== hash.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))) return null;

  // بررسی تازگی داده
  const authDate = parseInt(params.get("auth_date") ?? "0", 10);
  if (authDate > 0) {
    const age = Math.floor(Date.now() / 1000) - authDate;
    if (age > maxAgeSeconds) return null;
  }

  // استخراج کاربر
  const userRaw = params.get("user");
  if (!userRaw) return null;
  try {
    const u = JSON.parse(userRaw);
    if (!u.id) return null;
    return {
      id: String(u.id),
      firstName: u.first_name,
      lastName: u.last_name,
      username: u.username,
    };
  } catch {
    return null;
  }
}

/** توکن ربات مربوط به یک پیام‌رسان را از env می‌خواند. */
export function botTokenFor(messenger: Messenger): string | undefined {
  return messenger === "telegram"
    ? process.env.TELEGRAM_BOT_TOKEN
    : process.env.BALE_BOT_TOKEN;
}
