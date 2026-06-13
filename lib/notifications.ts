import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";
import { sendMessage } from "@/lib/bot";

const LEVELS = ["تازه‌نفس", "ثابت‌قدم", "پیشرو", "سرآمد", "الگو"];

/**
 * ارسال نوتیفیکیشن از همه کانال‌های موجود:
 *   ۱. Web Push (PWA)
 *   ۲. ربات بله — اگر کاربر baleId داشته باشد (از لیارا کار می‌کند)
 *   ۳. ربات تلگرام — اگر telegramId داشته باشد (از سرور خارجی کار می‌کند؛ از ایران silent fail)
 */
async function notifyUser(
  userId: string,
  baleId: string | null,
  telegramId: string | null,
  push: { title: string; body: string; url?: string; tag?: string },
  botText: string
): Promise<void> {
  await sendPushToUser(userId, push).catch(() => {});

  if (baleId) {
    await sendMessage("bale", baleId, botText).catch(() => {});
  }
  // از لیارا (ایران) این خطا می‌دهد ولی بی‌صدا رد می‌شود
  if (telegramId) {
    await sendMessage("telegram", telegramId, botText).catch(() => {});
  }
}

/**
 * نوتیف رقابتی: تشخیص افت رتبه‌ی هفتگی بین هم‌سطح‌ها و اطلاع به کاربر.
 */
export async function notifyRankDrops(): Promise<{ notified: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let notified = 0;

  for (const level of LEVELS) {
    const users = await prisma.user.findMany({
      where: { level },
      select: { id: true, lastWeeklyRank: true, baleId: true, telegramId: true },
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
        const body = `${overtakenBy.toLocaleString("fa-IR")} نفر این هفته ازت جلو زدن. الان رتبه‌ات #${r.rank.toLocaleString("fa-IR")} شده — جبران کن!`;
        await notifyUser(
          r.id,
          user.baleId,
          user.telegramId,
          { title: "رقیبت جلو زد! 🏃", body, url: "/leaderboard", tag: "rank-drop" },
          `🏃 رقیبت جلو زد!\n\n${body}\n\nببین کجا ایستادی 👉 /leaderboard`
        );
        notified++;
      }
      if (prev !== r.rank) {
        await prisma.user.update({ where: { id: r.id }, data: { lastWeeklyRank: r.rank } });
      }
    }
  }

  return { notified };
}

/**
 * نوتیف «زنجیره‌ات امشب می‌سوزه»: کاربرانی که استریک دارند و امروز نخوانده‌اند.
 */
export async function notifyStreakAtRisk(): Promise<{ notified: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86400000);

  const users = await prisma.user.findMany({
    where: { streak: { gt: 0 }, lastStudyDate: { gte: yesterday, lt: today } },
    select: { id: true, streak: true, baleId: true, telegramId: true },
  });

  let notified = 0;
  for (const u of users) {
    const body = `زنجیره ${u.streak.toLocaleString("fa-IR")} روزه‌ات امشب می‌سوزه. فقط یه جلسه کوتاه بزن تا حفظش کنی!`;
    await notifyUser(
      u.id,
      u.baleId,
      u.telegramId,
      { title: "🔥 زنجیره‌ات در خطره!", body, url: "/dashboard", tag: "streak-risk" },
      `🔥 زنجیره‌ات در خطره!\n\n${body}`
    );
    notified++;
  }
  return { notified };
}

/**
 * یادآور هدف فردا: کاربرانی که nextStudyTarget در ۱۵ دقیقه‌ی آینده است.
 */
export async function notifyStudyReminders(): Promise<{ notified: number }> {
  const now = Date.now();
  const from = new Date(now + 14 * 60000);
  const to = new Date(now + 16 * 60000);

  const users = await prisma.user.findMany({
    where: { nextStudyTarget: { gte: from, lte: to } },
    select: { id: true, nextStudyTarget: true, baleId: true, telegramId: true },
  });

  let notified = 0;
  for (const u of users) {
    const body = "۱۵ دقیقه دیگه زمان هدفته. آماده شو و تایمرو روشن کن!";
    await notifyUser(
      u.id,
      u.baleId,
      u.telegramId,
      { title: "⏰ وقت مطالعه نزدیکه", body, url: "/dashboard", tag: "study-reminder" },
      `⏰ وقت مطالعه نزدیکه!\n\n${body}`
    );
    notified++;
  }
  return { notified };
}
