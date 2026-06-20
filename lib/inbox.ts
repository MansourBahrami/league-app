import { prisma } from "@/lib/db";

/**
 * صندوق پیام/نوتیفیکیشن کاربر.
 * فعلاً واکنش‌های دریافتی و جایزه‌ها را نگه می‌دارد؛ مدل (`type` + `body`) آماده‌ی
 * توسعه به پیام خصوصی (DM) است.
 */

export interface CreateInboxInput {
  userId: string; // گیرنده
  type: string; // reaction | reaction_reward | system | message
  actorId?: string | null;
  body?: string | null;
  metadata?: object;
}

export async function createInboxItem(input: CreateInboxInput) {
  return prisma.inboxItem.create({
    data: {
      userId: input.userId,
      type: input.type,
      actorId: input.actorId ?? null,
      body: input.body ?? null,
      metadata: (input.metadata ?? undefined) as object | undefined,
    },
  });
}

/** تعداد نوتیف‌های نخوانده (برای نشان زنگوله‌ی هدر) */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.inboxItem.count({ where: { userId, read: false } });
}

export async function listInbox(userId: string, take = 50) {
  return prisma.inboxItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

/** علامت‌گذاری همه‌ی آیتم‌های نخوانده به‌عنوان خوانده‌شده. تعداد تغییریافته را برمی‌گرداند. */
export async function markAllRead(userId: string): Promise<number> {
  const res = await prisma.inboxItem.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return res.count;
}
