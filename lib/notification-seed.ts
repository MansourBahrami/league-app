/**
 * قانون‌های پیش‌فرض نوتیفیکیشن.
 *
 * سه نوتیفیکیشن قبلیِ هاردکدشده (یادآور هدف، خطر زنجیره، افت رتبه) به‌صورت
 * قانون قابل‌ویرایش در پنل ادمین بازتعریف شده‌اند. این تابع idempotent است:
 * هر قانون بر اساس `name` فقط یک‌بار ساخته می‌شود (اگر ادمین بعداً ویرایشش کند،
 * دوباره بازنویسی نمی‌شود).
 */
import type { PrismaClient } from "../app/generated/prisma/client";

interface SeedRule {
  name: string;
  channels: string[];
  triggerType: "scheduled" | "relative" | "event";
  triggerConfig: unknown;
  segment: string | null;
  conditions: unknown[];
  title: string;
  body: string;
  linkUrl: string | null;
  cooldownHours: number;
  quietStart?: number | null;
  quietEnd?: number | null;
  maxPerDay?: number | null;
}

export const DEFAULT_RULES: SeedRule[] = [
  {
    name: "یادآور هدف مطالعه",
    channels: ["bale", "push"],
    triggerType: "relative",
    triggerConfig: { beforeTargetMin: 15 },
    segment: "all",
    conditions: [],
    title: "⏰ وقت مطالعه نزدیکه",
    body: "{{name}} جان، ۱۵ دقیقه دیگه زمان هدفته. آماده شو و تایمرو روشن کن!",
    linkUrl: "/dashboard",
    cooldownHours: 6,
    quietStart: 0,
    quietEnd: 6,
    maxPerDay: 3,
  },
  {
    name: "خطر سوختن زنجیره",
    channels: ["bale", "push"],
    triggerType: "scheduled",
    // ساعت‌ها به وقت محلی سرور ارزیابی می‌شوند؛ سرور روی Asia/Tehran است → 21:00 ایران
    triggerConfig: { hour: 21, minute: 0, weekdays: [0, 1, 2, 3, 4, 5, 6] },
    segment: "streakHolders",
    conditions: [{ field: "studiedToday", op: "eq", value: false }],
    title: "🔥 زنجیره‌ات در خطره!",
    body: "زنجیره {{streak}} روزه‌ات امشب می‌سوزه. فقط یه جلسه کوتاه بزن تا حفظش کنی!",
    linkUrl: "/dashboard",
    cooldownHours: 20,
    maxPerDay: 1,
  },
  {
    name: "افت رتبه هفتگی",
    channels: ["bale", "push"],
    triggerType: "event",
    triggerConfig: { event: "rank_drop" },
    segment: "all",
    conditions: [],
    title: "🏃 رقیبت جلو زد!",
    body: "{{overtakenBy}} نفر این هفته ازت جلو زدن. الان رتبه‌ات #{{rank}} شده — جبران کن!",
    linkUrl: "/leaderboard",
    cooldownHours: 12,
    quietStart: 0,
    quietEnd: 8,
    maxPerDay: 2,
  },

  // --- نوتیف‌های بازگشت به اپ (re-engagement / win-back) ---
  {
    name: "دلتنگی سه‌روزه",
    channels: ["bale", "push"],
    triggerType: "scheduled",
    // وقت محلی سرور (Asia/Tehran) → 18:00 ایران
    triggerConfig: { hour: 18, minute: 0, weekdays: [0, 1, 2, 3, 4, 5, 6] },
    segment: "all",
    conditions: [{ field: "daysInactive", op: "between", value: [3, 6] }],
    title: "دلمون برات تنگ شده 🥺",
    body: "{{name}} جان، چند روزه ندیدیمت. یه جلسه‌ی کوتاه ۳۰ دقیقه‌ای بزن تا دوباره راه بیفتی — همین الان!",
    linkUrl: "/dashboard",
    cooldownHours: 48,
    quietStart: 0,
    quietEnd: 9,
    maxPerDay: 1,
  },
  {
    name: "بازگشت بعد از یک هفته",
    channels: ["bale", "push"],
    triggerType: "scheduled",
    // وقت محلی سرور (Asia/Tehran) → 18:00 ایران
    triggerConfig: { hour: 18, minute: 0, weekdays: [0, 1, 2, 3, 4, 5, 6] },
    segment: "all",
    conditions: [{ field: "daysInactive", op: "gte", value: 7 }],
    title: "هنوز جات سر جاشه ✨",
    body: "یه هفته‌ست نیستی، ولی رتبه و {{coins}} سکه‌ات هنوز منتظرتن. امروز فقط یه جلسه بزن تا برگردی به مسیر 💪",
    linkUrl: "/dashboard",
    cooldownHours: 72,
    quietStart: 0,
    quietEnd: 9,
    maxPerDay: 1,
  },
  {
    name: "هدف فردا یادت نره",
    channels: ["bale", "push"],
    triggerType: "event",
    triggerConfig: { event: "session_complete" },
    segment: "all",
    conditions: [{ field: "hasTarget", op: "eq", value: false }],
    title: "جلسه‌ی عالی بود! 🎯",
    body: "{{name}} جان، الان که سرحالی هدف فردات رو هم تنظیم کن تا سر وقت یادت بندازم و زنجیره‌ات نسوزه.",
    linkUrl: "/dashboard",
    cooldownHours: 20,
    maxPerDay: 1,
  },
  {
    name: "تبریک ارتقای سطح",
    channels: ["bale", "push"],
    triggerType: "event",
    triggerConfig: { event: "level_up" },
    segment: "all",
    conditions: [],
    title: "🎉 سطحت رفت بالا!",
    body: "آفرین {{name}}! به سطح «{{level}}» رسیدی. بیا ببین تو این سطح چه چالش‌های جدیدی منتظرته 🚀",
    linkUrl: "/dashboard",
    cooldownHours: 1,
    maxPerDay: 3,
  },
  {
    name: "نقطه‌عطف زنجیره",
    channels: ["bale", "push"],
    triggerType: "event",
    triggerConfig: { event: "streak_milestone" },
    segment: "all",
    conditions: [],
    title: "🔥 زنجیره {{streak}} روزه!",
    body: "{{name}} جان، {{streak}} روز پشت‌سرهم خوندی — این یعنی پشتکار واقعی! فردا هم بزن تا رکوردت بزرگ‌تر شه.",
    linkUrl: "/dashboard",
    cooldownHours: 12,
    maxPerDay: 2,
  },
  {
    name: "مدال جدید",
    channels: ["bale", "push"],
    triggerType: "event",
    triggerConfig: { event: "medal_earn" },
    segment: "all",
    conditions: [],
    title: "🏅 یه مدال جدید گرفتی!",
    body: "تبریک {{name}}! مدال «{{medalName}}» مال تو شد. بیا ویترین مدال‌هات رو ببین و بعدی رو هدف بگیر.",
    linkUrl: "/profile",
    cooldownHours: 1,
    maxPerDay: 3,
  },
];

export async function seedNotificationRules(prisma: PrismaClient): Promise<number> {
  let created = 0;
  for (const r of DEFAULT_RULES) {
    const existing = await prisma.notificationRule.findFirst({ where: { name: r.name } });
    if (existing) continue;
    await prisma.notificationRule.create({
      data: {
        name: r.name,
        enabled: true,
        channels: r.channels,
        triggerType: r.triggerType,
        triggerConfig: r.triggerConfig as object,
        segment: r.segment,
        conditions: r.conditions as object,
        title: r.title,
        body: r.body,
        linkUrl: r.linkUrl,
        cooldownHours: r.cooldownHours,
        quietStart: r.quietStart ?? null,
        quietEnd: r.quietEnd ?? null,
        maxPerDay: r.maxPerDay ?? null,
      },
    });
    created++;
  }
  return created;
}
