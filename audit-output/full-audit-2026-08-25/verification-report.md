# گزارش نهایی اصلاح و اعتبارسنجی G-camp

تاریخ: 2026-08-25
دامنه: محصول، UX موبایل، حلقهٔ مطالعه و اقتصاد، مشاهده‌پذیری، حریم خصوصی و آمادگی محلی برای ۵۰۰ کاربر هم‌زمان

## نتیجه مدیریتی

ریسک‌های بحرانی ممیزی اولیه در کد رفع شده‌اند: تایمر و پرداخت‌ها اتمیک و idempotent هستند، session فعال از سرور بازیابی می‌شود، اقتصاد در درخواست‌های هم‌زمان منفی یا دوباره‌پرداخت نمی‌شود، realtime بین replicaها روی Redis کار می‌کند و رفتار/خطاهای مهم قابل ردیابی‌اند. build نهایی production و همهٔ تست‌های دامنه و concurrency پاس شده‌اند. آزمون جامع بار نیز ۵۰۰ کاربر هم‌زمان را در ۱۰ فاز read/write/SSR/SSE و مجموع ۵۰۰۰ عملیات HTTP بدون خطا پوشش داد.

دو مرز مهم باقی است:

1. نتیجهٔ ۵۰۰ کاربر، تأیید محلی production-build است؛ تأیید ظرفیت VPS production نیازمند soak تست staging با منابع، حجم داده و ترکیب write/cron واقعی است.
2. در دیتابیس توسعه ۸ session تاریخی باز وجود دارد. job اصلاح و تست شده، اما اجرای آن روی این رکوردهای متعلق به محیط کاربر بدون تأیید صریح انجام نشده است. پیش‌نمایش authoritative نشان می‌دهد مجموع پاداش نهایی این سشن‌ها ۲۴ XP و ۲۴ سکه است؛ ۳ واحد قبلاً با tick پرداخت شده و اجرای maintenance دقیقاً ۲۱ XP و ۲۱ سکهٔ باقی‌مانده را میان ۸ کاربر توسعه اضافه می‌کند.

## وضعیت اصلاح‌ها

| حوزه | وضعیت نهایی | تغییر کلیدی | شاهد |
|---|---|---|---|
| شروع/tick/end تایمر | رفع‌شده | قفل تراکنشی کاربر، unique session باز، request idempotency، پرداخت مابه‌التفاوت | `test:study-concurrency` |
| بازیابی و خطای شبکه تایمر | رفع‌شده | endpoint وضعیت فعال، reconciliation، retry پایان و rollback pause/resume | مرور فلو dashboard + `test:timer` |
| سشن رهاشده | رفع‌شده در کد | تسویه running پس از سقف و paused پس از ۲۴ ساعت؛ pause جزو مطالعه نیست | `test:stale-sessions` با ۲۰ اجرای هم‌زمان برای هر حالت |
| اقتصاد و پاداش | رفع‌شده | debit/claim شرطی، idempotency برای mission/video/tournament/reaction/unlock/freeze | `test:economy-concurrency`, `test:gamification` |
| onboarding | رفع‌شده | مسیر یک‌روزه از یک منبع حقیقت، مرز روز تهران | `test:onboarding` |
| ویدیو | رفع‌شده | HLS cleanup، throttle، پیشرفت server-verified، خطای قابل‌اقدام | فلو ۸ |
| Web Push | رفع‌شده در کد | support/VAPID/permission/response checks و state خطا | نیازمند VAPID production برای تست واقعی |
| رفتار کاربر | پوشش عملیاتی | taxonomy صریح، PostHog، رویداد سرور durable در outbox و retry | `OBSERVABILITY.md` |
| خطاها | پوشش عملیاتی | Sentry کلاینت/سرور، caught-error helper، JSON log و source map CI | `OBSERVABILITY.md` |
| OTP/اعلان | پوشش عملیاتی | AuthAttempt هش‌شده؛ NotificationLog با status/error/latency | migrationها و job retention |
| Realtime و چند replica | رفع‌شده | Redis Pub/Sub، replay کوتاه، event ID و connection metrics | ۵۰۰ SSE |
| Cron | رفع‌شده | distributed lock، اجرای محدودشده و health/invariant jobs | تست ۱۰۰ lock هم‌زمان + `lib/jobs.ts` |
| حریم خصوصی/ایمنی | اضافه‌شده | visibility، export/delete، block/report و audit ادمین | فلوهای ۵ و ۶ |
| دسترس‌پذیری بصری | بهبود‌یافته | متن کاربردی بزرگ‌تر، contrast، focus/modal و reduced motion | مرور تصویری؛ screen reader واقعی هنوز لازم است |
| تم و رنگ | رفع‌شده | رنگ‌های component/admin به semantic token و status token مشترک منتقل شد؛ legacy theme حفظ شد | `final-09-semantic-dashboard.png`, `final-10-semantic-admin.png` |

## نتیجهٔ آزمون ۵۰۰ کاربر هم‌زمان

محیط: build نهایی Next.js روی ماشین محلی، PostgreSQL و Redis محلی.

| سنجه | نتیجه |
|---|---:|
| کاربران احراز هویت‌شده | ۵۰۰ |
| خطای endpoint بازیابی تایمر | ۰ |
| عملیات HTTP در کل سناریو | ۵۰۰۰ |
| الگوی هم‌زمانی | ۵۰۰ درخواست هم‌زمان در هر فاز |
| خطا در تمام فازها | ۰ |
| active read، p95 | ۶۶۱ ms |
| start، p95 | ۱۰۳۵ ms |
| pause / resume، p95 | ۵۳۹ / ۵۳۰ ms |
| end، p95 | ۱۷۵۶ ms |
| dashboard SSR، p95 | ۲۰۴۲ ms |
| duplicate start صحیح | ۵۰۰ از ۵۰۰؛ همان session |
| duplicate end صحیح | ۵۰۰ از ۵۰۰؛ بدون پرداخت مجدد |
| اتصال SSE موفق | ۵۰۰ از ۵۰۰ |
| دریافت broadcast | ۵۰۰ از ۵۰۰ |
| زمان اتصال همهٔ SSEها | ۳۵۱ ms |
| health دیتابیس/Redis | ok / ok |
| داده باقی‌مانده از تست | ۰ row، ۰ cache key، ۰ replay event |

حالت تست، ۱۰۰۰ رویداد start/end را واقعاً در outbox نوشت اما با status برابر
`suppressed` مانع ارسال دادهٔ آزمایشی به PostHog شد؛ همهٔ این رکوردها نیز در
پاک‌سازی حذف شدند. لاگ سرور در اجرای نهایی هیچ error نداشت.

این تست علاوه بر مسیر بحرانی تایمر، رندر کامل dashboard را نیز پوشش می‌دهد. نتیجه ثابت می‌کند build محلی در burstهای ۵۰۰کاربره از نظر صحت و پایداری پاسخ می‌دهد؛ اما سخت‌افزار production را بازسازی نمی‌کند. معیار انتشار همچنان یک soak حداقل ۳۰دقیقه‌ای روی staging مشابه production با read/write، tick/end، reconnect و cron هم‌زمان است.

علاوه بر بار تک‌process، دو instance واقعی production build روی پورت‌های ۳۰۰۰ و
۳۰۰۱ به Redis مشترک متصل شدند. `timer_start` ساخته‌شده در instance دوم به SSE
کاربر متصل به instance اول رسید؛ بنابراین مسیر cross-replica فقط از روی کد
استنباط نشده و عملاً تست شده است.

## فلوهای UX بررسی‌شده

1. **ورود با موبایل و OTP — سالم.** ورودی شش‌رقمی، ارقام فارسی، نگه‌داری کد دعوت و خطای شبکه اصلاح شد. شاهد: `final-01-login.png`.
2. **تمرکز و تایمر — سالم.** تایمر مرکز صفحه است؛ شروع، توقف، ادامه، پایان و بازآشتی با سرور بررسی شد. شاهد: `final-02-dashboard.png`.
3. **بورد زنده — سالم.** ناوبری اصلی درست، pagination فعال و رویداد صفر دقیقه پس از load-more نیز نمایش داده نمی‌شود. شاهد: `final-03-feed.png`.
4. **جدول‌برتر — سالم با توضیح رتبه.** تفاوت رتبهٔ هفت‌روزه هم‌سطح و سایر تب‌ها روشن‌تر و motion کم شده است. شاهد: `final-04-leaderboard.png`.
5. **پروفایل و حریم خصوصی — سالم.** کنترل visibility، خروجی داده، حذف حساب و مسیر گزارش/مسدودسازی اضافه شده است. شاهد: `final-05-profile-privacy.png`.
6. **رسیدگی ادمین به گزارش‌ها — سالم.** صف گزارش و ثبت audit برای mutationهای ادمین وجود دارد. شاهد: `final-06-admin-reports.png`.
7. **فهرست ویدیو — سالم.** دسترسی رایگان/خریدی و متن موجودی قابل‌فهم است. شاهد: `final-07-videos.png`.
8. **جزئیات ویدیوی بدون منبع — سالم با fallback.** به‌جای player شکسته، پیام فارسی و مسیر بازگشت نمایش داده می‌شود و failure ثبت می‌شود. شاهد: `final-08-video-detail.png`.
9. **داشبورد پس از semantic-token migration — سالم.** سلسله‌مراتب تایمر، کنتراست، کارت فید و ناوبری موبایل بدون شکست بصری باقی ماند. شاهد: `final-09-semantic-dashboard.png`.
10. **پنل ادمین پس از semantic-token migration — سالم.** کارت‌ها، قیف، header و رنگ وضعیت‌ها از توکن مشترک استفاده می‌کنند و در viewport موبایل قابل پیمایش‌اند. شاهد: `final-10-semantic-admin.png`.

## رفتار و خطا دقیقاً چه چیزی ذخیره می‌شود؟

- رفتار محصول: ورود، onboarding، شروع/پایان مطالعه، شکست sync، مأموریت، ویدیو، leaderboard، reaction و Push. رویدادهای معتبر مطالعه سمت سرور ساخته و ابتدا در `ProductEventOutbox` ذخیره می‌شوند.
- خطا: exceptionهای uncaught و caught مهم کلاینت/سرور در Sentry؛ رخدادهای عملیاتی به‌شکل JSON با operation و request ID در Docker logs.
- ورود: تلاش‌های OTP با hash هویت، نتیجه، کد خطای غیرحساس، latency و request ID در `AuthAttempt`؛ شماره و OTP خام ذخیره نمی‌شود.
- اعلان: هر تلاش با status، provider error code، latency و retry در `NotificationLog`.
- حریم خصوصی: autocapture، session recording و heatmap خاموش‌اند؛ Cookie، query string، OTP، JWT، شماره و نام به ابزارهای خارجی ارسال نمی‌شوند.
- نگه‌داری: OTP attempt برابر ۹۰ روز، notification log برابر ۱۸۰ روز، activity/inbox برابر ۳۶۵ روز و audit ادمین برابر ۷۳۰ روز.

## اعتبارسنجی نهایی

| کنترل | نتیجه |
|---|---|
| `git diff --check` | پاس |
| `npm run lint` | پاس |
| `npx tsc --noEmit` | پاس |
| `npm run build` | پاس؛ ۴۳ صفحه static تولید شد و همه routeها compile شدند |
| `npm run test:levels` | ۲۰/۲۰ پاس |
| `npm run test:timer` | پاس |
| `npm run test:auth` | پاس |
| `npm run test:onboarding` | پاس |
| `npm run test:mission-rooms` | پاس |
| `npm run test:gamification` | پاس و داده موقت پاک شد |
| `npm run test:study-concurrency` | پاس |
| `npm run test:economy-concurrency` | پاس |
| `npm run test:stale-sessions` | پاس؛ running و paused هرکدام زیر ۲۰ اجرای موازی فقط یک بار تسویه شدند |
| `npm run test:distributed-lock` | پاس؛ از ۱۰۰ تلاش هم‌زمان فقط یک اجرا و سپس reacquire موفق |
| `npm run test:sse-replicas` | پاس؛ ارسال رویداد میان دو process مستقل از طریق Redis |
| `npm run maintenance:stale-sessions` | پیش‌نمایش read-only: ۸ سشن، ۳۶۰ دقیقه، پاداش کل ۲۴/۲۴ و ماندهٔ پرداخت ۲۱/۲۱ |
| `npx prisma migrate status` | ۳۰ migration؛ schema به‌روز |
| `npm run test:invariants` | ۳ invariant سالم؛ فقط ۸ session تاریخی توسعه باز است |

## محدودیت‌های شاهد

- از screenshot نمی‌توان انطباق کامل WCAG یا کیفیت VoiceOver/TalkBack را نتیجه گرفت؛ keyboard، screen reader و zoom باید روی دستگاه واقعی اجرا شوند.
- مسیر واقعی Kavenegar، Web Push با VAPID production، Telegram از relay خارج ایران و alert ایمیلی production نیازمند secret/زیرساخت واقعی‌اند.
- penetration test و تست بازیابی backup/restore خارج از دامنهٔ این اجرای محلی بوده‌اند.
- کد اصلاح‌شده هنوز در این گزارش deploy نشده است؛ rollout باید طبق `DEPLOYMENT.md` انجام شود.
