interface Props {
  streak: number;
  studiedToday: boolean;
}

/**
 * نمایش استریک (جایگزین باکس مسیر ۶ روزه بعد از آنبوردینگ).
 * یک ردیف ۶ شعله: به اندازه‌ی استریک (سقف ۶) روشن.
 */
export default function StreakCard({ streak, studiedToday }: Props) {
  const litCount = Math.min(6, streak % 6 === 0 && streak > 0 ? 6 : streak % 6);
  const cycles = Math.floor(streak / 6);

  return (
    <section className="glass-card rounded-2xl p-4 border-r-4 border-r-tertiary-fixed-dim">
      <div className="flex items-center justify-between mb-3 flex-row-reverse">
        <h3 className="text-[16px] font-bold text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-tertiary text-[20px] streak-flame" style={{ fontVariationSettings: "'FILL' 1" }}>
            local_fire_department
          </span>
          زنجیره‌ی مطالعه
        </h3>
        <span className="text-[15px] font-extrabold text-tertiary">
          {streak.toLocaleString("fa-IR")} روز
        </span>
      </div>

      <div className="flex justify-between items-center gap-1" dir="rtl">
        {Array.from({ length: 6 }).map((_, i) => {
          const lit = i < litCount;
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  lit ? "bg-tertiary-fixed-dim/30 border border-tertiary-fixed-dim" : "bg-surface-container border border-outline-variant/40"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${lit ? "text-tertiary" : "text-outline-variant/50"}`}
                  style={{ fontVariationSettings: `'FILL' ${lit ? 1 : 0}` }}
                >
                  local_fire_department
                </span>
              </div>
              <span className={`text-[9px] font-semibold ${lit ? "text-tertiary" : "text-outline-variant"}`}>
                {(i + 1).toLocaleString("fa-IR")}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[12px] font-medium text-on-surface-variant mt-3 text-right">
        {streak === 0
          ? "امروز شروع کن تا زنجیره‌ات بسازی! 🔥"
          : studiedToday
          ? `${streak.toLocaleString("fa-IR")} روز پیاپی! امروزم ثبت شد ✓${cycles > 0 ? ` · ${cycles.toLocaleString("fa-IR")} دور کامل` : ""}`
          : `${streak.toLocaleString("fa-IR")} روز پیاپی! امروز هنوز درس نخوندی — نذار بسوزه 🔥`}
      </p>
    </section>
  );
}
