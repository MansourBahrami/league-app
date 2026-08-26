import { prisma } from "@/lib/db";
import { tehranDayStart } from "@/lib/date";
import { sendPushToUser } from "@/lib/push";
import { createInboxItem } from "@/lib/inbox";
import { withUserLock } from "@/lib/user-lock";

/**
 * واکنش (Reaction) روی آیتم‌های فید.
 * هر کاربر روی هر آیتم فقط یک واکنش دارد (قابل تغییر یا برداشتن).
 * جایزه: هر کاربری که در یک روزِ تهران به `REACTION_REWARD_TARGETS` نفرِ متفاوت
 * واکنش بدهد، یک‌بار `REACTION_REWARD_COINS` سکه می‌گیرد.
 */

export const REACTION_EMOJIS = ["🔥", "👏", "💪", "❤️", "🎯"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const REACTION_REWARD_TARGETS = 5; // تعداد نفرات لازم در روز
export const REACTION_REWARD_COINS = 5; // سکه‌ی جایزه

export function isValidEmoji(e: string): e is ReactionEmoji {
  return (REACTION_EMOJIS as readonly string[]).includes(e);
}

export interface ToggleResult {
  action: "added" | "removed" | "changed";
  myEmoji: string | null;
  counts: Record<string, number>;
  rewardGranted: boolean;
}

const faNum = (n: number) => n.toLocaleString("fa-IR");

/** شمارش واکنش‌ها به تفکیک emoji برای یک آیتم */
export async function getReactionCounts(activityId: string): Promise<Record<string, number>> {
  const grouped = await prisma.reaction.groupBy({
    by: ["emoji"],
    where: { activityId },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const g of grouped) out[g.emoji] = g._count._all;
  return out;
}

/** واکنش‌های مجموعه‌ای از آیتم‌ها برای رندر فید: شمارش‌ها + واکنش خودِ کاربر */
export async function getReactionsForActivities(
  activityIds: string[],
  meId: string
): Promise<{ counts: Record<string, Record<string, number>>; mine: Record<string, string> }> {
  if (activityIds.length === 0) return { counts: {}, mine: {} };

  const grouped = await prisma.reaction.groupBy({
    by: ["activityId", "emoji"],
    where: { activityId: { in: activityIds } },
    _count: { _all: true },
  });
  const counts: Record<string, Record<string, number>> = {};
  for (const g of grouped) {
    (counts[g.activityId] ??= {})[g.emoji] = g._count._all;
  }

  const mineRows = await prisma.reaction.findMany({
    where: { activityId: { in: activityIds }, actorId: meId },
    select: { activityId: true, emoji: true },
  });
  const mine: Record<string, string> = {};
  for (const r of mineRows) mine[r.activityId] = r.emoji;

  return { counts, mine };
}

/** افزودن/تغییر/برداشتن واکنش. اعلان و جایزه فقط هنگام واکنشِ تازه به کاربر دیگر. */
export async function toggleReaction(
  actorId: string,
  activityId: string,
  emoji: string
): Promise<ToggleResult | { error: string }> {
  if (!isValidEmoji(emoji)) return { error: "واکنش نامعتبر است" };

  const dayStart = tehranDayStart();
  const mutation = await withUserLock(actorId, async (tx) => {
    const activity = await tx.activityLog.findUnique({
      where: { id: activityId },
      select: { userId: true },
    });
    if (!activity) return { status: "not_found" } as const;
    const targetUserId = activity.userId;

    const existing = await tx.reaction.findUnique({
      where: { actorId_activityId: { actorId, activityId } },
    });

    let action: ToggleResult["action"];
    let myEmoji: string | null;
    let isNew = false;
    if (!existing) {
      await tx.reaction.create({
        data: { actorId, activityId, targetUserId, emoji },
      });
      action = "added";
      myEmoji = emoji;
      isNew = true;
    } else if (existing.emoji === emoji) {
      await tx.reaction.delete({ where: { id: existing.id } });
      action = "removed";
      myEmoji = null;
    } else {
      await tx.reaction.update({ where: { id: existing.id }, data: { emoji } });
      action = "changed";
      myEmoji = emoji;
    }

    let rewardGranted = false;
    if (isNew && targetUserId !== actorId) {
      const distinctTargets = await tx.reaction.findMany({
        where: {
          actorId,
          targetUserId: { not: actorId },
          createdAt: { gte: dayStart },
        },
        distinct: ["targetUserId"],
        select: { targetUserId: true },
      });
      if (distinctTargets.length >= REACTION_REWARD_TARGETS) {
        const dedupeKey = `reaction-reward:${actorId}:${dayStart.toISOString()}`;
        const existingReward = await tx.inboxItem.findUnique({
          where: { dedupeKey },
          select: { id: true },
        });
        if (!existingReward) {
          await tx.user.update({
            where: { id: actorId },
            data: { coins: { increment: REACTION_REWARD_COINS } },
          });
          await tx.inboxItem.create({
            data: {
              userId: actorId,
              type: "reaction_reward",
              metadata: {
                coins: REACTION_REWARD_COINS,
                targets: REACTION_REWARD_TARGETS,
              },
              dedupeKey,
            },
          });
          rewardGranted = true;
        }
      }
    }

    return {
      status: "updated",
      action,
      myEmoji,
      isNew,
      targetUserId,
      rewardGranted,
    } as const;
  });

  if (mutation.status === "not_found") return { error: "آیتم پیدا نشد" };
  if (mutation.isNew && mutation.targetUserId !== actorId) {
    await notifyReaction(actorId, mutation.targetUserId, activityId, emoji);
  }
  if (mutation.rewardGranted) {
    await sendPushToUser(actorId, {
      title: `${faNum(REACTION_REWARD_COINS)} سکه جایزه گرفتی`,
      body: `امروز ${faNum(REACTION_REWARD_TARGETS)} نفر رو تشویق کردی.`,
      url: "/inbox",
      tag: "reaction_reward",
    });
  }

  const counts = await getReactionCounts(activityId);
  return {
    action: mutation.action,
    myEmoji: mutation.myEmoji,
    counts,
    rewardGranted: mutation.rewardGranted,
  };
}

/** اعلانِ واکنش به گیرنده: آیتم صندوق + Web Push */
async function notifyReaction(actorId: string, targetUserId: string, activityId: string, emoji: string) {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
  const actorName = actor?.name ?? "یک کاربر";

  await createInboxItem({
    userId: targetUserId,
    type: "reaction",
    actorId,
    metadata: { emoji, activityId },
  });

  await sendPushToUser(targetUserId, {
    title: "واکنش جدید",
    body: `${actorName} با ${emoji} به فعالیتت واکنش نشون داد`,
    url: "/inbox",
    tag: "reaction",
  });
}
