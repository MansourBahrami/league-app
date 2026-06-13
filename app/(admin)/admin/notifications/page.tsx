import { prisma } from "@/lib/db";
import Link from "next/link";
import NotificationList, { type RuleListItem } from "@/components/admin/NotificationList";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const rules = await prisma.notificationRule.findMany({ orderBy: { createdAt: "desc" } });

  const items: RuleListItem[] = rules.map((r) => ({
    id: r.id,
    name: r.name,
    enabled: r.enabled,
    channels: r.channels,
    triggerType: r.triggerType,
    triggerConfig: r.triggerConfig,
    segment: r.segment,
    sentCount: r.sentCount,
    lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold text-[#0b1c30]">قانون‌های نوتیفیکیشن</h1>
        <Link href="/admin/notifications/new" className="bg-[#4648d4] text-white font-bold text-[14px] px-4 py-2 rounded-xl flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">add</span>
          قانون جدید
        </Link>
      </div>
      <p className="text-[13px] text-[#767586] -mt-1">
        ربات بله فقط به کاربرانی پیام می‌دهد که آن را استارت کرده‌اند؛ بقیه از طریق اعلان مرورگر (در صورت فعال‌بودن) پیام می‌گیرند.
      </p>
      <NotificationList rules={items} />
    </div>
  );
}
