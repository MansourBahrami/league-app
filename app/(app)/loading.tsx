export default function AppLoading() {
  return (
    <div
      className="flex flex-col gap-4 px-4 pb-2 animate-pulse motion-reduce:animate-none"
      dir="rtl"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">در حال بارگذاری صفحه…</span>
      {/* Top Card Skeleton */}
      <div className="glass-card rounded-[24px] p-5 flex flex-col items-center justify-center min-h-[220px] bg-surface-container-low/60 border border-outline-variant/30">
        <div className="w-28 h-28 rounded-full bg-surface-container-high/60 mb-4" />
        <div className="w-36 h-5 rounded-full bg-surface-container-high/60 mb-2" />
        <div className="w-24 h-4 rounded-full bg-surface-container/60" />
      </div>

      {/* Secondary Card Skeleton */}
      <div className="glass-card rounded-[20px] p-4 flex flex-col gap-3 bg-surface-container-low/40 border border-outline-variant/20">
        <div className="flex items-center justify-between">
          <div className="w-28 h-4 rounded-full bg-surface-container-high/60" />
          <div className="w-16 h-4 rounded-full bg-surface-container/60" />
        </div>
        <div className="w-full h-12 rounded-[14px] bg-surface-container/40" />
        <div className="w-full h-12 rounded-[14px] bg-surface-container/40" />
      </div>
    </div>
  );
}
