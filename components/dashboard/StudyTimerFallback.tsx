const TIMER_OPTIONS = [120, 90, 60, 30, 15];

export default function StudyTimerFallback() {
  return (
    <section
      role="status"
      aria-label="در حال آماده‌سازی تایمر"
      aria-busy="true"
      className="glass-card rounded-[2rem] border border-tertiary-fixed/65 px-4 py-4 shadow-[0_12px_35px_color-mix(in_oklab,var(--color-primary)_9%,transparent)]"
    >
      <div className="border-b border-outline-variant/35 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[18px] font-extrabold text-on-surface">ماموریت امروز</p>
            <p className="mt-1 text-[11.5px] text-on-surface-variant">پیشرفت بعد از دریافت اطلاعات نمایش داده می‌شود</p>
          </div>
          <span className="rounded-full bg-tertiary-fixed/55 px-2.5 py-1 text-[11px] font-bold text-tertiary">روزانه</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
          <span className="block h-full w-1/4 rounded-full bg-primary/20" />
        </div>
      </div>

      <div className="pt-4">
        <div className="focus-timer-halo mx-auto">
          <span className="material-symbols-outlined focus-timer-spark text-tertiary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          <time className="text-[46px] leading-none font-extrabold text-primary" dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>--:--</time>
          <p className="mt-2 px-2 text-center text-[11.5px] text-on-surface-variant">در حال تطبیق با وضعیت سرور…</p>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-1.5" dir="ltr" aria-label="مدت‌های مطالعه">
          {TIMER_OPTIONS.map((minutes) => (
            <span
              key={minutes}
              className="flex h-11 items-center justify-center rounded-xl border border-outline-variant/45 text-[13px] font-bold text-on-surface-variant/65"
            >
              {minutes.toLocaleString("fa-IR")}
            </span>
          ))}
        </div>

        <button
          type="button"
          disabled
          className="gamified-btn mt-3 flex w-full cursor-wait items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[16px] font-extrabold text-on-primary opacity-70 shadow-lg"
        >
          <span className="material-symbols-outlined text-[21px] animate-spin motion-reduce:animate-none">progress_activity</span>
          در حال آماده‌سازی…
        </button>
      </div>
    </section>
  );
}
