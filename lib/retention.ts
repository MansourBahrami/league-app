import { prisma } from "@/lib/db";

function daysAgo(days: number, now: Date) {
  return new Date(now.getTime() - days * 86_400_000);
}

/** سیاست نگه‌داری داده‌های عملیاتی؛ داده مطالعه و اقتصاد کاربر تا حذف حساب حفظ می‌شود. */
export async function runRetentionCleanup(now = new Date()) {
  const [authAttempts, notificationLogs, activityLogs, inboxItems, auditLogs, productEvents, reports] = await Promise.all([
    prisma.authAttempt.deleteMany({ where: { createdAt: { lt: daysAgo(90, now) } } }),
    prisma.notificationLog.deleteMany({ where: { sentAt: { lt: daysAgo(180, now) } } }),
    prisma.activityLog.deleteMany({ where: { createdAt: { lt: daysAgo(365, now) } } }),
    prisma.inboxItem.deleteMany({ where: { createdAt: { lt: daysAgo(365, now) } } }),
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
    inboxItems: inboxItems.count,
    auditLogs: auditLogs.count,
    productEvents: productEvents.count,
    reports: reports.count,
  };
}
