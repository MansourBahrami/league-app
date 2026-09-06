import { prisma } from "@/lib/db";

function daysAgo(days: number, now: Date) {
  return new Date(now.getTime() - days * 86_400_000);
}

async function cleanupInboxItems(cutoff: Date): Promise<number> {
  const readItems = await prisma.inboxItem.deleteMany({
    where: { createdAt: { lt: cutoff }, read: true },
  });
  const recipients = await prisma.inboxItem.findMany({
    where: { createdAt: { lt: cutoff }, read: false },
    distinct: ["userId"],
    select: { userId: true },
    orderBy: { userId: "asc" },
  });

  let unreadDeleted = 0;
  // unreadهای قدیمی کم‌تعدادند. تراکنش مجزا برای هر کاربر، شمارنده را در برابر
  // اعلان تازه یا markAllRead همگام نگه می‌دارد و یک تراکنش بسیار بزرگ نمی‌سازد.
  for (const { userId } of recipients) {
    unreadDeleted += await prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE
      `;
      const deleted = await tx.inboxItem.deleteMany({
        where: { userId, createdAt: { lt: cutoff }, read: false },
      });
      const unreadInboxCount = await tx.inboxItem.count({ where: { userId, read: false } });
      await tx.user.update({
        where: { id: userId },
        data: { unreadInboxCount },
        select: { id: true },
      });
      return deleted.count;
    });
  }

  return readItems.count + unreadDeleted;
}

/** سیاست نگه‌داری داده‌های عملیاتی؛ داده مطالعه و اقتصاد کاربر تا حذف حساب حفظ می‌شود. */
export async function runRetentionCleanup(now = new Date()) {
  const [authAttempts, notificationLogs, activityLogs, inboxItems, auditLogs, productEvents, reports] = await Promise.all([
    prisma.authAttempt.deleteMany({ where: { createdAt: { lt: daysAgo(90, now) } } }),
    prisma.notificationLog.deleteMany({ where: { sentAt: { lt: daysAgo(180, now) } } }),
    prisma.activityLog.deleteMany({ where: { createdAt: { lt: daysAgo(365, now) } } }),
    cleanupInboxItems(daysAgo(365, now)),
    prisma.adminAuditLog.deleteMany({ where: { createdAt: { lt: daysAgo(730, now) } } }),
    prisma.productEventOutbox.deleteMany({
      where: {
        OR: [
          { status: "sent", sentAt: { lt: daysAgo(90, now) } },
          // اگر اجرای load test به هر دلیل پیش از cleanup قطع شد، دادهٔ suppressed ماندگار نشود.
          { status: "suppressed", createdAt: { lt: daysAgo(1, now) } },
        ],
      },
    }),
    prisma.userReport.deleteMany({ where: { status: { in: ["reviewed", "dismissed"] }, createdAt: { lt: daysAgo(365, now) } } }),
  ]);
  return {
    authAttempts: authAttempts.count,
    notificationLogs: notificationLogs.count,
    activityLogs: activityLogs.count,
    inboxItems,
    auditLogs: auditLogs.count,
    productEvents: productEvents.count,
    reports: reports.count,
  };
}
