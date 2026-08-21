# راهنمای فایل‌های پروژه (Codebase Map)

> نقشهٔ کامل کدبیس: هر فایل چه‌کاری می‌کند و مربوط به کدام فیچر است.
> برای دید محصولی/معماری به [PROJECT.md](PROJECT.md) و برای استقرار به [DEPLOYMENT.md](DEPLOYMENT.md) مراجعه کنید.
>
> **راهنمای علامت‌ها:** 🟢 در حال استفاده · 🟡 آماده ولی غیرفعال/مستقرنشده · ⚪️ بلااستفاده/میراث

---

## فهرست سریع بر اساس فیچر

| فیچر | فایل‌های اصلی |
|------|----------------|
| احراز هویت (OTP) | `app/api/auth/{send-otp,verify-otp,logout}`, `lib/auth.ts`, `lib/sms.ts`, `app/login/page.tsx` |
| اتصال ربات برای اعلان | `app/api/profile/bot-link`, `app/api/bot/link`, `lib/bot-link.ts`, `lib/bot-handler.ts` |
| تایمر و جلسهٔ مطالعه | `components/dashboard/StudyTimer.tsx`, `app/api/study/*` |
| گیمیفیکیشن (XP/سکه/سطح/مدال) | `lib/gamification.ts`, `lib/mission.ts`, `lib/streak.ts` |
| کمپ مأموریت | `app/(app)/mission-rooms`, `app/api/mission-rooms`, `app/api/missions/buy`, `components/mission-rooms/*`, `lib/mission-room.ts` |
| لیدربورد | `app/(app)/leaderboard`, `components/leaderboard/*` |
| فید زنده | `app/api/feed/stream`, `components/feed/LiveFeed.tsx` |
| ویدیو/LMS | `app/(app)/videos/*`, `components/videos/*`, `lib/onboarding.ts` |
| آنبوردینگ | `components/onboarding/*`, `lib/onboarding.ts` |
| پروفایل | `app/(app)/profile/*`, `components/profile/*` |
| دعوت دوستان | `lib/referral.ts`, `app/api/friends`, `components/social/InviteFriends.tsx` |
| تورنومنت | `lib/tournament.ts`, `app/(app)/tournaments/*`, `app/api/tournaments/*` |
| نوتیفیکیشن (Push + ربات) | `lib/push.ts`, `lib/notifications.ts`, `public/sw.js`, `components/push/*` |
| کارهای زمان‌بندی‌شده | `lib/jobs.ts`, `app/api/cron/run` |
| پنل ادمین | `app/(admin)/*`, `app/api/admin/*`, `components/admin/*` |
| زیرساخت/استقرار | `Dockerfile`, `docker-compose.yml`, `.github/workflows/deploy.yml`, `scripts/vps-setup.sh` |
| تحلیل رفتار و پایش خطا | `instrumentation*.ts`, `sentry.*.config.ts`, `lib/analytics-*`, `components/analytics/*`, `app/{error,global-error}.tsx` |

---

## ۱. ریشه و پیکربندی

| فایل | توضیح |
|------|-------|
| `package.json` | وابستگی‌ها و اسکریپت‌ها (`dev`, `build`, `db:seed`, `test:*`). |
| `next.config.ts` | پیکربندی Next.js 16. |
| `proxy.ts` 🟢 | **میدلور احراز هویت** (در Next.js 16 جایگزین `middleware.ts`). بررسی خوش‌بینانه JWT، پاسخ 401 برای API، تمدید sliding و جلوگیری از درخواست cross-site. |
| `lib/request-security.ts` 🟢 | تطبیق Origin درخواست‌های تغییردهنده با URL عمومی یا Host واقعی؛ سازگار با IP شبکهٔ محلی و reverse proxy، بدون CORS wildcard. |
| `tsconfig.json`, `next-env.d.ts` | پیکربندی TypeScript و alias `@/*`. |
| `eslint.config.mjs`, `postcss.config.mjs` | لینت و PostCSS (Tailwind v4). |
| `prisma.config.ts` | پیکربندی Prisma 7 (مسیر schema و seed). |
| `Dockerfile` 🟢 | بیلد دو مرحله‌ای ایمیج production (Node 22-slim، خروجی `.next`). |
| `docker-compose.yml` 🟢 | استک داخل repo: `app` + `postgres` + `redis`. Caddy در پیکربندی production سرور نگهداری می‌شود. |
| `.dockerignore`, `.gitignore` | استثناهای build/git (شامل `.next`, `node_modules`, `.env*`). |
| `.env.example`, `.env.local`, `.env.production.example` | الگو و مقادیر متغیرهای محیطی (local و production). |

### مستندات
| فایل | توضیح |
|------|-------|
| `PROJECT.md` | سند جامع فنی/محصولی (استک، دیتابیس، یوزرفلو، فیچرها). |
| `FILES.md` | همین فایل — نقشهٔ کدبیس. |
| `DEPLOYMENT.md` | راهنمای استقرار production (CDN/HTTPS، بله، کاوه‌نگار، redeploy). |
| `OBSERVABILITY.md` | راهنمای PostHog، Sentry، Docker logs، حریم خصوصی و چک‌لیست انتشار. |
| `ROADMAP.md` | فازها و کارهای آینده. |
| `AGENTS.md` / `CLAUDE.md` | راهنمای ایجنت‌ها (`CLAUDE.md` فقط به `AGENTS.md` اشاره می‌کند). |
| `README.md` | معرفی واقعی محصول، اجرای محلی، فرمان‌ها و لینک مستندات. |

---

## ۲. کتابخانهٔ منطق (`lib/`)

### زیرساخت پایه
| فایل | توضیح |
|------|-------|
| `lib/db.ts` 🟢 | کلاینت Prisma (singleton) با driver adapter `@prisma/adapter-pg`. |
| `lib/redis.ts` 🟢 | کلاینت ioredis (singleton) برای OTP هش‌شده و توکن اتصال ربات. |
| `lib/auth.ts` 🟢 | امضا/اعتبارسنجی JWT با `jose`، کوکی `league_session` (۳۰ روز، sliding refresh)، helperهای سشن سمت سرور. |

### احراز هویت و ورود
| فایل | توضیح |
|------|-------|
| `lib/sms.ts` 🟢 | **ارسال پیامک OTP با کاوه‌نگار** (endpoint `sms/send.json`). از سرور ایران در دسترس است. |
| `lib/otp.ts` 🟢 | تولید رمزنگاری‌شده، ذخیره هش، rate limit و مصرف اتمیک OTP با سقف تلاش. |
| `lib/bot-link.ts` 🟢 | توکن یکبارمصرف ۱۵دقیقه‌ای و اتصال امن شناسه تلگرام/بله به User موبایلی موجود. |
| `lib/bot.ts` 🟢 | کلاینت Bot API برای تلگرام و بله (`sendMessage`, `sendMessageWithButtons`, `setWebhook`, `miniAppButton`). |
| `lib/bot-handler.ts` 🟢 | پردازش `/start <token>`؛ فقط اتصال کانال پیام‌رسان و بدون ساخت User یا سشن. |

### موتور گیمیفیکیشن
| فایل | توضیح |
|------|-------|
| `lib/gamification.ts` 🟢 | قلب منطق: `calcRewards`, `calcLevel` (جدول سطوح + شرط مدال)، پیشنهاد ماموریت، پیام لیدربورد، قوانین هدف روزانه/آنبوردینگ، استریک مؤثر. |
| `lib/mission.ts` 🟢 | چرخهٔ عمر ماموریت (`processUserMissions`) + محاسبهٔ مجدد سطح (`recalcUserLevel`) + شمارش مدال. |
| `lib/onboarding.ts` 🟢 | وضعیت روز جاری آنبوردینگ، هدف دقیقه و ویدیوی اختیاری free/paid؛ تکمیل روز بر اساس دقیقه‌های مطالعه. |
| `lib/ab.ts` 🟢 | تخصیص ۵۰/۵۰ مدل دسترسی ویدیو، سکهٔ اولیهٔ paid و جدول قیمت روزها. |
| `lib/weekly-mission.ts` 🟢 | شکستن هدف هفتگی به ۶ روز + روز هفتم استراحت/جبران. |
| `lib/streak.ts` 🟢 | محاسبهٔ زنجیرهٔ روزهای متوالی مطالعه و ثبت رویداد فید روی نقاط عطف ۳/۶ روزه. |
| `lib/referral.ts` 🟢 | دعوت دوستان: کد یکتا، دوستی دوطرفه، فهرست دوستان. |

### تورنومنت و نوتیفیکیشن
| فایل | توضیح |
|------|-------|
| `lib/tournament.ts` 🟢 | تورنومنت بازه‌دار (اتاق/لیدربورد جدا)؛ امتیاز = مجموع XP جلسات در بازه؛ تسویه و جایزه. |
| `lib/tournament-admin.ts` 🟢 | پارس/پاکسازی فرم تورنومنت (مشترک بین POST/PATCH ادمین). |
| `lib/video-admin.ts` 🟢 | پارس/پاکسازی فرم ویدیو (پایه‌های چندگانه `grades[]`، CTA). |
| `lib/push.ts` 🟡 | Web Push با VAPID (`sendPushToUser`). نیازمند کلیدهای VAPID در env. |
| `lib/notifications.ts` 🟢 | تشخیص افت رتبهٔ هفتگی (`detectRankDrops`) و شلیک رویداد `rank_drop`؛ ارسال توسط موتور قانون انجام می‌شود. |
| `lib/notification-rules.ts` 🟢 | **کاتالوگ موتور قانون**: فیلدها/عملگرها/سگمنت‌ها/رویدادها + ارزیابی شرط (`userMatches`) + رندر متن (`renderTemplate`). خالص و قابل‌import در کلاینت. |
| `lib/notification-engine.ts` 🟢 | **موتور ارسال**: غنی‌سازی کاربر، ایمنی (cooldown/quiet/maxPerDay)، کانال بله/Push، لاگ. `runScheduledRules` (cron)، `fireEvent` (hook رویدادی)، `runRuleManually` (تست). |
| `lib/notification-admin.ts` 🟢 | پارس/اعتبارسنجی فرم قانون نوتیفیکیشن (مشترک بین POST/PATCH ادمین). |
| `lib/notification-seed.ts` 🟢 | قانون‌های پیش‌فرض یادآور، بازگشت، استریک، رتبه، سطح و مدال؛ idempotent بر اساس `name`. |
| `lib/jobs.ts` 🟢 | اجرای کارهای زمان‌بندی‌شده (`runScheduledJobs`): ماموریت‌ها، تسویهٔ تورنومنت، `notifRules` (موتور قانون)، `ranks` (افت رتبه). با پارامتر `tasks` فرکانس‌پذیر. |

---

## ۳. مسیرهای صفحه (`app/`)

### ریشه و عمومی
| فایل | توضیح |
|------|-------|
| `app/layout.tsx` 🟢 | layout ریشه: فونت‌های محلی Vazirmatn، Pinar و Material Symbols، `dir="rtl"` و ثبت PWA. |
| `app/page.tsx` 🟢 | صفحهٔ ریشه — ریدایرکت به `/dashboard` یا `/login`. |
| `app/globals.css` 🟢 | توکن‌های طراحی Tailwind v4 در `@theme inline` (رنگ، شیشه، دکمه). |
| `app/login/page.tsx` 🟢 | تنها مسیر ثبت‌نام/ورود: شماره موبایل → OTP با fetch نسبی. |

### گروه کاربر `(app)/` — همه پشت احراز هویت + `AppShell`
| فایل | فیچر |
|------|------|
| `app/(app)/layout.tsx` 🟢 | واکشی user، تخصیص A/B، AppShell، ProgressiveOnboarding، قفل lead و PushRegister. |
| `app/(app)/dashboard/page.tsx` 🟢 | داشبورد: تایمر، ماموریت روزانه/هفتگی، استریک، رقبای نزدیک و گزارش مطالعه. |
| `app/(app)/missions/page.tsx` 🟢 | redirect مسیر قدیمی به `/mission-rooms`. |
| `app/(app)/mission-rooms/page.tsx` 🟢 | ورود مستقیم به کمپ جاری؛ در نبود مأموریت جاری، انتخاب هدف روزانه/هفتگی. |
| `app/(app)/mission-rooms/[id]/page.tsx` 🟢 | جزئیات کمپ، پیشرفت/رتبهٔ زندهٔ اعضا، تشویق و فید فیلترشدهٔ کمپ. |
| `app/(app)/feed/page.tsx` 🟢 | بورد زندهٔ فعالیت‌ها (SSE). |
| `app/(app)/leaderboard/page.tsx` 🟢 | لیدربورد هفتگی هم‌سطح + تب «لیگ آزاد» برای cold start. |
| `app/(app)/profile/page.tsx` 🟢 | پروفایل خود: آمار، مدال، ویرایش، خروج، دعوت دوستان. |
| `app/(app)/profile/[id]/page.tsx` 🟢 | پروفایل عمومی دیگران + باز کردن لاگ مطالعه با سکه. |
| `app/(app)/videos/page.tsx` 🟢 | فهرست ویدیوهای آموزشی (باز شدن تدریجی). |
| `app/(app)/videos/[id]/page.tsx` 🟢 | پخش‌کنندهٔ ویدیو (anti-seek + پاداش ۹۰٪). |
| `app/(app)/tournaments/page.tsx` 🟢 | فهرست تورنومنت‌های فعال/آینده. |
| `app/(app)/tournaments/[id]/page.tsx` 🟢 | اتاق تورنومنت + لیدربورد اختصاصی + دکمهٔ شرکت. |
| `app/(app)/inbox/page.tsx` 🟢 | صندوق اعلان، واکنش و جایزه‌های کاربر. |

### گروه ادمین `(admin)/` — محافظت دولایه (proxy + `getAdminSession`)
| فایل | فیچر |
|------|------|
| `app/(admin)/admin/layout.tsx` 🟢 | layout ادمین + بررسی نقش `admin` از DB. |
| `app/(admin)/admin/page.tsx` 🟢 | داشبورد ادمین. |
| `app/(admin)/admin/analytics/page.tsx` 🟢 | تحلیل A/B مدل free/paid ویدیو. |
| `app/(admin)/admin/notifications/*` 🟢 | فهرست، ساخت و ویرایش قانون‌های اعلان. |
| `app/(admin)/admin/videos/{page,new/page,[id]/page}.tsx` 🟢 | CRUD ویدیو (پایهٔ چندگانه، CTA). |
| `app/(admin)/admin/tournaments/{page,new/page,[id]/page}.tsx` 🟢 | CRUD تورنومنت. |
| `app/(admin)/admin/leaderboard/page.tsx` 🟢 | نمای لیدربورد برای ادمین. |
| `app/(admin)/admin/leads/page.tsx` 🟢 | فهرست/خروجی leadها (اطلاعات تماس کاربران). |

---

## ۴. API (`app/api/`)

### احراز هویت
| مسیر | توضیح |
|------|-------|
| `auth/send-otp` 🟢 | OTP رمزنگاری‌شده در Redis (TTL پنج دقیقه) با rate limit شماره و IP؛ پیامک کاوه‌نگار در production. |
| `auth/verify-otp` 🟢 | مصرف اتمیک OTP با سقف پنج تلاش، upsert کاربر و ست کوکی JWT نسخه‌دار. |
| `auth/logout` 🟢 | ابطال JWTهای قبلی کاربر و پاک کردن کوکی. |

### ربات
| مسیر | توضیح |
|------|-------|
| `bot/bale` 🟢 | **Webhook بله** با `secret_token` در header → `handleBotUpdate("bale", …)`. |
| `bot/telegram` 🟡 | Webhook تلگرام (مشابه بله؛ ارسال از ایران به api.telegram.org بلاک است). |
| `bot/link` 🟡 | API سرویس ربات مجزا: مصرف توکن اتصال با `BOT_API_SECRET`. |
| `profile/bot-link` 🟢 | ساخت deep link یکبارمصرف، وضعیت اتصال و ثبت «فعلاً نه». |

### مطالعه و گیمیفیکیشن
| مسیر | توضیح |
|------|-------|
| `study/start` 🟢 | شروع جلسه (بستن جلسات باز قبلی) + رویداد `timer_start`. |
| `study/tick` 🟢 | پاداش هر ۱۵ دقیقه با **اعتبارسنجی سمت سرور** (زمان واقعی منهای pause، سقف `plannedMin`). |
| `study/pause` / `study/resume` 🟢 | مدیریت pause سمت سرور (`pausedSec`). |
| `study/end` 🟢 | پایان جلسه (idempotent) + محاسبهٔ نهایی، سطح، استریک، آنبوردینگ. |
| `missions/buy` 🟢 | انتخاب مأموریت، کسر سکه و عضویت اتمیک در کمپ هم‌هدف‌ها. |
| `mission-rooms/[id]` 🟢 | snapshot زندهٔ کمپ برای اعضا. |
| `mission-rooms/[id]/cheer` 🟢 | ارسال تشویق محدود و ساخت Inbox/Web Push. |
| `streak/freeze` 🟢 | خرید مرخصی استریک با ۵۰ سکه. |
| `videos/[id]/buy` 🟢 | خرید ویدیو برای گروه A/B `paid`. |
| `videos/[id]/progress` 🟢 | ثبت پیشرفت ویدیو + پاداش ۹۰٪ (۲× در ۲۴ ساعت اول). |
| `profile` 🟢 | `GET` اطلاعات کامل / `PATCH` به‌روزرسانی پروفایل (snapshot هدف روز اول). |
| `profile/[id]/unlock` 🟢 | باز کردن بخش مطالعهٔ دیگران (۲۰ سکه، ۱ ساعت). |
| `profile/avatar` + `avatar/[id]` 🟢 | ذخیره/حذف آواتار آپلودی و سرو عمومی تصویر. |
| `friends` 🟢 | `GET` کد دعوت + دوستان / `POST` افزودن دوست با کد. |
| `feed/stream` 🟢 | استریم SSE فعالیت‌ها (`broadcastActivity`). |
| `feed/[id]/react` 🟢 | افزودن/تغییر/حذف واکنش و بررسی جایزهٔ تشویق. |
| `inbox` + `inbox/read` 🟢 | فهرست صندوق و علامت‌گذاری آیتم‌ها به‌عنوان خوانده‌شده. |
| `push/subscribe` 🟡 | ثبت/حذف subscription مرورگر برای Web Push. |
| `tournaments/[id]/join` 🟢 | شرکت در تورنومنت (کسر هزینه). |
| `cron/run` 🟢 | اجرای کارهای زمان‌بندی‌شده (محافظت با `Bearer CRON_SECRET`، پارامتر `?tasks=`). |

### ادمین
| مسیر | توضیح |
|------|-------|
| `admin/videos` + `admin/videos/[id]` 🟢 | CRUD ویدیو (فقط ادمین → ۴۰۳). |
| `admin/tournaments` + `admin/tournaments/[id]` 🟢 | CRUD تورنومنت. |
| `admin/notifications` + زیرمسیرها 🟢 | CRUD و اجرای دستی قانون‌های اعلان. |
| `admin/leads/export` 🟢 | خروجی CSV از leadها. |

---

## ۵. کامپوننت‌ها (`components/`)

| گروه | فایل‌ها | فیچر |
|------|---------|------|
| `layout/` 🟢 | `AppShell`, `Header`, `BottomNav` | پوستهٔ اپ، نوار بالا و ناوبری پایین ۵ تب؛ مطالعه در مرکز و بورد زنده خارج از ناوبری. |
| `dashboard/` 🟢 | `StudyTimer`, `DailyMissionCard`, `FocusPulse`, `StudyReport*` | تایمر، ماموریت، وضعیت تمرکز زنده و گزارش مطالعه. |
| `onboarding/` 🟢 | `ProgressiveOnboarding`, `ContextualSpotlight`, `LeadCaptureModal`, `GoalSettingModal`, `BotConnectModal`, `Day2MissionModal` | راهنمای مرحله‌ای، فرم اطلاعات/موبایل، هدف فردا و اتصال پیام‌رسان. |
| `mission-rooms/` 🟢 | `MissionRoomChooser`, `MissionRoomRoster`, `RoomCheerButton` | انتخاب کمپ، رتبه/پیشرفت زنده و تعامل امن. |
| `leaderboard/` 🟢 | `Podium`, `LeaderboardList` | سکوی تاپ ۳ + فهرست با focus روی کاربر. |
| `feed/` 🟢 | `LiveFeed` | فید زنده SSE و واکنش‌های کاربران. |
| `profile/` 🟢 | `StatsGrid`, `MedalsSection`, `ProfileActions`, `MessengerConnections`, `AvatarPicker`, `LockedStudySection`, `LevelInfoButton` | آمار، مدال، اتصال پیام‌رسان، آواتار، ویرایش/خروج و قفل گزارش. |
| `videos/` 🟢 | `VideoPlayerClient`, `VideoCard` | پخش HLS با anti-seek + کارت ویدیو. |
| `social/` 🟢 | `InviteFriends` | اشتراک کد دعوت. |
| `tournament/` 🟢 | `JoinButton` | دکمهٔ شرکت در تورنومنت. |
| `push/` 🟡 | `PushRegister`, `NotificationToggle` | ثبت Service Worker و کلید subscription Web Push. |
| `admin/` 🟢 | فرم/فهرست ویدیو، تورنومنت و قانون اعلان + خروجی لید | ابزارهای پنل ادمین. |
| `ui/` 🟢 | `Confetti` | انیمیشن کانفتی (level up / مدال). |

---

## ۶. دیتابیس (`prisma/`)

| فایل | توضیح |
|------|-------|
| `prisma/schema.prisma` 🟢 | تعریف همهٔ مدل‌ها (User، StudySession، Mission، UserMission، Medal، Video، Friendship، PushSubscription، Tournament و…). OTP فقط در Redis است. |
| `prisma/seed.ts` 🟢 | داده‌های اولیه: مدال‌ها، ماموریت‌ها، ویدیوهای آنبوردینگ. |
| `prisma/migrations/` 🟢 | تاریخچهٔ ۱۵ migration از init تا اعلان، A/B، واکنش/صندوق، ماموریت روزانه و AvatarImage. |
| `app/generated/prisma/` | کلاینت تولیدشدهٔ Prisma (در `.gitignore`؛ در build با `prisma generate` ساخته می‌شود). |

---

## ۷. PWA و استاتیک (`public/`)

| فایل | توضیح |
|------|-------|
| `public/manifest.json` 🟢 | مانیفست PWA (نام، آیکون، تم). |
| `public/sw.js` 🟡 | Service Worker: نمایش نوتیف Web Push و کلیک. |
| `public/icon-192.png`, `icon-512.png` 🟢 | آیکون‌های PWA. |
| `public/brand/*` 🟢 | لوگوها و نشان‌های برند G-camp. |
| `public/posters/*` 🟢 | پوسترهای واقعی قابلیت‌های اپ در صفحه ورود. |

---

## ۸. سرویس ربات مجزا (`bot/`) 🟡

سرویس Node.js **مستقل** از اپ (long-polling تلگرام). **در production فعلی مستقر نشده** — به‌جای آن بله از طریق webhook داخل خود اپ (`/api/bot/bale`) وصل شده است.

| فایل | توضیح |
|------|-------|
| `bot/index.js` | ربات long-polling: توکن `/start` را به `/api/bot/link` می‌فرستد تا کانال به User موجود متصل شود. |
| `bot/package.json`, `bot/.env.example`, `bot/README.md` | وابستگی، الگوی env، راهنما. |

---

## ۹. اسکریپت‌ها (`scripts/`)

| فایل | توضیح |
|------|-------|
| `scripts/make-admin.ts` 🟢 | ادمین‌کردن یک کاربر با شماره موبایل. |
| `scripts/setup-webhooks.ts` 🟢 | ثبت webhook تلگرام و بله از روی env (`APP_PUBLIC_URL`, `BOT_WEBHOOK_SECRET`). |
| `scripts/test-gamification.ts`, `test-levels.ts`, `test-onboarding.ts` 🟢 | تست‌های منطق گیمیفیکیشن (بدون فریم‌ورک تست، اجرای مستقیم با tsx). |
| `scripts/vps-setup.sh` 🟢 | اسکریپت آماده‌سازی سرور VPS (نصب Docker و وابستگی‌ها). |
| `scripts/seed-notifications.ts` 🟢 | درج idempotent قانون‌های پیش‌فرض اعلان. |
| `scripts/prod-db-studio.sh` 🟢 | تونل SSH و Prisma Studio روی دیتابیس production. |
| `prisma/seed-testdata.ts` 🟢 | بازسازی کاربران و داده‌های نمایشی محلی؛ دیتابیس را تغییر می‌دهد. |

---

## ۱۰. CI/CD و استقرار

| فایل | توضیح |
|------|-------|
| `.github/workflows/deploy.yml` 🟢 | GitHub Actions: build ایمیج `linux/amd64` و push به Docker Hub روی هر push به `main`. (build-arg: `NEXT_PUBLIC_APP_URL`). |
| `Dockerfile` 🟢 | بیلد production. |
| `docker-compose.yml` 🟢 | استک repo (app + postgres + redis)؛ reverse proxy production جداگانه مدیریت می‌شود. |

> جزئیات کامل معماری production، HTTPS از طریق CDN، اتصال بله و کاوه‌نگار، و فرایند redeploy در [DEPLOYMENT.md](DEPLOYMENT.md).
