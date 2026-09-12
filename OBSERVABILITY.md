# راهنمای پایش رفتار کاربران و خطاها

این سند مرجع عملیاتی G-camp برای تحلیل رفتار کاربران، دریافت خطاها و بررسی
لاگ‌های production است. برای معماری استقرار به [DEPLOYMENT.md](DEPLOYMENT.md)
و برای نقشهٔ کد به [FILES.md](FILES.md) مراجعه کنید.

## وضعیت فعلی

| نیاز | ابزار | وضعیت |
|------|-------|-------|
| رفتار و قیف محصول | PostHog Cloud | فعال و تست‌شده |
| خطاهای مرورگر و سرور | Sentry | فعال و تست‌شده |
| لاگ اپ، PostgreSQL و Redis | Docker logs | فعال با چرخش خودکار |
| Session Replay و Heatmap | — | عمداً غیرفعال |
| آپلود Source Map به Sentry | Sentry Build Plugin | در CI از BuildKit secret؛ نیازمند `SENTRY_AUTH_TOKEN` |
| تلاش‌های OTP و نرخ شکست | PostgreSQL (`AuthAttempt`) | فعال، بدون شماره خام |
| تحویل رویداد سرور | PostgreSQL outbox + PostHog | فعال با retry در Cron |
| موفق/ناموفق اعلان | PostgreSQL (`NotificationLog`) | فعال با status، latency و error code |

هیچ‌کدام از مسیرهای اصلی بالا برای شروع به Grafana، Google Analytics یا Hotjar
نیاز ندارند. این ترکیب برای اندازه و تیم فعلی پروژه ساده‌تر است و هزینه و نگهداری
کمتری دارد.

## PostHog: رفتار کاربران

محیط PostHog با نام `G-camp` و منطقهٔ زمانی `Asia/Tehran` تنظیم شده است. دامنهٔ
مجاز production برابر `https://app.gcamp.ir` است و داشبورد
`G-camp — رفتار کاربران` برای آمار اولیه در دسترس است.

### رویدادهای ثبت‌شده

| رویداد | زمان ثبت | ویژگی‌ها |
|--------|----------|----------|
| `$pageview` | باز شدن صفحه و تغییر route | URL و اطلاعات عمومی صفحه |
| `$pageleave` | ترک صفحه | اطلاعات عمومی صفحه |
| `signed_in` | تأیید موفق OTP | بدون شماره موبایل |
| `signed_out` | خروج کاربر | بدون اطلاعات شخصی |
| `study_started` | ساخت موفق جلسه در سرور | `planned_minutes` |
| `study_completed` | پایان معتبر جلسه در سرور | `planned_minutes`, `verified_minutes`, `xp_earned`, `coins_earned`, `onboarding_day_completed` |
| `otp_requested`, `otp_failed` | درخواست/شکست ورود | مرحله و status، بدون شماره |
| `study_start_failed`, `study_paused`, `study_resumed`, `study_sync_failed` | بازیابی و کنترل تایمر | نوع عملیات و شناسه داخلی session |
| `onboarding_started`, `onboarding_step_completed`, `onboarding_completed`, `lead_completed` | قیف شروع کار | روز و دقیقه تأییدشده |
| `mission_viewed`, `mission_joined`, `mission_completed`, `mission_failed` | چرخه مأموریت | نوع و هدف مأموریت |
| `video_opened`, `video_playback_failed`, `video_progress_failed`, `video_completed`, `video_purchase_result` | چرخه ویدیو | شناسه و نتیجه، بدون عنوان/PII |
| `leaderboard_viewed`, `reaction_toggled`, `push_permission_result` | تعامل اجتماعی و Push | tab/action/result |
| `web_vital` | گزارش Core Web Vitals مرورگر | `metric`, `value`, `rating`, `pathname`, `network_type`, `display_mode` |
| `route_navigation` | اولین paint پس از کلیک روی لینک داخلی | `from_path`, `to_path`, `duration_ms`, `network_type`, `display_mode` |

رویدادهای اصلی مطالعه از route handlerهای سرور و پس از موفقیت عملیات ارسال
می‌شوند؛ بنابراین کلیک ناموفق یا دستکاری کلاینت به‌عنوان مطالعهٔ معتبر شمرده
نمی‌شود. برای جلوگیری از ثبت تکراری شروع/پایان یک جلسه نیز `$insert_id` پایدار
ارسال می‌شود.

### تنظیمات حریم خصوصی و هزینه

- Autocapture خاموش است؛ همهٔ کلیک‌ها و ورودی‌های فرم جمع‌آوری نمی‌شوند.
- Session Recording، Heatmap و Web Vitals autocapture خاموش‌اند.
- فقط شناسهٔ داخلی و غیرقابل‌نمایش کاربر برای اتصال رویدادهای یک حساب استفاده
  می‌شود؛ نام و شماره موبایل به PostHog فرستاده نمی‌شوند.
- رویدادهای کارایی فقط pathname را ثبت می‌کنند؛ query string، متن لینک و ورودی
  کاربر ارسال نمی‌شود.
- SDK مرورگر PostHog پس از فرصت idle بار می‌شود تا مسیر بحرانی ورود و hydration
  را مسدود نکند.
- بعد از خروج، هویت محلی PostHog reset می‌شود تا فعالیت کاربر بعدی با حساب قبلی
  ترکیب نشود.

### سؤال‌هایی که اکنون می‌توان پاسخ داد

- روزانه و هفتگی چند کاربر فعال داریم؟
- کاربران بیشتر کدام صفحات را می‌بینند؟
- چند ورود موفق، شروع مطالعه و پایان معتبر مطالعه داریم؟
- میانگین زمان برنامه‌ریزی‌شده و زمان تأییدشده چقدر است؟
- چه سهمی از جلسه‌های شروع‌شده به پایان معتبر می‌رسد؟
- چند کاربر بعد از روز یا هفتهٔ اول برمی‌گردند؟
- p75 و p95 تعویض هر route روی شبکه‌های مختلف چقدر است؟
- کدام device/network بیشترین INP، LCP یا navigation time نامطلوب را دارد؟

برای آمار کم‌حجم، بازهٔ حداقل ۷ تا ۱۴ روز معمولاً معنی‌دارتر از ساعت‌های اول
انتشار است. رویداد آزمایشی اتصال با نام `observability_connection_test` دادهٔ
محصول محسوب نمی‌شود.

## Sentry: خطا و باگ

Sentry خطاهای زیر را پوشش می‌دهد:

- exceptionهای کلاینت و تغییر route؛
- خطاهای render در App Router و error boundaryهای فارسی؛
- خطاهای route handler و Server Component از طریق `onRequestError`؛
- خطاهای Node.js و Edge runtime.

قانون پیش‌فرض ایمیل برای issueهای با اولویت بالا فعال است. عنوان ایمیل‌های این
پروژه با `[G-camp]` شروع می‌شود. issue آزمایشی
`G-camp observability connection test` دریافت واقعی داده را تأیید کرده است.

### اطلاعاتی که قبل از ارسال حذف می‌شوند

- Cookie و headerهای درخواست؛
- query string آدرس‌ها؛
- اطلاعات پیش‌فرض قابل‌شناسایی کاربر؛
- هر مشخصات کاربر به‌جز شناسهٔ داخلی.

`sendDefaultPii` خاموش است و Session Replay نیز نصب نشده است. هنگام افزودن
رویداد یا context جدید، شماره موبایل، OTP، JWT، نام، پیام خصوصی و مقدار env را
هرگز به Sentry ارسال نکنید.

### رسیدگی به یک خطا

1. از بخش **Issues** عنوان، محیط (`production`) و زمان آخرین رخداد را بررسی کنید.
2. تعداد کاربران و تعداد تکرار را ببینید و ابتدا خطاهای پرتکرار یا مسدودکنندهٔ
   تایمر/ورود را اولویت دهید.
3. stack trace و breadcrumbها را با Docker log همان بازه تطبیق دهید.
4. پس از اصلاح، build و مسیر مربوطه را تست کنید و issue را Resolve کنید.
5. اگر issue دوباره رخ دهد، Sentry آن را Regressed می‌کند و دوباره هشدار می‌دهد.

## Docker logs

Docker از driver محلی با چرخش خودکار استفاده می‌کند:

- اپ: حداکثر ۵ فایل ۱۰MB؛
- PostgreSQL: حداکثر ۳ فایل ۱۰MB؛
- Redis: حداکثر ۳ فایل ۱۰MB.

فرمان‌های روزمره روی سرور:

```bash
cd /app/league
docker compose logs --tail=200 app
docker compose logs -f app
docker compose logs --since=30m app
docker compose logs --tail=100 postgres redis
```

لاگ برنامه نباید شامل OTP، JWT، Cookie، کلید API یا شمارهٔ کامل موبایل باشد.
Docker logs برای جزئیات عملیاتی همان لحظه مناسب است؛ Sentry ابزار اصلی گروه‌بندی،
هشدار و پیگیری exceptionهاست.

## متغیرهای محیطی

### کلاینت؛ هنگام build

```env
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_SENTRY_DSN=https://...ingest.de.sentry.io/...
NEXT_PUBLIC_APP_ENV=production
```

PostHog project token و Sentry DSN کلید مدیریتی نیستند و به‌طور طبیعی داخل bundle
مرورگر دیده می‌شوند. مقادیر production فعلی به‌عنوان build argument در workflow
قرار گرفته‌اند.

### سرور؛ هنگام اجرا

```env
POSTHOG_PROJECT_TOKEN=phc_...
POSTHOG_HOST=https://us.i.posthog.com
SENTRY_DSN=https://...ingest.de.sentry.io/...
APP_ENV=production
```

این مقادیر در `.env.production` سرور توصیه می‌شوند. کد برای PostHog و Sentry از
مقادیر public زمان build نیز fallback دارد، اما env صریح سرور عیب‌یابی و تغییر
محیط را ساده‌تر می‌کند.

### Source Map در CI

```env
SENTRY_AUTH_TOKEN=sntrys_...
```

این توکن محرمانه فقط هنگام build برای آپلود Source Map استفاده می‌شود. Workflow آن
را از GitHub Actions secret به BuildKit secret می‌دهد؛ داخل build arg، repository
یا لایه‌های image قرار نمی‌گیرد. Workflow و Dockerfile نبودن یا خالی‌بودن secret
را خطای build می‌دانند تا image بدون stack trace قابل‌عیب‌یابی منتشر نشود.

## داده‌های عملیاتی و نگه‌داری

- رویدادهای سروری PostHog ابتدا در `ProductEventOutbox` ثبت و با `$insert_id` پایدار ارسال می‌شوند؛ Cron وظیفه `analytics` موارد ناموفق را با backoff دوباره می‌فرستد.
- `AuthAttempt` فقط hash کوتاه هویت، نوع عملیات، نتیجه، latency و request ID را نگه می‌دارد؛ OTP و شماره خام ذخیره نمی‌شوند.
- وظیفه روزانه `retention` تلاش OTP را پس از ۹۰ روز، لاگ اعلان را پس از ۱۸۰ روز و activity/inbox را پس از ۳۶۵ روز پاک می‌کند. audit ادمین ۷۳۰ روز حفظ می‌شود؛ eventهای تحویل‌شدهٔ outbox پس از ۹۰ روز و eventهای `suppressed` جامانده از تست پس از ۱ روز حذف می‌شوند.
- وظیفه `invariants` موجودی منفی، session باز قدیمی، session باز تکراری و mismatch پاداش را بررسی و violation را به Sentry می‌فرستد.
- وظیفه `studySessions` تایمر running عبورکرده از سقف و تایمر paused رهاشده بیش از ۲۴ ساعت را با زمان authoritative تسویه می‌کند. پرداخت با قفل کاربر idempotent است و مدت pause به مطالعه افزوده نمی‌شود. اجرای هم‌زمان آن با `npm run test:stale-sessions` پوشش داده شده است.
- اجرای دستی `npm run test:invariants` همین کنترل‌ها را روی دیتابیس development/staging انجام می‌دهد و در صورت violation با exit code ناموفق تمام می‌شود.
- `npm run test:sse-replicas` تحویل واقعی Redis Pub/Sub میان دو process مستقل را کنترل می‌کند و `npm run test:distributed-lock` تضمین تک‌اجرایی job را زیر ۱۰۰ تلاش هم‌زمان می‌سنجد.
- load test باید با `GCAMP_LOAD_TEST_MODE=1` روی سرور اجرا شود. فقط درخواست دارای header داخلی تست در این حالت رویدادهایش را با status برابر `suppressed` در outbox می‌نویسد؛ بنابراین performance نوشتن outbox سنجیده می‌شود ولی داده آزمایشی به PostHog تحویل نمی‌شود.

## چک‌لیست انتشار

### ضروری

- [ ] تغییرات فعلی commit و push شوند تا GitHub Actions ایمیج جدید را بسازد.
- [ ] secret با نام `SENTRY_AUTH_TOKEN` در GitHub Actions تنظیم باشد؛ workflow
      عمداً در نبود آن پیش از build متوقف می‌شود.
- [ ] ایمیج جدید روی VPS pull و کانتینر `app` بازسازی شود.
- [ ] یک ورود واقعی و یک جلسهٔ مطالعهٔ کوتاه روی production انجام شود.
- [ ] در PostHog دریافت `signed_in`، `study_started` و `study_completed` بررسی شود.
- [ ] یک خطای کنترل‌شدهٔ غیرحساس در production یا staging به Sentry ارسال و دریافت
      آن تأیید شود؛ سپس issue آزمایشی Resolve شود.
- [ ] رسیدن ایمیل هشدار Sentry به inbox/spam بررسی شود.
- [ ] از داخل اینترنت ایران، موفق بودن درخواست‌های PostHog و Sentry در Network
      مرورگر بررسی شود.

### اختیاری پس از جمع‌شدن داده

- [ ] پس از ۷ تا ۱۴ روز، funnel `signed_in → study_started → study_completed`
      به داشبورد اضافه شود.
- [ ] سقف مصرف و اعلان quota سرویس‌ها ماهانه بررسی شود.
- [ ] در صورت مسدودشدن دامنه‌ها یا Ad blocker گسترده، reverse proxy هم‌دامنه برای
      endpointهای ingest بررسی شود.

Grafana، Hotjar و Google Analytics فقط وقتی اضافه شوند که یک نیاز مشخص و حل‌نشده
وجود داشته باشد؛ در وضعیت فعلی باعث دادهٔ تکراری و نگهداری بیشتر می‌شوند.

## عیب‌یابی سریع

### رویداد PostHog دیده نمی‌شود

1. مطمئن شوید build جدید واقعاً deploy شده است؛ متغیرهای `NEXT_PUBLIC_*` هنگام
   build داخل bundle قرار می‌گیرند.
2. Network مرورگر را برای درخواست به `us.i.posthog.com` و خطاهای block/DNS بررسی
   کنید.
3. Ad blocker را موقتاً خاموش و دوباره تست کنید.
4. برای رویدادهای مطالعه، پاسخ موفق API و log سرور را بررسی کنید.

### خطا در Sentry دیده نمی‌شود

1. محیط و فیلتر زمانی صفحهٔ Issues را روی `All Envs` و بازهٔ اخیر بگذارید.
2. `NEXT_PUBLIC_SENTRY_DSN` در build و `SENTRY_DSN` در runtime را بررسی کنید.
3. Network مرورگر و خروجی `docker compose logs app` را چک کنید.
4. اگر خطا ثبت شده ولی stack trace خوانا نیست، Source Map را فعال کنید.

### لاگ Docker بیش از حد زیاد است

ابتدا علت تکرار را رفع کنید. چرخش فایل‌ها جلوی پرشدن نامحدود دیسک را می‌گیرد، اما
جایگزین حذف logهای noisy یا اطلاعات حساس از کد نیست.

## فایل‌های مرتبط

- `instrumentation-client.ts`: راه‌اندازی PostHog و Sentry در مرورگر.
- `instrumentation.ts`: ثبت خطاهای سرور Next.js.
- `sentry.server.config.ts` و `sentry.edge.config.ts`: تنظیم runtimeهای Sentry.
- `lib/analytics-client.ts`: هویت، خروج و رویدادهای کلاینت.
- `lib/analytics-server.ts`: ارسال امن و غیرمسدودکنندهٔ رویدادهای اصلی محصول.
- `components/analytics/AnalyticsIdentity.tsx`: اتصال session کاربر به شناسهٔ داخلی.
- `app/error.tsx` و `app/global-error.tsx`: ثبت exception و تجربهٔ خطای فارسی.
- `app/api/auth/verify-otp/route.ts`: رویداد ورود موفق.
- `app/api/study/start/route.ts` و `app/api/study/end/route.ts`: رویدادهای مطالعه.
- `next.config.ts`: اتصال build به Sentry.
- `Dockerfile` و `.github/workflows/deploy.yml`: envهای build و Source Map اختیاری.
- `docker-compose.yml`: محدودیت و چرخش Docker logs.
