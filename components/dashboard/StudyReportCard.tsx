import { prisma } from "@/lib/db";
import { tehranDayStartDaysAgo, tehranDayDiff, tehranParts } from "@/lib/date";
import { formatStudyMinutes } from "@/lib/gamification";

interface Props {
  userId: string;
}

const DAYS = 14; // دو هفته‌ی اخیر

/**
 * گزارش تقویم‌محورِ مطالعه: دقیقه‌ی مطالعه‌ی هر روز (به وقت تهران، تاریخ شمسی).
 * در انتهای داشبورد نمایش داده می‌شود.
 */
export default async function StudyReportCard({ userId }: Props) {
  const rangeStart = tehranDayStartDaysAgo(DAYS - 1);
  const sessions = await prisma.studySession.findMany({
    where: { userId, startTime: { gte: rangeStart } },
    select: { startTime: true, durationMin: true },
  });

  const now = new Date();
  // سطل‌ها: index 0 = امروز ... DAYS-1 = قدیمی‌ترین
  const buckets = new Array(DAYS).fill(0) as number[];
  for (const s of sessions) {
    const idx = tehranDayDiff(now, s.startTime);
    if (idx >= 0 && idx < DAYS) buckets[idx] += s.durationMin;
  }

  const maxMin = Math.max(60, ...buckets); // برای شدت رنگ
  const weekTotal = buckets.slice(0, 7).reduce((a, b) => a + b, 0);

  // از قدیمی (راست در RTL) به جدید
  const cells = Array.from({ length: DAYS }, (_, i) => DAYS - 1 - i).map((idx) => {
    const dayInstant = new Date(now.getTime() - idx * 86400000);
    const { jd, monthName, weekday } = tehranParts(dayInstant);
    const min = buckets[idx];
    return { idx, jd, monthName, weekday, min };
  });

  return (
    <section className="glass-card rounded-2xl p-4 mb-2">
      <div className="flex items-center justify-between mb-3 flex-row-reverse">
        <h3 className="text-[16px] font-bold text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
          گزارش مطالعه
        </h3>
        <span className="text-[12px] font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">
          ۷ روز اخیر: {formatStudyMinutes(weekTotal)}
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 hide-scrollbar" dir="rtl">
        {cells.map((c) => {
          const intensity = c.min > 0 ? Math.max(0.18, c.min / maxMin) : 0;
          const isToday = c.idx === 0;
          return (
            <div key={c.idx} className="flex flex-col items-center gap-1 shrink-0 w-11">
              <span className="text-[9px] text-on-surface-variant">{c.weekday.slice(0, 3)}</span>
              <div
                className={`w-11 h-14 rounded-lg flex flex-col items-center justify-center border ${
                  isToday ? "border-primary border-2" : "border-outline-variant/30"
                }`}
                style={{ backgroundColor: c.min > 0 ? `rgba(70,72,212,${intensity})` : "var(--color-surface-container)" }}
                title={`${c.min} دقیقه`}
              >
                <span className={`text-[13px] font-extrabold ${intensity > 0.5 ? "text-white" : "text-on-surface"}`}>
                  {c.jd.toLocaleString("fa-IR")}
                </span>
                <span className={`text-[8px] ${intensity > 0.5 ? "text-white/80" : "text-on-surface-variant"}`}>
                  {c.monthName.slice(0, 4)}
                </span>
              </div>
              <span className={`text-[9px] font-semibold ${c.min > 0 ? "text-primary" : "text-outline-variant"}`}>
                {c.min > 0 ? `${Math.round(c.min / 60 * 10) / 10}س`.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-on-surface-variant/70 mt-1 text-right">رنگ پررنگ‌تر = مطالعه‌ی بیشتر · امروز با قاب آبی</p>
    </section>
  );
}
