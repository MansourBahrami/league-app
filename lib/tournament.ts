import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";
import { withResourceLock, withUserLock } from "@/lib/user-lock";

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
  return withUserLock(userId, async (tx) => {
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || !tournament.isActive) {
      return { ok: false, reason: "تورنومنت یافت نشد" };
    }
    if (tournament.endAt < new Date()) {
      return { ok: false, reason: "این تورنومنت تمام شده" };
    }
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { level: true },
    });
    if (!user) return { ok: false, reason: "کاربر یافت نشد" };
    if (!eligibleForTournament(tournament.levels, user.level)) {
      return { ok: false, reason: "این تورنومنت برای سطح تو نیست" };
    }
    const existing = await tx.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (existing) return { ok: false, reason: "قبلاً عضو شدی" };

    const debit = await tx.user.updateMany({
      where: { id: userId, coins: { gte: tournament.entryCost } },
      data: { coins: { decrement: tournament.entryCost } },
    });
    if (debit.count !== 1) return { ok: false, reason: "سکه کافی نداری" };

    await tx.tournamentParticipant.create({ data: { tournamentId, userId } });
    return { ok: true };
  });
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
export async function settleEndedTournament(
  tournamentId: string,
  now = new Date(),
): Promise<boolean> {
  const outcome = await withResourceLock(`tournament:${tournamentId}`, async (tx) => {
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
    if (
      !tournament ||
      !tournament.isActive ||
      tournament.rewardsPaid ||
      tournament.endAt >= now
    ) {
      return { status: "skipped" } as const;
    }

    const participants = await tx.tournamentParticipant.findMany({
      where: { tournamentId: tournament.id },
      select: { userId: true },
    });
    const participantIds = participants.map((participant) => participant.userId);
    const grouped = participantIds.length > 0
      ? await tx.studySession.groupBy({
          by: ["userId"],
          where: {
            userId: { in: participantIds },
            startTime: { gte: tournament.startAt, lte: tournament.endAt },
          },
          _sum: { xpEarned: true },
        })
      : [];
    const scoreMap = new Map(
      grouped.map((entry) => [entry.userId, entry._sum.xpEarned ?? 0]),
    );
    const board = participants
      .map((participant) => ({
        userId: participant.userId,
        score: scoreMap.get(participant.userId) ?? 0,
      }))
      .sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId));

    for (const row of board) {
      await tx.tournamentParticipant.update({
        where: {
          tournamentId_userId: {
            tournamentId: tournament.id,
            userId: row.userId,
          },
        },
        data: { score: row.score },
      });
    }

    const winner = board[0];
    if (winner && (tournament.prizeXp > 0 || tournament.prizeCoins > 0)) {
      await tx.user.update({
        where: { id: winner.userId },
        data: {
          xp: { increment: tournament.prizeXp },
          coins: { increment: tournament.prizeCoins },
        },
      });
    }
    await tx.tournament.update({
      where: { id: tournament.id },
      data: { rewardsPaid: true },
    });
    return { status: "settled", tournament, winner } as const;
  });

  if (outcome.status !== "settled") return false;
  if (outcome.winner && (outcome.tournament.prizeXp > 0 || outcome.tournament.prizeCoins > 0)) {
    await sendPushToUser(outcome.winner.userId, {
      title: "🏆 برنده تورنومنت!",
      body: `تو نفر اول «${outcome.tournament.name}» شدی! ${outcome.tournament.prizeXp} XP و ${outcome.tournament.prizeCoins} سکه گرفتی.`,
      url: `/tournaments/${outcome.tournament.id}`,
      tag: `tournament-${outcome.tournament.id}`,
    });
  }
  return true;
}

export async function settleEndedTournaments(): Promise<{ settled: number }> {
  const now = new Date();
  const ended = await prisma.tournament.findMany({
    where: { isActive: true, rewardsPaid: false, endAt: { lt: now } },
    select: { id: true },
  });

  let settled = 0;
  for (const candidate of ended) {
    if (await settleEndedTournament(candidate.id, now)) settled += 1;
  }
  return { settled };
}
