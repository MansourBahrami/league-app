import { prisma } from "@/lib/db";
import { tehranDayStartDaysAgo, tehranDayDiff, tehranParts } from "@/lib/date";
import { formatStudyMinutes } from "@/lib/gamification";

interface Props {
  userId: string;
  days?: number;
}

const CHART_H = 104; // ارتفاع ناحیه‌ی میله‌ها (px)

/**
 * گزارش مطالعه به‌صورت نمودار میله‌ای: دقیقه‌ی مطالعه‌ی هر روز
 * (به وقت تهران، تاریخ شمسی). در انتهای داشبورد نمایش داده می‌شود.
 */
export default async function StudyReportCard({ userId, days = 14 }: Props) {
  const DAYS = days;
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

  const maxMin = Math.max(60, ...buckets); // سقف محور برای مقیاس میله‌ها
  const weekTotal = buckets.slice(0, 7).reduce((a, b) => a + b, 0);
  const activeDays = buckets.filter((b) => b > 0).length;
  const avgPerActiveDay = activeDays > 0 ? Math.round(buckets.reduce((a, b) => a + b, 0) / activeDays) : 0;

  // خطوط راهنمای افقی (۲۵٪/۵۰٪/۷۵٪ سقف)
  const gridLines = [0.25, 0.5, 0.75];

  // از قدیمی (راست در RTL) به جدید
  const cells = Array.from({ length: DAYS }, (_, i) => DAYS - 1 - i).map((idx) => {
    const dayInstant = new Date(now.getTime() - idx * 86400000);
    const { jd, monthName, weekday } = tehranParts(dayInstant);
    return { idx, jd, monthName, weekday, min: buckets[idx] };
  });

  return (
    <section className="glass-card rounded-xl p-4 mb-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[15px] font-bold text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
          نمودار مطالعه
        </h3>
        <span className="text-[12px] font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">
          ۷ روز اخیر: {formatStudyMinutes(weekTotal)}
        </span>
      </div>
      <p className="text-[11px] text-on-surface-variant/80 mb-3 text-right">
        میانگین روزهای فعال: {formatStudyMinutes(avgPerActiveDay)}
      </p>

      <div className="relative overflow-x-auto hide-scrollbar pb-1" dir="rtl">
        {/* ناحیه‌ی نمودار با خطوط راهنما */}
        <div className="relative" style={{ height: CHART_H }}>
          {gridLines.map((g) => (
            <div
              key={g}
              className="absolute left-0 right-0 border-t border-dashed border-outline-variant/30"
              style={{ bottom: `${g * 100}%` }}
            />
          ))}
          <div className="absolute left-0 right-0 bottom-0 border-t border-outline-variant/50" />

          {/* میله‌ها */}
          <div className="flex items-end gap-1.5 h-full">
            {cells.map((c) => {
              const h = c.min > 0 ? Math.max(4, Math.round((c.min / maxMin) * CHART_H)) : 0;
              const isToday = c.idx === 0;
              return (
                <div key={c.idx} className="flex flex-col items-center justify-end h-full w-7 shrink-0">
                  {c.min > 0 && (
                    <span className="text-[8px] font-bold text-primary mb-0.5 leading-none">
                      {(Math.round((c.min / 60) * 10) / 10).toLocaleString("fa-IR")}
                    </span>
                  )}
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      c.min > 0
                        ? isToday
                          ? "bg-gradient-to-t from-primary to-primary-container"
                          : "bg-gradient-to-t from-primary/70 to-primary/40"
                        : "bg-surface-container"
                    }`}
                    style={{ height: c.min > 0 ? h : 3 }}
                    title={`${c.min} دقیقه`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* برچسب روزها زیر میله‌ها */}
        <div className="flex items-start gap-1.5 mt-1">
          {cells.map((c) => {
            const isToday = c.idx === 0;
            return (
              <div key={c.idx} className="flex flex-col items-center w-7 shrink-0">
                <span className={`text-[11px] font-extrabold leading-none ${isToday ? "text-primary" : "text-on-surface"}`}>
                  {c.jd.toLocaleString("fa-IR")}
                </span>
                <span className="text-[8px] text-on-surface-variant/80 mt-0.5">{c.weekday.slice(0, 1)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-on-surface-variant/70 mt-2 text-right">میله‌ی بلندتر = مطالعه‌ی بیشتر · امروز پررنگ</p>
    </section>
  );
}
