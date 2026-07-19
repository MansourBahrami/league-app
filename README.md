# G-camp — اپلیکیشن گیمیفیکیشن مطالعه

یک PWA فارسی و راست‌چین برای دانش‌آموزان دبیرستانی و کنکوری‌ها. کاربر با تایمر مطالعه می‌کند، XP و سکه می‌گیرد، استریک و مدال می‌سازد، ماموریت انجام می‌دهد و در لیدربورد هفتگی و تورنومنت‌ها رقابت می‌کند.

## قابلیت‌های اصلی

- ورود با OTP موبایل، Magic Link ربات بله/تلگرام و Mini App
- تایمر ۳۰/۶۰/۹۰/۱۲۰ دقیقه با اعتبارسنجی و pause سمت سرور
- مسیر آنبوردینگ با هدف روزانه، تور راهنما و ویدیوی آموزشی اختیاری
- A/B تست دسترسی رایگان به ویدیو در برابر خرید ویدیو با سکه
- ماموریت‌های روزانه و هفتگی، XP، سکه، سطح، ستاره، مدال و استریک
- لیدربورد هم‌سطح، لیگ آزاد، جدول دوستان و تورنومنت
- فید زنده SSE، واکنش، صندوق اعلان و Web Push
- پنل ادمین برای آمار، لیدها، ویدیوها، تورنومنت‌ها، قوانین اعلان و تحلیل A/B

## استک

Next.js 16 (App Router)، React 19، TypeScript، Tailwind CSS 4، Prisma 7، PostgreSQL 17 و Redis.

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
```

`test:gamification` یک تست صرفاً واحد نیست؛ روی دیتابیس تنظیم‌شده رکورد آزمایشی ایجاد و در پایان پاک می‌کند. فقط روی دیتابیس توسعه اجرا شود.

## مستندات

- [PROJECT.md](PROJECT.md): معماری، محصول، مدل داده و جریان‌های اصلی
- [FILES.md](FILES.md): نقشهٔ فایل‌ها و ارتباط قابلیت‌ها با کد
- [ROADMAP.md](ROADMAP.md): فازهای انجام‌شده و کارهای باقی‌مانده
- [DEPLOYMENT.md](DEPLOYMENT.md): وضعیت و فرایند استقرار production

دستورالعمل مهم توسعهٔ Next.js در [AGENTS.md](AGENTS.md) قرار دارد.
