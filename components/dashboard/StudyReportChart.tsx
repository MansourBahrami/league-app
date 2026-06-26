"use client";

import { useState } from "react";
import { formatStudyMinutes } from "@/lib/gamification";

/** یک سلول روز: idx = چند روز پیش (۰ = امروز)، برچسب شمسی + دقیقه‌ی مطالعه */
export interface DayCell {
  idx: number;
  jd: number;
  weekday: string;
  min: number;
}

interface Props {
  /** سلول‌ها به ترتیب idx صعودی (۰ = امروز ... قدیمی‌ترین در انتها) */
  cells: DayCell[];
}

const CHART_H = 104; // ارتفاع ناحیه‌ی میله‌ها (px)
const RANGE_OPTIONS = [7, 14, 30];
const GRID_LINES = [0.25, 0.5, 0.75];

export default function StudyReportChart({ cells }: Props) {
  // فقط بازه‌هایی که داده‌شان موجود است (بر اساس تعداد سلول‌های پاس‌داده‌شده)
  const rangeOptions = RANGE_OPTIONS.filter((d) => d <= cells.length);
  if (rangeOptions.length === 0) rangeOptions.push(cells.length);
  const [days, setDays] = useState(rangeOptions[0]);

  // فقط روزهای بازه‌ی انتخابی، و برای نمایش از قدیمی (راست در RTL) به جدید
  const visible = cells.filter((c) => c.idx < days);
  const display = [...visible].sort((a, b) => b.idx - a.idx);

  const maxMin = Math.max(60, ...visible.map((c) => c.min));
  const total = visible.reduce((a, c) => a + c.min, 0);
  const activeDays = visible.filter((c) => c.min > 0).length;
  const avgPerActiveDay = activeDays > 0 ? Math.round(total / activeDays) : 0;

  // برای بازه‌های بزرگ‌تر: فاصله‌ی کمتر بین میله‌ها و برچسب‌های تنک‌تر
  const gapCls = days <= 7 ? "gap-1.5" : days <= 14 ? "gap-1" : "gap-[2px]";
  const showLabel = (c: DayCell) =>
    days <= 14 || c.idx === 0 || c.idx === days - 1 || c.idx % 5 === 0;

  return (
    <section className="glass-card rounded-xl p-4 mb-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[15px] font-bold text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
          نمودار مطالعه
        </h3>
        <span className="text-[12px] font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">
          {days.toLocaleString("fa-IR")} روز اخیر: {formatStudyMinutes(total)}
        </span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-on-surface-variant/80 text-right">
          میانگین روزهای فعال: {formatStudyMinutes(avgPerActiveDay)}
        </p>
        {/* سلکتور بازه‌ی تاریخچه (وقتی بیش از یک بازه موجود باشد) */}
        {rangeOptions.length > 1 && (
        <div className="flex gap-1" dir="ltr">
          {rangeOptions.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                days === d
                  ? "bg-primary text-on-primary shadow-sm"
                  : "border border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {d.toLocaleString("fa-IR")} روز
            </button>
          ))}
        </div>
        )}
      </div>

      <div className="relative pb-1" dir="rtl">
        {/* ناحیه‌ی نمودار با خطوط راهنما */}
        <div className="relative" style={{ height: CHART_H }}>
          {GRID_LINES.map((g) => (
            <div
              key={g}
              className="absolute left-0 right-0 border-t border-dashed border-outline-variant/30"
              style={{ bottom: `${g * 100}%` }}
            />
          ))}
          <div className="absolute left-0 right-0 bottom-0 border-t border-outline-variant/50" />

          {/* میله‌ها — تمام‌عرض تا کل بازه بدون اسکرول دیده شود */}
          <div className={`flex items-end ${gapCls} h-full`}>
            {display.map((c) => {
              const h = c.min > 0 ? Math.max(4, Math.round((c.min / maxMin) * CHART_H)) : 0;
              const isToday = c.idx === 0;
              return (
                <div key={c.idx} className="flex flex-col items-center justify-end h-full flex-1 min-w-0">
                  {c.min > 0 && days <= 14 && (
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
        <div className={`flex items-start ${gapCls} mt-1`}>
          {display.map((c) => {
            const isToday = c.idx === 0;
            return (
              <div key={c.idx} className="flex flex-col items-center flex-1 min-w-0">
                {showLabel(c) ? (
                  <>
                    <span className={`text-[11px] font-extrabold leading-none ${isToday ? "text-primary" : "text-on-surface"}`}>
                      {c.jd.toLocaleString("fa-IR")}
                    </span>
                    {days <= 14 && <span className="text-[8px] text-on-surface-variant/80 mt-0.5">{c.weekday.slice(0, 1)}</span>}
                  </>
                ) : (
                  <span className="text-[8px] leading-none">&nbsp;</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-on-surface-variant/70 mt-2 text-right">میله‌ی بلندتر = مطالعه‌ی بیشتر · امروز پررنگ</p>
    </section>
  );
}
