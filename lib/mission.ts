import { prisma } from "@/lib/db";
import { calcLevel, type MedalCount } from "@/lib/gamification";
import { broadcastActivity } from "@/app/api/feed/stream/route";
import { fireEvent } from "@/lib/notification-engine";

/** شمارش مدال‌های کاربر بر اساس ساعت هدف */
export async function getUserMedalCounts(userId: string): Promise<MedalCount[]> {
  const userMedals = await prisma.userMedal.findMany({
    where: { userId },
    include: { medal: true },
  });
  const map = new Map<number, number>();
  for (const um of userMedals) {
    map.set(um.medal.targetHours, (map.get(um.medal.targetHours) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([targetHours, count]) => ({ targetHours, count }));
}

/**
 * محاسبه مجدد سطح کاربر و ذخیره در صورت تغییر.
 * هنگام ارتقای سطح، رویداد level_up در فید ثبت می‌شود.
 */
export async function recalcUserLevel(userId: string): Promise<{ level: string; stars: number; leveledUp: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true, stars: true, name: true, avatarUrl: true },
  });
  if (!user) return { level: "تازه‌نفس", stars: 1, leveledUp: false };

  const medals = await getUserMedalCounts(userId);
  const { level, stars } = calcLevel(user.xp, medals);

  const leveledUp = level !== user.level || stars !== user.stars;
  // فقط ارتقا (نه تنزل) را به‌عنوان level_up در نظر می‌گیریم
  const isUpgrade =
    leveledUp &&
    (rankOf(level, stars) > rankOf(user.level, user.stars));

  if (leveledUp) {
    await prisma.user.update({ where: { id: userId }, data: { level, stars } });
  }

  if (isUpgrade) {
    const log = await prisma.activityLog.create({
      data: { userId, type: "level_up", metadata: { level, stars } },
    });
    broadcastActivity({ ...log, user: { name: user.name, avatarUrl: user.avatarUrl } });
    // تریگر رویدادی: قانون‌های نوتیفیکیشن مربوط به ارتقای سطح
    await fireEvent("level_up", userId, { level, stars });
  }

  return { level, stars, leveledUp: isUpgrade };
}

/** رتبه عددی یک سطح/ستاره برای مقایسه ارتقا/تنزل */
function rankOf(level: string, stars: number): number {
  const order = ["تازه‌نفس", "ثابت‌قدم", "پیشرو", "سرآمد", "الگو"];
  const idx = order.indexOf(level);
  return (idx < 0 ? 0 : idx) * 10 + stars;
}

/** اعطای مدال به کاربر (تکرارپذیر) + ثبت در فید */
async function awardMedal(userId: string, targetHours: number, userInfo: { name: string | null; avatarUrl: string | null }) {
  const medal = await prisma.medal.findUnique({ where: { targetHours } });
  if (!medal) return;
  await prisma.userMedal.create({ data: { userId, medalId: medal.id } });
  const log = await prisma.activityLog.create({
    data: { userId, type: "medal_earn", metadata: { targetHours } },
  });
  broadcastActivity({ ...log, user: userInfo });
  // تریگر رویدادی: قانون‌های نوتیفیکیشن مربوط به کسب مدال
  await fireEvent("medal_earn", userId, { targetHours, medalName: medal.name });
}

/**
 * پردازش کامل ماموریت‌های یک کاربر:
 *  - فعال‌سازی ماموریت‌های pending که زمان فعال‌سازی‌شان رسیده
 *  - بررسی تکمیل ماموریت‌های active و اعطای جایزه (XP + سکه + مدال)
 *  - منقضی کردن ماموریت‌های active که مهلتشان گذشته (سکه سوخته است)
 * این تابع idempotent است و می‌تواند هربار صفحه/جلسه فراخوانی شود (lazy) یا در cron.
 */
export async function processUserMissions(userId: string): Promise<void> {
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, avatarUrl: true },
  });
  if (!user) return;

  // ۱) فعال‌سازی pendingهایی که زمانشان رسیده
  await prisma.userMission.updateMany({
    where: { userId, status: "pending", activatesAt: { lte: now } },
    data: { status: "active" },
  });

  // ۲) بررسی ماموریت‌های فعال
  const activeMissions = await prisma.userMission.findMany({
    where: { userId, status: "active" },
    include: { mission: true },
  });

  for (const um of activeMissions) {
    // مجموع دقایق مطالعه در بازه ماموریت
    const agg = await prisma.studySession.aggregate({
      where: { userId, startTime: { gte: um.activatesAt, lte: now } },
      _sum: { durationMin: true },
    });
    const studiedMin = agg._sum.durationMin ?? 0;
    const targetMin = um.mission.targetHours * 60;

    if (studiedMin >= targetMin) {
      // موفقیت → جایزه
      await prisma.$transaction([
        prisma.userMission.update({
          where: { id: um.id },
          data: { status: "completed", completedAt: now },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { xp: { increment: um.mission.xpReward } },
        }),
      ]);
      // اعطای مدال اختصاصی ماموریت (تکرارپذیر)
      await awardMedal(userId, um.mission.targetHours, user);
      await recalcUserLevel(userId);
    } else if (um.expiresAt < now) {
      // مهلت تمام شد و انجام نشد → سکه سوخته، شکست
      await prisma.userMission.update({
        where: { id: um.id },
        data: { status: "failed" },
      });
    }
  }
}
