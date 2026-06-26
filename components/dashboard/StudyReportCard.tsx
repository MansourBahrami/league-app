import { prisma } from "@/lib/db";
import { tehranDayStartDaysAgo, tehranDayDiff, tehranParts } from "@/lib/date";
import StudyReportChart, { type DayCell } from "@/components/dashboard/StudyReportChart";

interface Props {
  userId: string;
  /** بیشترین بازه‌ی قابل نمایش (روز) — کاربر بین ۷ تا این مقدار جابه‌جا می‌شود */
  maxDays?: number;
}

/**
 * گزارش مطالعه به‌صورت نمودار میله‌ای: دقیقه‌ی مطالعه‌ی هر روز (به وقت تهران، تاریخ
 * شمسی). داده‌ی تا `maxDays` روز سمت سرور آماده و به نمودار کلاینت سپرده می‌شود؛
 * کاربر بازه‌ی نمایش (۷/۱۴/۳۰) را آن‌جا تغییر می‌دهد.
 */
export default async function StudyReportCard({ userId, maxDays = 30 }: Props) {
  const rangeStart = tehranDayStartDaysAgo(maxDays - 1);
  const sessions = await prisma.studySession.findMany({
    where: { userId, startTime: { gte: rangeStart } },
    select: { startTime: true, durationMin: true },
  });

  const now = new Date();
  // سطل‌ها: index 0 = امروز ... maxDays-1 = قدیمی‌ترین
  const buckets = new Array(maxDays).fill(0) as number[];
  for (const s of sessions) {
    const idx = tehranDayDiff(now, s.startTime);
    if (idx >= 0 && idx < maxDays) buckets[idx] += s.durationMin;
  }

  // سلول‌ها با برچسب شمسی (محاسبه‌ی تاریخ سمت سرور)
  const cells: DayCell[] = Array.from({ length: maxDays }, (_, idx) => {
    const dayInstant = new Date(now.getTime() - idx * 86400000);
    const { jd, weekday } = tehranParts(dayInstant);
    return { idx, jd, weekday, min: buckets[idx] };
  });

  return <StudyReportChart cells={cells} />;
}
