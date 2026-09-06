# بررسی جامع محصول G-camp

**تاریخ بررسی:** ۱۴۰۵/۰۶/۰۳ (2026-08-25)
**نسخه:** Next.js 16.2.9 · React 19 · Prisma 7 · Tailwind CSS 4

---

## خلاصه اجرایی

این سند نتیجه بررسی عمیق و چندبُعدی اپلیکیشن G-camp است. بررسی در ۴ محور اصلی
انجام شد و نتایج هر بخش در فایل مجزا قرار دارد:

| # | بخش | فایل | وضعیت کلی |
|---|------|-------|-----------|
| 1 | [تجربه کاربری (UX)](./01-ux-review.md) | `01-ux-review.md` | ⚠️ نیاز به رفع ۳ باگ بحرانی |
| 2 | [مقیاس‌پذیری (۵۰۰ کاربر)](./02-scalability-review.md) | `02-scalability-review.md` | 🔴 آماده نیست |
| 3 | [خطاها، لاگ و رفتار کاربر](./03-error-logging-review.md) | `03-error-logging-review.md` | ⚠️ ناقص |
| 4 | [امنیت](./04-security-review.md) | `04-security-review.md` | ⚠️ ۲ آسیب‌پذیری |

---

## ۱۰ مشکل بحرانی (اولویت فوری)

### 🔴 بحرانی — باید قبل از مقیاس رفع شوند

| # | بخش | مشکل | فایل |
|---|------|-------|------|
| 1 | مقیاس | Connection Pool فقط ۱۰ اتصال — برای ۵۰۰ کاربر کافی نیست | `lib/db.ts` |
| 2 | مقیاس | Race condition در `/api/study/end` — امکان دوبل‌پاداش XP/سکه | `app/api/study/end/route.ts` |
| 3 | مقیاس | کوئری لیدربورد با آرایه `IN` هزاران آیدی — کرش در مقیاس بالا | `app/(app)/leaderboard/page.tsx` |
| 4 | مقیاس | Cron job مأموریت‌ها sequential — ساعت‌ها طول می‌کشد با ۵۰K کاربر | `lib/jobs.ts` |
| 5 | امنیت | آپلود آواتار بدون بررسی magic bytes — ریسک Stored XSS | `app/api/profile/avatar/route.ts` |

### 🟡 مهم — باید در اسپرینت بعدی رفع شوند

| # | بخش | مشکل | فایل |
|---|------|-------|------|
| 6 | UX | تایمر: شکست شبکه هنگام Stop — سشن در localStorage گیر می‌کند | `components/dashboard/StudyTimer.tsx` |
| 7 | UX | تایمر: اگر مرورگر بسته و بعد از انقضا باز شود، XP از دست می‌رود | `lib/study-timer-storage.ts` |
| 8 | مقیاس | ایندکس `nextStudyTarget` روی جدول User وجود ندارد | `prisma/schema.prisma` |
| 9 | مقیاس | Rate limiting روی endpointهای study وجود ندارد | `app/api/study/start/route.ts` |
| 10 | امنیت | هدرهای امنیتی (CSP, X-Frame-Options) تنظیم نشده | `next.config.ts` |

---

## نتیجه‌گیری

**آیا اپ با ۵۰۰ کاربر همزمان کار می‌کند؟**

> 🔴 **خیر.** با تنظیمات فعلی، Connection Pool (۱۰ اتصال)، کوئری‌های سنگین لیدربورد،
> و race condition در پاداش‌دهی، اپ قبل از رسیدن به ۵۰۰ کاربر دچار مشکل خواهد شد.

**آیا رفتار کاربر و خطاها ذخیره می‌شود؟**

> ⚠️ **تا حدی.** PostHog برای analytics فعال است و Sentry برای error tracking وصل شده.
> جدول `ActivityLog` برای لاگ فعالیت‌ها و `NotificationLog` برای اطلاع‌رسانی موجود است.
> اما: لاگ ناموفق ورود ذخیره نمی‌شود، health check endpoint وجود ندارد، و خطاهای
> handle-شده کلاینت به Sentry ارسال نمی‌شوند.

---

برای جزئیات هر بخش، فایل‌های مربوطه را مطالعه کنید.
