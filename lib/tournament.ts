import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

/**
 * تورنومنت = رقابت بازه‌دار ویژه‌ی ادمین با اتاق و لیدربورد جداگانه.
 * امتیاز هر شرکت‌کننده = مجموع XP جلسات مطالعه‌اش در بازه‌ی [startAt, endAt].
 * لیدربورد هفتگی اصلی کاملاً مستقل و دست‌نخورده می‌ماند.
 */

export interface TournamentRow {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  level: string;
  score: number;
  isCurrentUser: boolean;
}

/** آیا کاربر می‌تواند در این تورنومنت شرکت کند؟ (محدودیت سطح) */
export function eligibleForTournament(levels: string[], userLevel: string): boolean {
  return levels.length === 0 || levels.includes(userLevel);
}

/** پیوستن به تورنومنت با کسر سکه (اتمیک، با بررسی موجودی و تکرار). */
export async function joinTournament(
  userId: string,
  tournamentId: string
): Promise<{ ok: boolean; reason?: string }> {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || !t.isActive) return { ok: false, reason: "تورنومنت یافت نشد" };
  if (t.endAt < new Date()) return { ok: false, reason: "این تورنومنت تمام شده" };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coins: true, level: true } });
  if (!user) return { ok: false, reason: "کاربر یافت نشد" };
  if (!eligibleForTournament(t.levels, user.level)) return { ok: false, reason: "این تورنومنت برای سطح تو نیست" };

  const existing = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  });
  if (existing) return { ok: false, reason: "قبلاً عضو شدی" };

  if (user.coins < t.entryCost) return { ok: false, reason: "سکه کافی نداری" };

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { coins: { decrement: t.entryCost } } }),
    prisma.tournamentParticipant.create({ data: { tournamentId, userId } }),
  ]);
  return { ok: true };
}

/** لیدربورد زنده‌ی تورنومنت: XP جلسات هر شرکت‌کننده در بازه. */
export async function getTournamentLeaderboard(
  tournamentId: string,
  currentUserId: string
): Promise<TournamentRow[]> {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!t) return [];

  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId },
    include: { user: { select: { id: true, name: true, avatarUrl: true, level: true } } },
  });
  if (participants.length === 0) return [];

  const ids = participants.map((p) => p.userId);
  const grouped = await prisma.studySession.groupBy({
    by: ["userId"],
    where: { userId: { in: ids }, startTime: { gte: t.startAt, lte: t.endAt } },
    _sum: { xpEarned: true },
  });
  const scoreMap = new Map(grouped.map((g) => [g.userId, g._sum.xpEarned ?? 0]));

  return participants
    .map((p) => ({
      userId: p.userId,
      name: p.user.name ?? "کاربر",
      avatarUrl: p.user.avatarUrl,
      level: p.user.level,
      score: scoreMap.get(p.userId) ?? 0,
      isCurrentUser: p.userId === currentUserId,
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * پرداخت جوایز تورنومنت‌های پایان‌یافته (در cron). نفر اول جایزه می‌گیرد.
 * `rewardsPaid` جلوی پرداخت دوباره را می‌گیرد.
 */
export async function settleEndedTournaments(): Promise<{ settled: number }> {
  const now = new Date();
  const ended = await prisma.tournament.findMany({
    where: { isActive: true, rewardsPaid: false, endAt: { lt: now } },
  });

  let settled = 0;
  for (const t of ended) {
    const board = await getTournamentLeaderboard(t.id, "");
    if (board.length > 0 && (t.prizeXp > 0 || t.prizeCoins > 0)) {
      const winner = board[0];
      await prisma.user.update({
        where: { id: winner.userId },
        data: { xp: { increment: t.prizeXp }, coins: { increment: t.prizeCoins } },
      });
      await sendPushToUser(winner.userId, {
        title: "🏆 برنده تورنومنت!",
        body: `تو نفر اول «${t.name}» شدی! ${t.prizeXp} XP و ${t.prizeCoins} سکه گرفتی.`,
        url: `/tournaments/${t.id}`,
        tag: `tournament-${t.id}`,
      });
    }
    // امتیاز نهایی هر شرکت‌کننده snapshot می‌شود
    for (const row of board) {
      await prisma.tournamentParticipant.update({
        where: { tournamentId_userId: { tournamentId: t.id, userId: row.userId } },
        data: { score: row.score },
      }).catch(() => {});
    }
    await prisma.tournament.update({ where: { id: t.id }, data: { rewardsPaid: true } });
    settled++;
  }
  return { settled };
}
