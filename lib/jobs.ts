import { prisma } from "@/lib/db";
import { processUserMissions } from "@/lib/mission";
import { settleEndedTournaments } from "@/lib/tournament";
import { detectRankDrops } from "@/lib/notifications";
import { runScheduledRules } from "@/lib/notification-engine";
import { mapWithConcurrency } from "@/lib/concurrency";
import { withDistributedLock } from "@/lib/distributed-lock";
import { runBusinessInvariantAudit } from "@/lib/invariants";
import { flushAnalyticsOutbox } from "@/lib/analytics-server";
import { runRetentionCleanup } from "@/lib/retention";
import { settleExpiredStudySessions } from "@/lib/stale-study-sessions";

/**
 * پردازش سراسری ماموریت‌ها برای همه کاربرانی که ماموریت در حال انجام یا در انتظار دارند:
 *  - فعال‌سازی ماموریت‌های pending که زمان فعال‌سازی‌شان رسیده
 *  - بررسی تکمیل و اعطای جایزه/مدال
 *  - منقضی کردن ماموریت‌های گذشته از مهلت (سوختن سکه)
 *
 * این تابع جایگزین چک lazy صفحه /missions است و باید توسط cron فراخوانی شود.
 */
export async function expireAndProcessMissions(): Promise<{ usersProcessed: number }> {
  const now = new Date();
  // ۱) فعال‌سازی دسته‌ای تمام ماموریت‌های pending که زمانشان رسیده در یک کوئری
  await prisma.userMission.updateMany({
    where: { status: "pending", activatesAt: { lte: now } },
    data: { status: "active" },
  });

  const rows = await prisma.userMission.findMany({
    where: { status: "active" },
    select: { userId: true },
    distinct: ["userId"],
  });

  await mapWithConcurrency(rows, 10, ({ userId }) => processUserMissions(userId));

  return { usersProcessed: rows.length };
}

/**
 * کارهای زمان‌بندی‌شده. با پارامتر `tasks` می‌توان زیرمجموعه‌ای را اجرا کرد تا
 * cronهای مختلف فرکانس متفاوت داشته باشند:
 *  - پیش‌فرض (هر چند دقیقه): ماموریت‌ها + تسویه تورنومنت + موتور قانون نوتیفیکیشن
 *    (تریگرهای scheduled/relative؛ پنجره‌ی ۱۵ دقیقه).
 *  - `ranks` (مثلاً ساعتی): تشخیص افت رتبه‌ی هفتگی و شلیک رویداد rank_drop.
 */
export type JobTask = "studySessions" | "missions" | "tournaments" | "notifRules" | "ranks" | "invariants" | "analytics" | "retention";

export async function runScheduledJobs(
  tasks: JobTask[] = ["studySessions", "missions", "tournaments", "notifRules", "invariants", "analytics"]
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = { ranAt: new Date().toISOString() };

  const runners: Record<JobTask, () => Promise<unknown>> = {
    studySessions: settleExpiredStudySessions,
    missions: expireAndProcessMissions,
    tournaments: settleEndedTournaments,
    notifRules: () => runScheduledRules(15),
    ranks: detectRankDrops,
    invariants: runBusinessInvariantAudit,
    analytics: flushAnalyticsOutbox,
    retention: runRetentionCleanup,
  };

  for (const task of tasks) {
    const locked = await withDistributedLock(`cron:${task}`, runners[task]);
    result[task] = locked.acquired ? locked.value : { skipped: "already_running" };
  }

  return result;
}
