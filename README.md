# G-camp — اپلیکیشن گیمیفیکیشن مطالعه

یک PWA فارسی و راست‌چین برای دانش‌آموزان دبیرستانی و کنکوری‌ها. کاربر با تایمر مطالعه می‌کند، XP و سکه می‌گیرد، استریک و مدال می‌سازد، ماموریت انجام می‌دهد و در لیدربورد هفتگی و تورنومنت‌ها رقابت می‌کند.

## قابلیت‌های اصلی

- ثبت‌نام و ورود فقط با OTP موبایل؛ اتصال اختیاری ربات بله/تلگرام برای اعلان‌ها
- تایمر ۱۵/۳۰/۶۰/۹۰/۱۲۰ دقیقه با اعتبارسنجی و pause سمت سرور
- مسیر آنبوردینگ با هدف شروع ۱۵ دقیقه‌ای، معرفی افراد آنلاین و ویدیوی آموزشی اختیاری
- A/B تست دسترسی رایگان به ویدیو در برابر خرید ویدیو با سکه
- کمپ مأموریت روزانه و هفتگی با هدف مشترک، پیشرفت زندهٔ اعضا و تشویق؛ XP، سکه، سطح، ستاره، مدال و استریک
- لیدربورد هم‌سطح، لیگ آزاد، جدول دوستان و تورنومنت
- فید زنده SSE، واکنش، صندوق اعلان و Web Push
- پنل ادمین برای آمار، لیدها، ویدیوها، تورنومنت‌ها، قوانین اعلان و تحلیل A/B

## استک

Next.js 16 (App Router)، React 19، TypeScript، Tailwind CSS 4، Prisma 7، PostgreSQL 17 و Redis.

## مدل ثبت‌نام و اتصال پیام‌رسان

هویت اصلی کاربر فقط شمارهٔ موبایل تأییدشده است. ثبت‌نام و ورود هر دو از یک مسیر انجام می‌شوند: کاربر شماره را وارد می‌کند، OTP شش‌رقمی را می‌گیرد و پس از تأیید، سشن نسخه‌دار ۳۰روزه برایش ساخته می‌شود. ربات تلگرام یا بله هیچ‌وقت حساب جدید یا سشن ورود ایجاد نمی‌کند.

بعد از پایان اولین جلسهٔ مطالعهٔ ثبت‌شده، اپ یک‌بار پیشنهاد اتصال پیام‌رسان را نشان می‌دهد. برای هر پیام‌رسان یک لینک یکتای ۱۵دقیقه‌ای ساخته می‌شود؛ کاربر فقط ربات را با پارامتر `/start` باز می‌کند و شناسهٔ همان پیام‌رسان به حساب موبایلی موجود متصل می‌شود. وضعیت و قطع/اتصال مجدد همیشه از پروفایل در دسترس است.

هدف اتصال پیام‌رسان، ارسال اعلان‌هایی مثل یادآوری مطالعه، پیام‌های ماموریت و خبرهای حساب است؛ این اتصال اختیاری است و جایگزین ورود با OTP نمی‌شود. OTP در Redis به‌صورت هش‌شده و یکبارمصرف نگهداری می‌شود و توکن اتصال ربات نیز کوتاه‌عمر و یکبارمصرف است.

## اجرای محلی

پیش‌نیازها:

- PostgreSQL روی `localhost:5432`
- Redis روی `localhost:6379`
- دیتابیس `league_db`
- فایل‌های `.env` و `.env.local` با `DATABASE_URL`، `REDIS_URL` و `JWT_SECRET`

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npx tsx prisma/seed-testdata.ts   # داده و کاربران نمایشی محلی
npm run dev
```

اپ روی [http://localhost:3000](http://localhost:3000) اجرا می‌شود.

برای تست از موبایل روی همان شبکه، اپ را با IP سیستم باز کنید (برای نمونه `http://192.168.1.20:3000`) و همهٔ درخواست‌های اپ را روی همان host نگه دارید. محافظ CSRF، `Origin` را با Host واقعی درخواست، شامل پورت و پروتکل، تطبیق می‌دهد؛ نیازی به غیرفعال‌کردن امنیت یا تعریف wildcard نیست.

کاربر ادمین seed محلی: `09120000009`. در محیط توسعه، OTP در پاسخ API و فرم ورود قرار می‌گیرد.

## فرمان‌های مهم

```bash
npm run dev
npm run build
npm run lint
npm run db:seed
npm run db:studio
npm run test:levels
npm run test:onboarding
npm run test:timer
npm run test:auth
npm run test:study-concurrency
npm run test:economy-concurrency
npm run test:distributed-lock
npm run test:sse-replicas # نیازمند دو replica در پورت‌های ۳۰۰۰ و ۳۰۰۱
npm run test:stale-sessions # تست ایزولهٔ تسویه running/paused رهاشده
npm run test:invariants     # read-only؛ روی violation با exit code 1 تمام می‌شود
npm run maintenance:stale-sessions # پیش‌نمایش read-only سشن‌های قابل تسویه
npm run test:load:500 # فقط development/staging و همراه production build محلی
```

`test:gamification` یک تست صرفاً واحد نیست؛ روی دیتابیس تنظیم‌شده رکورد آزمایشی ایجاد و در پایان پاک می‌کند. فقط روی دیتابیس توسعه اجرا شود.

برای تست بار، build را با حالت جلوگیری از ارسال analytics آزمایشی اجرا کنید؛ این
حالت فقط همراه header داخلی خود اسکریپت اثر دارد و رویدادها را با وضعیت
`suppressed` در outbox موقت نگه می‌دارد تا در پایان پاک شوند:

```bash
npm run build
GCAMP_LOAD_TEST_MODE=1 npm run start
npm run test:load:500
```

تسویهٔ سشن‌های تاریخی به‌صورت پیش‌فرض فقط پیش‌نمایش است. اعمال تغییر فقط روی
دیتابیس localhost و با دو تأیید صریح ممکن است:

```bash
npm run maintenance:stale-sessions
DEV_SETTLE_STALE_CONFIRM=1 npm run maintenance:stale-sessions -- --apply
```

## مستندات

- [PROJECT.md](PROJECT.md): معماری، محصول، مدل داده و جریان‌های اصلی
- [FILES.md](FILES.md): نقشهٔ فایل‌ها و ارتباط قابلیت‌ها با کد
- [ROADMAP.md](ROADMAP.md): فازهای انجام‌شده و کارهای باقی‌مانده
- [DEPLOYMENT.md](DEPLOYMENT.md): وضعیت و فرایند استقرار production
- [OBSERVABILITY.md](OBSERVABILITY.md): تحلیل رفتار کاربران، دریافت خطا، لاگ‌ها و چک‌لیست پایش

دستورالعمل مهم توسعهٔ Next.js در [AGENTS.md](AGENTS.md) قرار دارد.
