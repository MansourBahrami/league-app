export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

const faRelativeTime = new Intl.RelativeTimeFormat("fa-IR", { numeric: "auto" });

/** زمان نسبی سبک برای کلاینت؛ بدون اضافه‌کردن date-fns به باندل هر صفحه. */
export function formatRelativeTimeFa(value: string | Date, nowMs = Date.now()): string {
  const targetMs = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(targetMs)) return "";

  const deltaSeconds = Math.round((targetMs - nowMs) / 1000);
  const absoluteSeconds = Math.abs(deltaSeconds);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 365 * 24 * 60 * 60],
    ["month", 30 * 24 * 60 * 60],
    ["week", 7 * 24 * 60 * 60],
    ["day", 24 * 60 * 60],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, secondsPerUnit] of units) {
    if (absoluteSeconds >= secondsPerUnit) {
      return faRelativeTime.format(Math.round(deltaSeconds / secondsPerUnit), unit);
    }
  }
  return faRelativeTime.format(deltaSeconds, "second");
}
