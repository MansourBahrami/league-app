import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import NotificationForm from "@/components/admin/NotificationForm";
import type { Condition } from "@/lib/notification-rules";

export const dynamic = "force-dynamic";

export default async function EditNotificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rule = await prisma.notificationRule.findUnique({ where: { id } });
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

  return <NotificationForm initial={initial} />;
}
