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
