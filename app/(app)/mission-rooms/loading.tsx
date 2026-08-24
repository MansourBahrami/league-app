export default function MissionRoomsLoading() {
  return (
    <div
      className="flex flex-col gap-4 px-4 pb-4 animate-pulse motion-reduce:animate-none"
      dir="rtl"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">در حال بارگذاری مأموریت‌ها…</span>
      {/* Header Skeleton */}
      <div className="glass-card rounded-2xl px-4 py-3 border border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-surface-container-high/70" />
          <div className="flex-1 space-y-1.5 text-right">
            <div className="h-5 w-28 rounded-full bg-surface-container-high/70" />
            <div className="h-3.5 w-48 rounded-full bg-surface-container/60" />
          </div>
          <div className="h-6 w-16 rounded-full bg-surface-container/70" />
        </div>
      </div>

      {/* Chooser Skeleton */}
      <section className="glass-card rounded-[2rem] p-4 border border-outline-variant/30 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-surface-container-high/60" />
          <div className="flex-1 space-y-1.5 text-right">
            <div className="h-4.5 w-40 rounded-full bg-surface-container-high/70" />
            <div className="h-3 w-56 rounded-full bg-surface-container/50" />
          </div>
        </div>

        {/* Tab buttons skeleton */}
        <div className="flex gap-1 rounded-2xl bg-surface-container/60 p-1">
          <div className="h-10 flex-1 rounded-xl bg-surface-container-high/80" />
          <div className="h-10 flex-1 rounded-xl bg-surface-container/40" />
        </div>

        {/* Mission cards skeletons */}
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/70 p-3.5 flex items-center gap-3"
            >
              <div className="h-11 w-11 shrink-0 rounded-full bg-surface-container/70" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded-full bg-surface-container-high/70" />
                <div className="h-3 w-40 rounded-full bg-surface-container/50" />
              </div>
              <div className="h-9 w-24 shrink-0 rounded-xl bg-surface-container-high/80" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
