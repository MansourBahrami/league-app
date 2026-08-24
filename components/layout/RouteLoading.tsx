interface RouteLoadingProps {
  titleWidth?: string;
  primaryHeight?: string;
  rows?: number;
}

export default function RouteLoading({
  titleWidth = "w-32",
  primaryHeight = "h-48",
  rows = 2,
}: RouteLoadingProps) {
  return (
    <div
      dir="rtl"
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="route-loading flex flex-col gap-4 px-4 pb-3"
    >
      <span className="sr-only">در حال بارگذاری صفحه…</span>
      <div className="h-1 overflow-hidden rounded-full bg-surface-container-high/80" aria-hidden="true">
        <span className="route-loading-progress block h-full w-1/3 rounded-full bg-primary" />
      </div>
      <div className={`${titleWidth} h-5 rounded-full bg-outline-variant/75`} aria-hidden="true" />
      <div
        className={`${primaryHeight} flex flex-col rounded-[24px] border border-outline-variant/45 bg-surface-container-low/95 p-4 shadow-sm`}
        aria-hidden="true"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-surface-container-high" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded-full bg-outline-variant/75" />
            <div className="h-3 w-1/2 rounded-full bg-surface-container-high" />
          </div>
        </div>
        <div className="mt-auto h-11 rounded-xl bg-primary/15" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex h-20 items-center gap-3 rounded-[20px] border border-outline-variant/35 bg-surface-container-low/85 px-4"
          aria-hidden="true"
        >
          <div className="h-10 w-10 shrink-0 rounded-full bg-surface-container-high" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/5 rounded-full bg-outline-variant/65" />
            <div className="h-3 w-2/5 rounded-full bg-surface-container-high" />
          </div>
        </div>
      ))}
    </div>
  );
}
