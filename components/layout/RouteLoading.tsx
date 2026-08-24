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
      className="flex flex-col gap-4 px-4 pb-3 animate-pulse motion-reduce:animate-none"
    >
      <span className="sr-only">در حال بارگذاری صفحه…</span>
      <div className={`${titleWidth} h-5 rounded-full bg-surface-container-high/70`} />
      <div className={`${primaryHeight} rounded-[24px] border border-outline-variant/25 bg-surface-container-low/80`} />
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-20 rounded-[20px] border border-outline-variant/20 bg-surface-container-low/60"
        />
      ))}
    </div>
  );
}
