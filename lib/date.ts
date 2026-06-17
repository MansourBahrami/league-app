/**
 * ابزار تاریخ/زمان با مبنای وقت تهران (Asia/Tehran).
 *
 * ایران از سپتامبر ۲۰۲۲ ساعت تابستانی ندارد؛ پس آفست ثابت +۳:۳۰ است.
 * «روز» همیشه باید با وقت تهران تشخیص داده شود، نه UTC — وگرنه گزارشِ ساعت ۲۲ تهران
 * اشتباهاً به روز بعد می‌افتد.
 */

export const TEHRAN_OFFSET_MIN = 210; // +03:30

/** لحظه‌ی (UTC) متناظر با ۰۰:۰۰ همان روزِ تهران که `instant` در آن قرار دارد */
export function tehranDayStart(instant: Date = new Date()): Date {
  const shifted = instant.getTime() + TEHRAN_OFFSET_MIN * 60000;
  const flooredToDay = Math.floor(shifted / 86400000) * 86400000;
  return new Date(flooredToDay - TEHRAN_OFFSET_MIN * 60000);
}

/** شروع روزِ تهران به فاصله‌ی `daysAgo` روز قبل از امروز */
export function tehranDayStartDaysAgo(daysAgo: number, instant: Date = new Date()): Date {
  return new Date(tehranDayStart(instant).getTime() - daysAgo * 86400000);
}

/** اختلاف روزِ تقویمیِ تهران بین دو لحظه (تعداد روزهای کامل بین شروعِ روزها) */
export function tehranDayDiff(a: Date, b: Date): number {
  return Math.round((tehranDayStart(a).getTime() - tehranDayStart(b).getTime()) / 86400000);
}

/* ---------- تبدیل میلادی ↔ شمسی (الگوریتم استاندارد jalaali) ---------- */

function div(a: number, b: number): number {
  return Math.floor(a / b);
}

export interface Jalali {
  jy: number;
  jm: number;
  jd: number;
}

/** میلادی → شمسی */
export function toJalali(gy: number, gm: number, gd: number): Jalali {
  const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) +
    gd +
    gDaysInMonth.slice(0, gm - 1).reduce((a, b) => a + b, 0);
  let jy = -1595 + 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + div(days, 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + div(days - 186, 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];
const JALALI_WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

/** اجزای تاریخ/زمانِ تهران برای یک لحظه (سال/ماه/روز شمسی + ساعت/دقیقه + روز هفته) */
export function tehranParts(instant: Date = new Date()) {
  // اجزای تقویم میلادی به وقت تهران
  const t = new Date(instant.getTime() + TEHRAN_OFFSET_MIN * 60000);
  const gy = t.getUTCFullYear();
  const gm = t.getUTCMonth() + 1;
  const gd = t.getUTCDate();
  const hour = t.getUTCHours();
  const minute = t.getUTCMinutes();
  const weekday = JALALI_WEEKDAYS[t.getUTCDay()]; // getUTCDay: 0=یکشنبه
  const { jy, jm, jd } = toJalali(gy, gm, gd);
  return { jy, jm, jd, monthName: JALALI_MONTHS[jm - 1], weekday, hour, minute };
}

/** تاریخ شمسی کوتاه: «۱۴۰۳/۰۳/۲۷» (ارقام فارسی) */
export function formatJalaliShort(instant: Date = new Date()): string {
  const { jy, jm, jd } = tehranParts(instant);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${jy}/${pad(jm)}/${pad(jd)}`.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
}

/** تاریخ شمسی بلند: «۲۷ خرداد» یا «سه‌شنبه ۲۷ خرداد» */
export function formatJalaliLong(instant: Date = new Date(), withWeekday = false): string {
  const { jd, monthName, weekday } = tehranParts(instant);
  const day = jd.toString().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
  return `${withWeekday ? weekday + " " : ""}${day} ${monthName}`;
}
