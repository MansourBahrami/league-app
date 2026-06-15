import { prisma } from "@/lib/db";

/**
 * A/B تست مدل دسترسی به ویدیو.
 *  - گروه "free": ویدیوی هر روز رایگان و با پیشرفت روز باز می‌شود (رفتار قبلی).
 *  - گروه "paid": ویدیوها با سکه خریده می‌شوند. کاربر سکه‌ی اولیه دارد برای خرید
 *    ویدیوی اول؛ بقیه را با سکه‌ی حاصل از مطالعه و جایزه‌ی تماشا می‌خرد.
 *
 * هدف سنجش: مقایسه‌ی نرخ بازدید ویدیو و انگیجمنت/ریتنشن بین دو گروه.
 */

export type VideoAccess = "free" | "paid";

/** سکه‌ی اولیه‌ی گروه paid (برای خرید ویدیوی اول) */
export const PAID_INITIAL_COINS = 10;

/** قیمت ویدیو بر حسب شماره‌ی روزِ مسیر */
const VIDEO_PRICES: Record<number, number> = {
  1: 10,
  2: 20,
  3: 30,
  4: 40,
  5: 60,
  6: 70,
};

/** قیمت ویدیوی روز N (سکه). برای روزهای فراتر از ۶ به‌صورت خطی ادامه می‌یابد. */
export function getVideoPrice(day: number): number {
  if (day <= 0) return 0;
  return VIDEO_PRICES[day] ?? 70 + (day - 6) * 10;
}

/** تخصیص تصادفی ۵۰/۵۰ گروه به کاربر جدید */
function pickVariant(): VideoAccess {
  return Math.random() < 0.5 ? "free" : "paid";
}

/**
 * اطمینان از تخصیص گروه A/B به کاربر. اگر هنوز تخصیص نیافته باشد، یک گروه تصادفی
 * انتخاب می‌کند و برای گروه paid سکه‌ی اولیه را اعطا می‌کند (فقط یک بار).
 * در اولین ورود به اپ (layout) صدا زده می‌شود؛ idempotent است.
 */
export async function ensureVariant(userId: string, current: string | null): Promise<VideoAccess> {
  if (current === "free" || current === "paid") return current;

  const variant = pickVariant();
  await prisma.user.update({
    where: { id: userId },
    data: {
      videoAccess: variant,
      // گروه paid با سکه‌ی اولیه شروع می‌کند تا بتواند ویدیوی اول را بخرد
      ...(variant === "paid" ? { coins: { increment: PAID_INITIAL_COINS } } : {}),
    },
  });
  return variant;
}
