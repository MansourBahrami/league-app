import { prisma } from "@/lib/db";
import { tehranDayStart, tehranDayDiff } from "@/lib/date";

/**
 * وضعیت ماموریت هفتگیِ فعالِ کاربر (بعد از آنبوردینگ).
 *
 * مدل:
 *  - ساعت هفتگیِ ماموریت به ۶ روز تقسیم می‌شود → ماموریت روزانه (روز ۱..۶).
 *  - روز ۷ روز جبران است: هرچه تا پایان روز ۶ از هدف هفتگی مانده، ماموریتِ روز ۷ می‌شود.
 *    اگر هدف هفتگی قبلاً پر شده باشد، روز ۷ روز استراحت است.
 *  - دو پیشرفت: روزانه (امروز/هدف روز) و هفتگی (کل هفته/هدف هفتگی).
 *  - مرز «روز» با وقت تهران.
 */
export interface WeeklyMissionState {
  hasActive: boolean;
  /** ماموریت خریده شده ولی هنوز فعال نشده (از فردا شروع می‌شود) */
  pending: boolean;
  targetHours: number;
  weeklyGoalMin: number;
  weeklyStudiedMin: number;
  dayIndex: number; // ۱..۷ (روز فعال در بازه‌ی ماموریت)
  dailyGoalMin: number;
  dailyStudiedMin: number;
  isRestDay: boolean; // روز ۷ و هدف هفتگی کامل
  activatesAt: Date;
  expiresAt: Date;
}

export async function getWeeklyMissionState(userId: string): Promise<WeeklyMissionState | null> {
  // ماموریت فعال یا در انتظارِ فعال‌سازی (تازه‌خریده‌شده، از فردا)
  const um = await prisma.userMission.findFirst({
    where: { userId, status: { in: ["active", "pending"] } },
    include: { mission: true },
    orderBy: { activatesAt: "desc" },
  });
  if (!um) return null;

  const weeklyGoalMin = um.mission.targetHours * 60;
  const now = new Date();

  // حالت pending: هنوز شروع نشده — پیش‌نمایش هدف روزانه/هفتگی بدون پیشرفت
  if (um.status === "pending") {
    return {
      hasActive: false,
      pending: true,
      targetHours: um.mission.targetHours,
      weeklyGoalMin,
      weeklyStudiedMin: 0,
      dayIndex: 0,
      dailyGoalMin: Math.round(weeklyGoalMin / 6),
      dailyStudiedMin: 0,
      isRestDay: false,
      activatesAt: um.activatesAt,
      expiresAt: um.expiresAt,
    };
  }

  const dayIndex = Math.min(7, Math.max(1, tehranDayDiff(now, um.activatesAt) + 1));

  const [weekAgg, todayAgg] = await Promise.all([
    prisma.studySession.aggregate({
      where: { userId, startTime: { gte: um.activatesAt } },
      _sum: { durationMin: true },
    }),
    prisma.studySession.aggregate({
      where: { userId, startTime: { gte: tehranDayStart(now) } },
      _sum: { durationMin: true },
    }),
  ]);
  const weeklyStudiedMin = weekAgg._sum.durationMin ?? 0;
  const dailyStudiedMin = todayAgg._sum.durationMin ?? 0;
  const studiedBeforeToday = Math.max(0, weeklyStudiedMin - dailyStudiedMin);

  let dailyGoalMin: number;
  let isRestDay = false;
  if (dayIndex >= 7) {
    // روز جبران: باقی‌مانده تا هدف هفتگی
    dailyGoalMin = Math.max(0, weeklyGoalMin - studiedBeforeToday);
    if (dailyGoalMin === 0) isRestDay = true;
  } else {
    dailyGoalMin = Math.round(weeklyGoalMin / 6);
  }

  return {
    hasActive: true,
    pending: false,
    targetHours: um.mission.targetHours,
    weeklyGoalMin,
    weeklyStudiedMin,
    dayIndex,
    dailyGoalMin,
    dailyStudiedMin,
    isRestDay,
    activatesAt: um.activatesAt,
    expiresAt: um.expiresAt,
  };
}
