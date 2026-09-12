import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import NotificationForm from "@/components/admin/NotificationForm";
import type { Condition } from "@/lib/notification-rules";


async function EditNotificationContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [rule, videoCategories] = await Promise.all([
    prisma.notificationRule.findUnique({ where: { id } }),
    prisma.videoCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true },
    }),
  ]);
  if (!rule) notFound();

  const initial = {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    channels: rule.channels,
    triggerType: rule.triggerType as "scheduled" | "relative" | "event",
    triggerConfig: (rule.triggerConfig ?? {}) as Record<string, unknown>,
    segment: rule.segment ?? "all",
    conditions: (Array.isArray(rule.conditions) ? rule.conditions : []) as unknown as Condition[],
    title: rule.title,
    body: rule.body,
    linkUrl: rule.linkUrl ?? "",
    cooldownHours: rule.cooldownHours,
    quietStart: rule.quietStart,
    quietEnd: rule.quietEnd,
    maxPerDay: rule.maxPerDay,
  };

  return <NotificationForm initial={initial} videoCategories={videoCategories} />;
}

export default function EditNotificationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-96 rounded-2xl bg-surface-container-low" role="status" aria-label="در حال دریافت قانون اعلان" />}>
      <EditNotificationContent params={params} />
    </Suspense>
  );
}
