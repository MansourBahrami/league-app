import { prisma } from "@/lib/db";
import { processUserMissions } from "@/lib/mission";
import { settleEndedTournaments } from "@/lib/tournament";
import { detectRankDrops } from "@/lib/notifications";
import { runScheduledRules } from "@/lib/notification-engine";

/**
 * پردازش سراسری ماموریت‌ها برای همه کاربرانی که ماموریت در حال انجام یا در انتظار دارند:
 *  - فعال‌سازی ماموریت‌های pending که زمان فعال‌سازی‌شان رسیده
 *  - بررسی تکمیل و اعطای جایزه/مدال
 *  - منقضی کردن ماموریت‌های گذشته از مهلت (سوختن سکه)
 *
 * این تابع جایگزین چک lazy صفحه /missions است و باید توسط cron فراخوانی شود.
 */
export async function expireAndProcessMissions(): Promise<{ usersProcessed: number }> {
  const rows = await prisma.userMission.findMany({
    where: { status: { in: ["pending", "active"] } },
    select: { userId: true },
    distinct: ["userId"],
  });

  for (const { userId } of rows) {
    await processUserMissions(userId);
  }

  return { usersProcessed: rows.length };
}

/**
 * کارهای زمان‌بندی‌شده. با پارامتر `tasks` می‌توان زیرمجموعه‌ای را اجرا کرد تا
 * cronهای مختلف فرکانس متفاوت داشته باشند:
 *  - پیش‌فرض (هر چند دقیقه): ماموریت‌ها + تسویه تورنومنت + موتور قانون نوتیفیکیشن
 *    (تریگرهای scheduled/relative؛ پنجره‌ی ۱۵ دقیقه).
 *  - `ranks` (مثلاً ساعتی): تشخیص افت رتبه‌ی هفتگی و شلیک رویداد rank_drop.
 */
export type JobTask = "missions" | "tournaments" | "notifRules" | "ranks";

export async function runScheduledJobs(
  tasks: JobTask[] = ["missions", "tournaments", "notifRules"]
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = { ranAt: new Date().toISOString() };

  if (tasks.includes("missions")) result.missions = await expireAndProcessMissions();
  if (tasks.includes("tournaments")) result.tournaments = await settleEndedTournaments();
  if (tasks.includes("notifRules")) result.notifRules = await runScheduledRules(15);
  if (tasks.includes("ranks")) result.ranks = await detectRankDrops();

  return result;
}
