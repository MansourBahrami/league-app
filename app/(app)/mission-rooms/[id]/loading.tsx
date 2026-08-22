export default function MissionRoomDetailsLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-4 animate-pulse" dir="rtl">
      {/* Header Banner Skeleton */}
      <header className="glass-card overflow-hidden rounded-[2rem] border border-primary/20 bg-surface-container-low/80">
        <div className="bg-primary/20 px-4 pb-5 pt-4">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-full bg-surface-container-high/60" />
            <div className="h-6 w-20 rounded-full bg-surface-container-high/60" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-surface-container-high/60" />
            <div className="flex-1 space-y-2 text-right">
              <div className="h-3.5 w-24 rounded-full bg-surface-container-high/60" />
              <div className="h-5 w-44 rounded-full bg-surface-container-high/80" />
              <div className="h-3 w-36 rounded-full bg-surface-container-high/50" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-outline-variant/30 px-3 py-3 text-center">
          <div className="flex flex-col items-center gap-1"><div className="h-5 w-8 rounded-full bg-surface-container-high/70" /><div className="h-3 w-10 rounded-full bg-surface-container/50" /></div>
          <div className="flex flex-col items-center gap-1"><div className="h-5 w-8 rounded-full bg-surface-container-high/70" /><div className="h-3 w-14 rounded-full bg-surface-container/50" /></div>
          <div className="flex flex-col items-center gap-1"><div className="h-5 w-8 rounded-full bg-surface-container-high/70" /><div className="h-3 w-12 rounded-full bg-surface-container/50" /></div>
        </div>
      </header>

      {/* Progress Card Skeleton */}
      <section className="glass-card rounded-2xl p-4 border border-outline-variant/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5 text-right">
            <div className="h-3.5 w-28 rounded-full bg-surface-container-high/70" />
            <div className="h-5 w-32 rounded-full bg-surface-container-high/80" />
          </div>
          <div className="h-7 w-12 rounded-full bg-surface-container-high/80" />
        </div>
        <div className="h-3 w-full rounded-full bg-surface-container-high/60" />
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 rounded-full bg-surface-container/50" />
          <div className="h-3 w-16 rounded-full bg-surface-container/50" />
        </div>
        <div className="h-11 w-full rounded-xl bg-surface-container-high/70 mt-3" />
      </section>

      {/* Roster Skeleton */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="h-4.5 w-24 rounded-full bg-surface-container-high/70" />
          <div className="h-3.5 w-20 rounded-full bg-surface-container/50" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl border border-outline-variant/30 p-3.5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-surface-container/70" />
              <div className="h-11 w-11 shrink-0 rounded-full bg-surface-container/80" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-28 rounded-full bg-surface-container-high/70" />
                <div className="h-3 w-16 rounded-full bg-surface-container/50" />
              </div>
              <div className="space-y-1 text-left">
                <div className="h-4 w-10 rounded-full bg-surface-container-high/70" />
                <div className="h-3 w-14 rounded-full bg-surface-container/50" />
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-container-high/50" />
          </div>
        ))}
      </section>
    </div>
  );
}
