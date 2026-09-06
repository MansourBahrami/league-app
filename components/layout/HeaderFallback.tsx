export default function HeaderFallback() {
  return (
    <header
      role="status"
      aria-label="در حال دریافت اطلاعات حساب"
      aria-busy="true"
      className="liquid-glass fixed top-3 left-1/2 -translate-x-1/2 z-50 flex justify-between items-center w-[calc(100%-1.5rem)] max-w-[576px] px-4 py-2 rounded-[24px]"
    >
      <div className="flex items-center gap-2.5" aria-hidden="true">
        <div className="h-10 w-10 rounded-full border-2 border-primary/10 bg-primary-fixed/70" />
        <div className="flex flex-col items-start gap-1.5">
          <span className="h-3.5 w-16 rounded-full bg-outline-variant/65" />
          <span className="h-2.5 w-20 rounded-full bg-surface-container-high" />
        </div>
      </div>
      <div className="flex items-center gap-2" dir="ltr" aria-hidden="true">
        <div className="h-9 w-9 rounded-full bg-surface-container-high" />
        <div className="h-8 w-12 rounded-full bg-surface-container-high" />
        <div className="h-8 w-12 rounded-full bg-surface-container-high" />
      </div>
    </header>
  );
}
