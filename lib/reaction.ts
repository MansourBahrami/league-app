import { prisma } from "@/lib/db";
import { tehranDayStart } from "@/lib/date";
import { sendPushToUser } from "@/lib/push";
import { createInboxItem } from "@/lib/inbox";

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

  const activity = await prisma.activityLog.findUnique({
    where: { id: activityId },
    select: { id: true, userId: true },
  });
  if (!activity) return { error: "آیتم پیدا نشد" };
  const targetUserId = activity.userId;

  const existing = await prisma.reaction.findUnique({
    where: { actorId_activityId: { actorId, activityId } },
  });

  let action: ToggleResult["action"];
  let myEmoji: string | null;
  let isNew = false;

  if (!existing) {
    await prisma.reaction.create({ data: { actorId, activityId, targetUserId, emoji } });
    action = "added";
    myEmoji = emoji;
    isNew = true;
  } else if (existing.emoji === emoji) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    action = "removed";
    myEmoji = null;
  } else {
    await prisma.reaction.update({ where: { id: existing.id }, data: { emoji } });
    action = "changed";
    myEmoji = emoji;
  }

  let rewardGranted = false;
  if (isNew && targetUserId !== actorId) {
    await notifyReaction(actorId, targetUserId, activityId, emoji);
    rewardGranted = await maybeGrantDailyReward(actorId);
  }

  const counts = await getReactionCounts(activityId);
  return { action, myEmoji, counts, rewardGranted };
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

/** جایزه‌ی روزانه: اگر امروز به ≥ ۵ نفر واکنش داده و هنوز جایزه نگرفته، ۵ سکه می‌گیرد. */
async function maybeGrantDailyReward(actorId: string): Promise<boolean> {
  const dayStart = tehranDayStart();

  const already = await prisma.inboxItem.findFirst({
    where: { userId: actorId, type: "reaction_reward", createdAt: { gte: dayStart } },
    select: { id: true },
  });
  if (already) return false;

  const distinct = await prisma.reaction.findMany({
    where: { actorId, targetUserId: { not: actorId }, createdAt: { gte: dayStart } },
    distinct: ["targetUserId"],
    select: { targetUserId: true },
  });
  if (distinct.length < REACTION_REWARD_TARGETS) return false;

  await prisma.user.update({
    where: { id: actorId },
    data: { coins: { increment: REACTION_REWARD_COINS } },
  });
  await createInboxItem({
    userId: actorId,
    type: "reaction_reward",
    metadata: { coins: REACTION_REWARD_COINS, targets: REACTION_REWARD_TARGETS },
  });
  await sendPushToUser(actorId, {
    title: "جایزه‌ی تشویق 🎉",
    body: `امروز به ${faNum(REACTION_REWARD_TARGETS)} نفر واکنش دادی و ${faNum(REACTION_REWARD_COINS)} سکه گرفتی!`,
    url: "/inbox",
    tag: "reaction_reward",
  });
  return true;
}
