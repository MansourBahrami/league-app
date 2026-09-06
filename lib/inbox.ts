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
  return prisma.$transaction(async (tx) => {
    // ابتدا ردیف کاربر را قفل می‌کنیم تا create و markAllRead روی شمارنده مسابقه ندهند.
    await tx.user.update({
      where: { id: input.userId },
      data: { unreadInboxCount: { increment: 1 } },
      select: { id: true },
    });
    return tx.inboxItem.create({
      data: {
        userId: input.userId,
        type: input.type,
        actorId: input.actorId ?? null,
        body: input.body ?? null,
        metadata: (input.metadata ?? undefined) as object | undefined,
      },
    });
  });
}

/** تعداد نوتیف‌های نخوانده (برای نشان زنگوله‌ی هدر) */
export async function getUnreadCount(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { unreadInboxCount: true },
  });
  return user?.unreadInboxCount ?? 0;
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
  return prisma.$transaction(async (tx) => {
    // update ردیف User قفل سطری می‌گیرد؛ createInboxItem نیز همین ترتیب را دارد.
    await tx.user.update({
      where: { id: userId },
      data: { unreadInboxCount: 0 },
      select: { id: true },
    });
    const res = await tx.inboxItem.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return res.count;
  });
}
