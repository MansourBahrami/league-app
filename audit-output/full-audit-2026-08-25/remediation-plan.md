# پلن اصلاح مرحله‌ای G-camp

تاریخ تدوین: 2026-08-25
مبنای برنامه: ممیزی محصول، کد، مشاهده‌پذیری و تست بار ۵۰۰ کاربر

## هدف

هدف این برنامه رساندن G-camp به وضعیتی است که:

1. XP، سکه، مدال و وضعیت جلسات تحت درخواست‌های هم‌زمان خراب نشوند.
2. تایمر در قطع اینترنت یا بسته‌شدن اپ قابل بازیابی باشد.
3. تعریف onboarding و آمار محصول در همه‌جا یکسان باشد.
4. خطاها و رفتارهای مهم محصول قابل مشاهده و تحلیل باشند.
5. ظرفیت ۵۰۰ کاربر فعال در staging مشابه production اندازه‌گیری و تأیید شود.

## قواعد اجرای برنامه

- مراحل به ترتیب اجرا می‌شوند؛ کار مقیاس و UX قبل از رفع خطرهای داده شروع نمی‌شود.
- هر مرحله یک PR مستقل، migration مستقل در صورت نیاز، تست و rollback plan دارد.
- هیچ تغییر پاداشی بدون تست concurrency و invariant وارد production نمی‌شود.
- اعداد XP، سکه و قوانین مأموریت فقط از `lib/gamification.ts` خوانده می‌شوند.
- تست‌های write-heavy فقط روی دیتابیس development/staging اجرا می‌شوند.
- پس از هر مرحله، معیار خروج همان مرحله بررسی می‌شود؛ تا پاس نشود مرحله بعد شروع نمی‌شود.

## نقشه راه خلاصه

| مرحله | عنوان | اولویت | برآورد اولیه | خروجی اصلی |
|---|---|---:|---:|---|
| ۰ | خط مبنا و شبکه ایمنی | P0 | ۰٫۵–۱ روز | تست concurrency و snapshot وضعیت فعلی |
| ۱ | اتمیک‌کردن حلقه تایمر | P0 | ۲–۳ روز | جلوگیری از session و پاداش تکراری |
| ۲ | بازیابی تایمر و خطاهای شبکه | P0 | ۲–۳ روز | reconciliation، retry و UI خطای قابل‌اعتماد |
| ۳ | ایمن‌سازی اقتصاد و پاداش‌ها | P0 | ۳–۴ روز | مأموریت، ویدیو، تورنمنت، خرید و reaction اتمیک |
| ۴ | یکسان‌سازی onboarding و آمار | P0 | ۱–۲ روز | یک منبع حقیقت برای onboarding و funnelها |
| ۵ | اصلاح ویدیو و Push | P1 | ۲–۳ روز | progress کنترل‌شده، fallback رسانه و subscription معتبر |
| ۶ | مشاهده‌پذیری و تحلیل محصول | P1 | ۳–۴ روز | event taxonomy، structured logs و ثبت failure |
| ۷ | آماده‌سازی معماری برای ۵۰۰ کاربر | P1 | ۳–۵ روز | realtime مشترک، job lock/queue و query optimization |
| ۸ | UX، دسترس‌پذیری و حریم خصوصی | P2 | ۳–۵ روز | رفع موانع اصلی تجربه و privacy |
| ۹ | تست نهایی، rollout و پایش | Release gate | ۲–۳ روز | تأیید staging و انتشار مرحله‌ای |

برآورد کل اولیه: حدود ۲۰ تا ۳۰ روز مهندسی، بدون احتساب تصمیم‌ها و پیاده‌سازی کامل سیاست‌های حقوقی حریم خصوصی.

## وضعیت اجرا در 2026-08-25

| مرحله | وضعیت | شاهد خروج |
|---|---|---|
| ۰ تا ۳ | تکمیل | تست‌های ۱۰۰درخواستی study/economy و تست ۲۰اجرایی تسویه سشن رهاشده پاس؛ constraint و idempotency در DB |
| ۴ | تکمیل | onboarding یک‌روزه از منبع حقیقت مشترک و تست دامنه پاس |
| ۵ | تکمیل در کد | پخش HLS، anti-seek، fallback و Push اصلاح شده؛ VAPID production هنوز یک کار استقرار است |
| ۶ | تکمیل در کد | PostHog outbox، Sentry، AuthAttempt، NotificationLog، request ID و retention اضافه شد |
| ۷ | تکمیل برای آزمون محلی | Redis Pub/Sub/replay، تست واقعی دو process، تست ۱۰۰ lock هم‌زمان، healthcheck و آزمون جامع ۵۰۰ کاربر در ۱۰ فاز و ۵۰۰۰ عملیات HTTP بدون خطا؛ soak روی staging مشابه production همچنان release gate است |
| ۸ | تکمیل در کد و مرورگر | مسیرهای اصلی mobile بازبینی، privacy/export/delete/block/report و صف گزارش ادمین اضافه شد؛ رنگ‌های hard-coded به semantic/status token منتقل و dashboard/admin دوباره تصویری بررسی شد؛ آزمون screen reader روی دستگاه واقعی باقی است |
| ۹ | در انتظار استقرار | lint، TypeScript، build و تست‌های دامنه سبز؛ ۸ سشن تاریخی دیتابیس توسعه بدون مجوز تغییر دست‌نخورده مانده‌اند |

جزئیات شواهد، نتیجهٔ تست بار و محدودیت‌های انتشار در `verification-report.md` ثبت شده است.

---

## مرحله ۰ — خط مبنا و شبکه ایمنی

### کارها

- ثبت snapshot دیتابیس توسعه: تعداد user، session باز، balance منفی، mission فعال و rewardهای فعلی.
- اضافه‌کردن تست‌های concurrency بازتولیدکننده برای:
  - دو `end` هم‌زمان؛
  - `tick` و `end` هم‌زمان؛
  - دو `start` هم‌زمان؛
  - تکمیل هم‌زمان mission/video/tournament؛
  - دو خرید هم‌زمان با موجودی مرزی.
- ثبت invariantهای اصلی در تست‌ها:
  - حداکثر یک session باز برای هر کاربر؛
  - هر ۱۵ دقیقه دقیقاً ۱ XP و ۱ سکه؛
  - یک reward فقط یک بار؛
  - موجودی سکه هرگز منفی نشود.
- ذخیره نتیجه تست بار فعلی به‌عنوان baseline.

### معیار خروج

- تست‌ها در نسخه فعلی حداقل raceهای شناخته‌شده را بازتولید کنند.
- هیچ داده production تغییر نکند.
- `lint` و `build` همچنان سبز باشند.

---

## مرحله ۱ — اتمیک‌کردن حلقه تایمر

### ۱.۱ جلوگیری از دو session باز

- افزودن invariant دیتابیسی برای فقط یک `StudySession` با `endTime IS NULL` برای هر کاربر؛ در PostgreSQL به‌صورت partial unique index در migration.
- تبدیل start به transaction که session قبلی را می‌بندد و session جدید را ایجاد می‌کند.
- در conflict، پاسخ idempotent یا 409 کنترل‌شده برگردد.

### ۱.۲ اتمیک‌کردن tick

- lock کردن ردیف session داخل transaction یا استفاده از claim شرطی مطمئن.
- افزایش `tickCount` و افزایش XP/سکه در همان transaction.
- درخواست تکراری یا موازی باید `granted: 0` بگیرد، نه خطای 500.

### ۱.۳ اتمیک‌کردن end

- خواندن/محاسبه/بستن session و پرداخت مانده reward در یک transaction.
- شرط بستن فقط روی session باز؛ درخواست دوم باید `alreadyEnded` بگیرد.
- race بین tick/end با row lock یا ترتیب serialization حذف شود.
- ActivityLog، onboarding progress و triggerهای پس از commit از داده نهایی واحد استفاده کنند.
- session صفر دقیقه‌ای وارد feed عمومی نشود.

### معیار خروج

- حداقل ۱۰۰ بار اجرای موازی تست end/tick/start بدون duplicate reward یا session باز تکراری.
- مجموع reward دقیقاً با `calcRewards(verifiedMinutes)` برابر باشد.
- rollback در خطای میانی هیچ balance یا tickCount نیمه‌کاره باقی نگذارد.
- تست‌های levels، timer، onboarding و gamification پاس باشند.

---

## مرحله ۲ — بازیابی تایمر و خطاهای شبکه

### کارها

- افزودن endpoint یا استفاده از endpoint موجود برای دریافت session فعال و وضعیت authoritative سرور.
- reconciliation هنگام mount، بازگشت از background و reconnect شبکه.
- بررسی `response.ok` و تفکیک 409، 401، 5xx و network error.
- نگه‌داشتن پایان ناموفق در retry queue محلی تا تأیید سرور؛ پاک‌نکردن localStorage قبل از موفقیت.
- rollback کردن pause/resume optimistic در failure یا نمایش حالت «در حال همگام‌سازی».
- جلوگیری از اجرای تایمر local قدیمی پس از بسته‌شدن session در tab دیگر.
- اضافه‌کردن پیام فارسی قابل اقدام: تلاش مجدد، وضعیت ذخیره‌شدن و زمان آخرین sync.

### معیار خروج

- سناریوهای قطع اینترنت در start، pause، resume، tick و end تست شوند.
- پس از reconnect، UI و سرور به یک session و یک زمان تأییدشده برسند.
- هیچ پایان ناموفقی بدون اطلاع کاربر حذف نشود.
- بستن و بازکردن PWA باعث از دست‌رفتن session معتبر نشود.

---

## مرحله ۳ — ایمن‌سازی اقتصاد و پاداش‌ها

### ۳.۱ مأموریت و مدال

- claim اتمیک `active → completed`؛ پرداخت فقط در صورت موفق‌شدن claim.
- مدال و ActivityLog در همان جریان idempotent با کلید یکتا.
- constraint برای جلوگیری از دو مأموریت فعال هم‌نوع در یک بازه.

### ۳.۲ ویدیو

- claim اتمیک `rewardGiven=false → true` همراه با افزایش سکه.
- `totalSeconds` از دیتابیس خوانده شود، نه از request.
- progress فقط monotonic باشد و افزایش غیرممکن نسبت به زمان واقعی رد یا محدود شود.

### ۳.۳ تورنمنت، reaction و streak

- claim اتمیک tournament قبل از پرداخت و distributed lock برای settlement.
- unique key روزانه برای reward مربوط به reaction.
- جلوگیری از افزایش دوباره streak و milestone در پایان‌های هم‌زمان.

### ۳.۴ خریدها

- debit مشروط اتمیک `coins >= cost` و ساخت purchase در یک transaction.
- unique constraint مناسب برای خرید و unlock.
- همه conflictها پاسخ idempotent و فارسی قابل‌فهم بدهند.

### معیار خروج

- ۱۰۰ درخواست موازی برای هر reward فقط یک پرداخت ایجاد کند.
- هیچ سناریویی balance منفی نسازد.
- ledger آزمایشی قبل/بعد تمام تراکنش‌ها قابل تطبیق باشد.

---

## مرحله ۴ — یکسان‌سازی onboarding و آمار محصول

### تصمیم محصول موردنیاز

ابتدا یک تصمیم رسمی ثبت شود: onboarding فعال یک‌روزه باقی می‌ماند یا به مسیر چندروزه برمی‌گردد. تا زمان تصمیم، منطق فعلی یک‌روزه مبنای اصلاح در نظر گرفته می‌شود.

### کارها

- حذف اعداد hard-coded مانند ۳ و ۶ از admin، leads و notification segments.
- استفاده از helper/constant مشترک onboarding در کل سیستم.
- تعریف دوباره «week 2»، «lead hot» و funnel بر اساس روز تقویمی/تاریخ ثبت‌نام، نه عدد onboarding غیرقابل‌دستیابی.
- اصلاح مستندات PROJECT/ROADMAP و تست‌ها مطابق رفتار نهایی.
- ایجاد migration یا backfill فقط اگر معنی داده تاریخی تغییر می‌کند.

### معیار خروج

- یک cohort آزمایشی از ثبت‌نام تا پایان onboarding در UI، admin و analytics عدد یکسان نشان دهد.
- segment اعلان، لید داغ و funnel با داده seed قابل تست باشند.
- هیچ عدد مستقل ۳/۶ برای طول onboarding خارج از منبع حقیقت باقی نماند.

---

## مرحله ۵ — اصلاح ویدیو و Push

### ویدیو

- نگه‌داشتن `lastSave` در `useRef` و حذف بازنصب listener با هر timeupdate.
- cleanup واقعی HLS و ثبت media error.
- نمایش retry، پیام خرابی و fallback به CTA پشتیبانی/بارگذاری مجدد.
- همسان‌کردن unlock UI و API بر اساس تعریف نهایی onboarding.

### Push

- بررسی support و VAPID قبل از درخواست permission.
- بررسی `response.ok` هنگام ذخیره subscription.
- نمایش stateهای denied، unsupported، failed و enabled به‌صورت جدا.
- ثبت event بدون PII برای permission و subscription result.

### معیار خروج

- حداکثر یک درخواست progress در بازه تعریف‌شده.
- HLS پس از unmount resource باز باقی نگذارد.
- UI فقط پس از ذخیره موفق subscription وضعیت «فعال» نشان دهد.

---

## مرحله ۶ — مشاهده‌پذیری و تحلیل محصول

### ۶.۱ taxonomy رفتار کاربر

حداقل eventهای زیر با schema و نسخه مشخص ثبت شوند:

- `otp_requested`, `otp_failed`, `signed_in`
- `onboarding_started`, `onboarding_step_completed`, `lead_completed`
- `study_start_failed`, `study_paused`, `study_resumed`, `study_sync_failed`, `study_completed`
- `mission_viewed`, `mission_joined`, `mission_completed`, `mission_failed`
- `video_opened`, `video_progress_failed`, `video_completed`, `video_purchase_result`
- `leaderboard_viewed`, `reaction_sent`, `push_permission_result`

### ۶.۲ خطا و عملیات

- helper واحد برای capture کردن خطاهای caught در Sentry با context امن.
- structured JSON logs با request ID و correlation ID.
- ثبت NotificationAttempt برای success/failure، provider code، latency و retry بدون متن حساس.
- فعال‌کردن source map production با secret امن CI.
- metric و alert برای:
  - duplicate reward attempt؛
  - negative balance؛
  - session باز قدیمی؛
  - OTP error rate؛
  - cron duration/failure؛
  - DB pool saturation؛
  - SSE connection count.

### معیار خروج

- funnel اصلی از OTP تا اولین reward در dashboard تحلیلی قابل مشاهده باشد.
- یک خطای تستی client، server، cron و provider با correlation ID پیدا شود.
- failure اعلان در دیتابیس و Sentry/metrics قابل ردیابی باشد.

---

## مرحله ۷ — آماده‌سازی معماری برای ۵۰۰ کاربر

### کارها

- انتقال broadcast رویدادها از حافظه process به Redis Pub/Sub یا Streams.
- افزودن event ID و strategy برای reconnect/replay SSE.
- distributed lock برای cron و settlement؛ سپس انتقال jobهای سنگین به worker/queue در صورت نیاز اندازه‌گیری‌شده.
- healthcheck واقعی app و readiness check دیتابیس/Redis.
- بررسی و بهینه‌سازی queryهای dashboard، layout، leaderboard و focus.
- حذف خواندن تکراری user در session/layout و محدودکردن payload `/api/focus/active`.
- تعیین DB pool بر اساس تعداد replica و ظرفیت PostgreSQL؛ نه افزایش حدس‌محور.
- افزودن image tag نسخه‌دار، rollback procedure و backup/restore drill.

### معیار خروج

- event از replica A به کاربر متصل به replica B برسد.
- اجرای هم‌زمان cron روی دو instance فقط یک بار اثر بگذارد.
- restart یک instance session و reward را خراب نکند.
- healthcheck و rollback روی staging عملاً آزمایش شوند.

---

## مرحله ۸ — UX، دسترس‌پذیری و حریم خصوصی

### UX و Accessibility

- افزایش متن‌های کاربردی ۱۰–۱۲px و اصلاح contrast رنگ outline.
- کاهش opacity/rotation leaderboard، به‌خصوص در reduced motion.
- حذف false affordance چیپ‌های XP/سکه یا تبدیل آن‌ها به action واقعی.
- نمایش ارقام فارسی در زمان نسبی و پیام OTP.
- توضیح تفاوت «رتبه کلی» و رتبه هفت‌روزه هم‌سطح.
- حذف رویدادهای صفر دقیقه‌ای از feed و بهبود empty/error stateها.
- تست keyboard، VoiceOver/TalkBack و zoom روی دستگاه واقعی.

### Privacy

- تصمیم محصول برای visibility پروفایل و فعالیت مطالعه.
- report/block و moderation flow.
- account deletion و data export.
- audit log برای CSV export و عملیات حساس admin.
- retention policy برای ActivityLog، notification و analytics.

### معیار خروج

- متن معمولی حداقل contrast AA و اندازه قابل‌خواندن داشته باشد.
- فلوهای اصلی با keyboard و screen reader قابل انجام باشند.
- کاربر بتواند visibility و چرخه عمر داده خود را مدیریت کند.

---

## مرحله ۹ — تست نهایی و انتشار

### ماتریس تست staging

- seed واقع‌گرایانه: حداقل ۵۰۰ کاربر، ده‌ها هزار session و activity.
- ۵۰۰ کاربر ترکیبی با نسبت واقعی:
  - dashboard/leaderboard/profile؛
  - session start/tick/pause/resume/end؛
  - SSE؛
  - video progress؛
  - cron و notification هم‌زمان.
- تست network loss، reconnect storm، restart instance و failover Redis/Postgres.
- بررسی p50/p95/p99، error rate، DB connections، CPU/RAM و duplicate invariantها.

### آستانه پیشنهادی انتشار

- خطای غیرمنتظره کمتر از ۱٪؛ برای پرداخت و session برابر صفر.
- p95 مسیرهای خواندنی کلیدی کمتر از ۱ ثانیه و APIهای تعاملی کمتر از ۵۰۰ms در بار هدف، مگر مسیرهای گزارش‌گیری سنگین.
- صفر duplicate reward، صفر balance منفی و صفر session باز تکراری.
- عدم از‌دست‌رفتن eventهای حیاتی در restart/reconnect آزمایشی.
- dashboardهای خطا و alertها قبل از rollout فعال باشند.

### rollout

- backup و migration dry-run.
- انتشار canary برای درصد محدود کاربران.
- پایش حداقل ۲۴ ساعت روی timer errors، reward invariants، OTP و latency.
- افزایش تدریجی ترافیک با امکان rollback سریع.

## ترتیب پیشنهادی شروع کار

اولین واحد اجرایی باید «مرحله ۰ + مرحله ۱.۱» باشد: ابتدا تست race ساخته می‌شود، سپس invariant یک session باز و migration آن پیاده می‌شود. بعد به‌ترتیب tick و end اتمیک می‌شوند. این ترتیب سریع‌ترین کاهش ریسک برای حلقه اصلی محصول است.

## Definition of Done مشترک

هر مرحله فقط وقتی تمام است که:

- کد و migration review شده باشند؛
- lint، build و تست‌های مرتبط پاس باشند؛
- تست failure و concurrency وجود داشته باشد؛
- rollback plan ثبت شده باشد؛
- مستندات مرتبط به‌روز شده باشند؛
- هیچ secret یا PII جدیدی وارد log/analytics نشده باشد.
