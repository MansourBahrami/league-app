import { prisma } from "@/lib/db";
import { fireEvent } from "@/lib/notification-engine";

const LEVELS = ["تازه‌نفس", "ثابت‌قدم", "پیشرو", "سرآمد", "الگو"];

/**
 * تشخیص افت رتبه‌ی هفتگی بین هم‌سطح‌ها و شلیک رویداد `rank_drop`.
 *
 * این تابع فقط رتبه‌بندی را محاسبه و رویداد را شلیک می‌کند؛ خودِ ارسال پیام
 * توسط موتور قانون (قانون پیش‌فرض «افت رتبه») انجام می‌شود تا قابل‌تنظیم باشد.
 * متغیرهای ctx برای متن پیام: rank (رتبه‌ی فعلی) و overtakenBy (تعداد پیشی‌گرفته‌ها).
 */
export async function detectRankDrops(): Promise<{ fired: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let fired = 0;

  for (const level of LEVELS) {
    const users = await prisma.user.findMany({
      where: { level },
      select: { id: true, lastWeeklyRank: true },
    });
    if (users.length < 2) continue;

    const ids = users.map((u) => u.id);
    const weekly = await prisma.studySession.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, startTime: { gte: sevenDaysAgo } },
      _sum: { xpEarned: true },
    });
    const xpMap = new Map(weekly.map((w) => [w.userId, w._sum.xpEarned ?? 0]));

    const ranked = ids
      .map((id) => ({ id, xp: xpMap.get(id) ?? 0 }))
      .sort((a, b) => b.xp - a.xp)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    for (const r of ranked) {
      const user = users.find((u) => u.id === r.id)!;
      const prev = user.lastWeeklyRank;
      if (prev != null && r.rank > prev && r.xp > 0) {
        const overtakenBy = r.rank - prev;
        // به‌روزرسانی lastWeeklyRank لازم است تا قبل از شلیک رویداد، مقدار جدید در DB باشد
        await prisma.user.update({ where: { id: r.id }, data: { lastWeeklyRank: r.rank } });
        await fireEvent("rank_drop", r.id, {
          rank: r.rank.toLocaleString("fa-IR"),
          overtakenBy: overtakenBy.toLocaleString("fa-IR"),
        });
        fired++;
        continue;
      }
      if (prev !== r.rank) {
        await prisma.user.update({ where: { id: r.id }, data: { lastWeeklyRank: r.rank } });
      }
    }
  }

  return { fired };
}
