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
| ورود با ربات (Magic Link) | `app/api/bot/bale`, `lib/bot-handler.ts`, `lib/bot.ts`, `lib/magic.ts`, `app/api/auth/magic` |
| ورود مینی‌اپ | `app/api/auth/miniapp`, `lib/miniapp.ts`, `components/auth/MiniAppAutoLogin.tsx` |
| تایمر و جلسهٔ مطالعه | `components/dashboard/StudyTimer.tsx`, `app/api/study/*` |
| گیمیفیکیشن (XP/سکه/سطح/مدال) | `lib/gamification.ts`, `lib/mission.ts`, `lib/streak.ts` |
| ماموریت‌ها | `app/(app)/missions`, `app/api/missions/buy`, `components/missions/MissionCard.tsx` |
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
| زیرساخت/استقرار | `Dockerfile`, `docker-compose.yml`, `.github/workflows/deploy.yml`, `liara.json`, `scripts/vps-setup.sh` |

---

## ۱. ریشه و پیکربندی

| فایل | توضیح |
|------|-------|
| `package.json` | وابستگی‌ها و اسکریپت‌ها (`dev`, `build`, `db:seed`, `test:*`). |
| `next.config.ts` | پیکربندی Next.js 16. |
| `proxy.ts` 🟢 | **میدلور احراز هویت** (در Next.js 16 جایگزین `middleware.ts`). مسیرهای عمومی را رد می‌کند، بقیه نیازمند کوکی JWT‌اند؛ توکن را تمدید خودکار (sliding) می‌کند و هدرهای `x-user-id`/`x-user-phone` را ست می‌کند. |
| `tsconfig.json`, `next-env.d.ts` | پیکربندی TypeScript و alias `@/*`. |
| `eslint.config.mjs`, `postcss.config.mjs` | لینت و PostCSS (Tailwind v4). |
| `prisma.config.ts` | پیکربندی Prisma 7 (مسیر schema و seed). |
| `Dockerfile` 🟢 | بیلد دو مرحله‌ای ایمیج production (Node 22-slim، خروجی `.next`). |
| `docker-compose.yml` 🟢 | استک سرور: `app` + `postgres` + `redis` + `caddy`. |
| `liara.json` | پیکربندی استقرار روی پلتفرم لیارا (PaaS). |
| `.dockerignore`, `.gitignore` | استثناهای build/git (شامل `.next`, `node_modules`, `.env*`). |
| `.env.example`, `.env.local`, `.env.production.example` | الگو و مقادیر متغیرهای محیطی (local و production). |

### مستندات
| فایل | توضیح |
|------|-------|
| `PROJECT.md` | سند جامع فنی/محصولی (استک، دیتابیس، یوزرفلو، فیچرها). |
| `FILES.md` | همین فایل — نقشهٔ کدبیس. |
| `DEPLOYMENT.md` | راهنمای استقرار production (CDN/HTTPS، بله، کاوه‌نگار، redeploy). |
| `ROADMAP.md` | فازها و کارهای آینده. |
| `AGENTS.md` / `CLAUDE.md` | راهنمای ایجنت‌ها (`CLAUDE.md` فقط به `AGENTS.md` اشاره می‌کند). |
| `README.md` | (در حال حاضر boilerplate پیش‌فرض create-next-app). |

---

## ۲. کتابخانهٔ منطق (`lib/`)

### زیرساخت پایه
| فایل | توضیح |
|------|-------|
| `lib/db.ts` 🟢 | کلاینت Prisma (singleton) با driver adapter `@prisma/adapter-pg`. |
| `lib/redis.ts` 🟢 | کلاینت ioredis (singleton) برای OTP و توکن‌های magic. |
| `lib/auth.ts` 🟢 | امضا/اعتبارسنجی JWT با `jose`، کوکی `league_session` (۳۰ روز، sliding refresh)، helperهای سشن سمت سرور. |

### احراز هویت و ورود
| فایل | توضیح |
|------|-------|
| `lib/sms.ts` 🟢 | **ارسال پیامک OTP با کاوه‌نگار** (endpoint `sms/send.json`). از سرور ایران در دسترس است. |
| `lib/magic.ts` 🟢 | توکن یکبارمصرف Magic Link (Redis، TTL ۱۵ دقیقه): `createMagicToken` / `consumeMagicToken`. |
| `lib/bot.ts` 🟢 | کلاینت Bot API برای تلگرام و بله (`sendMessage`, `sendMessageWithButtons`, `setWebhook`, `miniAppButton`). |
| `lib/bot-handler.ts` 🟢 | منطق مشترک پردازش `/start` و `/link`: کاربر را پیدا/می‌سازد و لینک ورود (magic) با دکمه می‌فرستد. |
| `lib/miniapp.ts` 🟡 | اعتبارسنجی HMAC `initData` مینی‌اپ تلگرام/بله (برای ورود خودکار داخل پیام‌رسان). |

### موتور گیمیفیکیشن
| فایل | توضیح |
|------|-------|
| `lib/gamification.ts` 🟢 | قلب منطق: `calcRewards`, `calcLevel` (جدول سطوح + شرط مدال)، پیشنهاد ماموریت، پیام لیدربورد، قوانین هدف روزانه/آنبوردینگ، استریک مؤثر. |
| `lib/mission.ts` 🟢 | چرخهٔ عمر ماموریت (`processUserMissions`) + محاسبهٔ مجدد سطح (`recalcUserLevel`) + شمارش مدال. |
| `lib/onboarding.ts` 🟢 | مسیر آنبوردینگ دوبخشی (دقیقه + ویدیو): وضعیت روز جاری، تکمیل روز، باز کردن ویدیوی پاداش. |
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
| `lib/notification-seed.ts` 🟢 | سه قانون پیش‌فرض (یادآور هدف، خطر زنجیره، افت رتبه)؛ idempotent بر اساس `name`. از `prisma/seed.ts` صدا زده می‌شود. |
| `lib/jobs.ts` 🟢 | اجرای کارهای زمان‌بندی‌شده (`runScheduledJobs`): ماموریت‌ها، تسویهٔ تورنومنت، `notifRules` (موتور قانون)، `ranks` (افت رتبه). با پارامتر `tasks` فرکانس‌پذیر. |
| `lib/socket.ts` ⚪️ | سرور Socket.io — **میراث**؛ فید زنده با SSE کار می‌کند (استفاده نمی‌شود). |

---

## ۳. مسیرهای صفحه (`app/`)

### ریشه و عمومی
| فایل | توضیح |
|------|-------|
| `app/layout.tsx` 🟢 | layout ریشه: فونت Vazirmatn، `dir="rtl"`، Material Symbols، ثبت PWA. |
| `app/page.tsx` 🟢 | صفحهٔ ریشه — ریدایرکت به `/dashboard` یا `/login`. |
| `app/globals.css` 🟢 | توکن‌های طراحی Tailwind v4 در `@theme inline` (رنگ، شیشه، دکمه). |
| `app/login/page.tsx` 🟢 | صفحهٔ ورود: شماره موبایل → OTP. fetch با مسیر نسبی. پشتیبانی از `?mp=` (مینی‌اپ) و `?error=magic`. |

### گروه کاربر `(app)/` — همه پشت احراز هویت + `AppShell`
| فایل | فیچر |
|------|------|
| `app/(app)/layout.tsx` 🟢 | واکشی user، AppShell (Header + BottomNav)، WelcomeSlides، PushRegister. |
| `app/(app)/dashboard/page.tsx` 🟢 | داشبورد: تایمر، پیشرفت ماموریت روزانه، مینی‌لیدربورد، رقبای نزدیک، مسیر آنبوردینگ. |
| `app/(app)/missions/page.tsx` 🟢 | بازارچهٔ ماموریت‌ها (قفل تا پایان آنبوردینگ، خرید با سکه). |
| `app/(app)/feed/page.tsx` 🟢 | بورد زندهٔ فعالیت‌ها (SSE). |
| `app/(app)/leaderboard/page.tsx` 🟢 | لیدربورد هفتگی هم‌سطح + تب «لیگ آزاد» برای cold start. |
| `app/(app)/profile/page.tsx` 🟢 | پروفایل خود: آمار، مدال، ویرایش، خروج، دعوت دوستان. |
| `app/(app)/profile/[id]/page.tsx` 🟢 | پروفایل عمومی دیگران + باز کردن لاگ مطالعه با سکه. |
| `app/(app)/videos/page.tsx` 🟢 | فهرست ویدیوهای آموزشی (باز شدن تدریجی). |
| `app/(app)/videos/[id]/page.tsx` 🟢 | پخش‌کنندهٔ ویدیو (anti-seek + پاداش ۹۰٪). |
| `app/(app)/tournaments/page.tsx` 🟢 | فهرست تورنومنت‌های فعال/آینده. |
| `app/(app)/tournaments/[id]/page.tsx` 🟢 | اتاق تورنومنت + لیدربورد اختصاصی + دکمهٔ شرکت. |

### گروه ادمین `(admin)/` — محافظت دولایه (proxy + `getAdminSession`)
| فایل | فیچر |
|------|------|
| `app/(admin)/admin/layout.tsx` 🟢 | layout ادمین + بررسی نقش `admin` از DB. |
| `app/(admin)/admin/page.tsx` 🟢 | داشبورد ادمین. |
| `app/(admin)/admin/videos/{page,new/page,[id]/page}.tsx` 🟢 | CRUD ویدیو (پایهٔ چندگانه، CTA). |
| `app/(admin)/admin/tournaments/{page,new/page,[id]/page}.tsx` 🟢 | CRUD تورنومنت. |
| `app/(admin)/admin/leaderboard/page.tsx` 🟢 | نمای لیدربورد برای ادمین. |
| `app/(admin)/admin/leads/page.tsx` 🟢 | فهرست/خروجی leadها (اطلاعات تماس کاربران). |

---

## ۴. API (`app/api/`)

### احراز هویت
| مسیر | توضیح |
|------|-------|
| `auth/send-otp` 🟢 | ساخت کد ۶ رقمی در Redis (TTL ۵ دقیقه). در dev کد را برمی‌گرداند؛ در production با **کاوه‌نگار** پیامک می‌کند. |
| `auth/verify-otp` 🟢 | تأیید کد، upsert کاربر، ست کوکی JWT. |
| `auth/logout` 🟢 | پاک کردن کوکی سشن. |
| `auth/magic` 🟢 | مصرف Magic Link ربات → ست کوکی → ریدایرکت `/dashboard`. (ریدایرکت از `APP_PUBLIC_URL` ساخته می‌شود تا پشت CDN درست باشد.) |
| `auth/miniapp` 🟡 | ورود خودکار مینی‌اپ با `initData` امضاشده. |

### ربات
| مسیر | توضیح |
|------|-------|
| `bot/bale` 🟢 | **Webhook بله** (`?secret=...`) → `handleBotUpdate("bale", …)`. مسیر فعال در production. |
| `bot/telegram` 🟡 | Webhook تلگرام (مشابه بله؛ ارسال از ایران به api.telegram.org بلاک است). |
| `bot/magic-link` 🟡 | API برای سرویس ربات مجزا (`bot/`): با `BOT_API_SECRET` لینک ورود می‌سازد. |

### مطالعه و گیمیفیکیشن
| مسیر | توضیح |
|------|-------|
| `study/start` 🟢 | شروع جلسه (بستن جلسات باز قبلی) + رویداد `timer_start`. |
| `study/tick` 🟢 | پاداش هر ۱۵ دقیقه با **اعتبارسنجی سمت سرور** (زمان واقعی منهای pause، سقف `plannedMin`). |
| `study/pause` / `study/resume` 🟢 | مدیریت pause سمت سرور (`pausedSec`). |
| `study/end` 🟢 | پایان جلسه (idempotent) + محاسبهٔ نهایی، سطح، استریک، آنبوردینگ. |
| `missions/buy` 🟢 | خرید ماموریت (کسر سکه، وضعیت `pending`). |
| `videos/[id]/progress` 🟢 | ثبت پیشرفت ویدیو + پاداش ۹۰٪ (۲× در ۲۴ ساعت اول). |
| `profile` 🟢 | `GET` اطلاعات کامل / `PATCH` به‌روزرسانی پروفایل (snapshot هدف روز اول). |
| `profile/[id]/unlock` 🟢 | باز کردن لاگ مطالعهٔ دیگران (۱۰ سکه، ۱ روز). |
| `friends` 🟢 | `GET` کد دعوت + دوستان / `POST` افزودن دوست با کد. |
| `feed/stream` 🟢 | استریم SSE فعالیت‌ها (`broadcastActivity`). |
| `push/subscribe` 🟡 | ثبت/حذف subscription مرورگر برای Web Push. |
| `tournaments/[id]/join` 🟢 | شرکت در تورنومنت (کسر هزینه). |
| `cron/run` 🟢 | اجرای کارهای زمان‌بندی‌شده (محافظت با `Bearer CRON_SECRET`، پارامتر `?tasks=`). |

### ادمین
| مسیر | توضیح |
|------|-------|
| `admin/videos` + `admin/videos/[id]` 🟢 | CRUD ویدیو (فقط ادمین → ۴۰۳). |
| `admin/tournaments` + `admin/tournaments/[id]` 🟢 | CRUD تورنومنت. |
| `admin/leads/export` 🟢 | خروجی CSV از leadها. |

---

## ۵. کامپوننت‌ها (`components/`)

| گروه | فایل‌ها | فیچر |
|------|---------|------|
| `layout/` 🟢 | `AppShell`, `Header`, `BottomNav` | پوستهٔ اپ، نوار بالا (XP/سکه/آواتار)، ناوبری پایین ۵ تب. |
| `dashboard/` 🟢 | `StudyTimer`, `MissionProgress`, `CloseCompetitors` | تایمر مقاوم آفلاین، نوار پیشرفت روزانه، رقبای نزدیک. |
| `onboarding/` 🟢 | `WelcomeSlides`, `OnboardingPath`, `LeadCaptureModal`, `GoalSettingModal` | اسلایدهای خوش‌آمد، مسیر روزانه، فرم اطلاعات اجباری، هدف فردا. |
| `missions/` 🟢 | `MissionCard` | کارت ماموریت با دکمهٔ خرید. |
| `leaderboard/` 🟢 | `Podium`, `LeaderboardList` | سکوی تاپ ۳ + فهرست با focus روی کاربر. |
| `feed/` | `LiveFeed` 🟢, `FeedItem` ⚪️ | فید زنده SSE (`FeedItem` میراث/بلااستفاده). |
| `profile/` 🟢 | `StatsGrid`, `MedalsSection`, `ProfileActions`, `UnlockLogButton` | آمار، مدال‌ها، اکشن‌ها (ویرایش/خروج)، باز کردن لاگ. |
| `videos/` 🟢 | `VideoPlayerClient`, `VideoCard` | پخش HLS با anti-seek + کارت ویدیو. |
| `social/` 🟢 | `InviteFriends` | اشتراک کد دعوت. |
| `tournament/` 🟢 | `JoinButton` | دکمهٔ شرکت در تورنومنت. |
| `push/` 🟡 | `PushRegister`, `NotificationToggle` | ثبت Service Worker و کلید subscription Web Push. |
| `auth/` 🟡 | `MiniAppAutoLogin` | ورود خودکار وقتی اپ داخل مینی‌اپ باز می‌شود. |
| `admin/` 🟢 | `VideoForm`, `AdminVideoRow`, `TournamentForm`, `ExportLeadsButton` | فرم‌ها و ابزار پنل ادمین. |
| `ui/` 🟢 | `Confetti` | انیمیشن کانفتی (level up / مدال). |

---

## ۶. دیتابیس (`prisma/`)

| فایل | توضیح |
|------|-------|
| `prisma/schema.prisma` 🟢 | تعریف همهٔ مدل‌ها (User, StudySession, Mission, UserMission, Medal, UserMedal, Video, VideoProgress, ProfileUnlock, Friendship, ActivityLog, OtpToken, PushSubscription, Tournament و…). |
| `prisma/seed.ts` 🟢 | داده‌های اولیه: مدال‌ها، ماموریت‌ها، ویدیوهای آنبوردینگ. |
| `prisma/migrations/` 🟢 | تاریخچهٔ ۱۰ migration (از `init` تا `engagement_phase`, `push_and_tournament`, `telegram_bale_ids`). |
| `app/generated/prisma/` | کلاینت تولیدشدهٔ Prisma (در `.gitignore`؛ در build با `prisma generate` ساخته می‌شود). |

---

## ۷. PWA و استاتیک (`public/`)

| فایل | توضیح |
|------|-------|
| `public/manifest.json` 🟢 | مانیفست PWA (نام، آیکون، تم). |
| `public/sw.js` 🟡 | Service Worker: نمایش نوتیف Web Push و کلیک. |
| `public/icon-192.png`, `icon-512.png` 🟢 | آیکون‌های PWA. |
| `public/*.svg` ⚪️ | آیکون‌های پیش‌فرض create-next-app (بلااستفاده). |

---

## ۸. سرویس ربات مجزا (`bot/`) 🟡

سرویس Node.js **مستقل** از اپ (long-polling تلگرام). **در production فعلی مستقر نشده** — به‌جای آن بله از طریق webhook داخل خود اپ (`/api/bot/bale`) وصل شده است.

| فایل | توضیح |
|------|-------|
| `bot/index.js` | ربات long-polling: روی `/start` از `/api/bot/magic-link` لینک می‌گیرد و می‌فرستد. |
| `bot/package.json`, `bot/.env.example`, `bot/README.md` | وابستگی، الگوی env، راهنما. |

---

## ۹. اسکریپت‌ها (`scripts/`)

| فایل | توضیح |
|------|-------|
| `scripts/make-admin.ts` 🟢 | ادمین‌کردن یک کاربر با شماره موبایل. |
| `scripts/setup-webhooks.ts` 🟢 | ثبت webhook تلگرام و بله از روی env (`APP_PUBLIC_URL`, `BOT_WEBHOOK_SECRET`). |
| `scripts/test-gamification.ts`, `test-levels.ts`, `test-onboarding.ts` 🟢 | تست‌های منطق گیمیفیکیشن (بدون فریم‌ورک تست، اجرای مستقیم با tsx). |
| `scripts/vps-setup.sh` 🟢 | اسکریپت آماده‌سازی سرور VPS (نصب Docker و وابستگی‌ها). |

---

## ۱۰. CI/CD و استقرار

| فایل | توضیح |
|------|-------|
| `.github/workflows/deploy.yml` 🟢 | GitHub Actions: build ایمیج `linux/amd64` و push به Docker Hub روی هر push به `main`. (build-arg: `NEXT_PUBLIC_APP_URL`). |
| `Dockerfile` 🟢 | بیلد production. |
| `docker-compose.yml` 🟢 | استک سرور (app + postgres + redis + caddy). |
| `liara.json` | پیکربندی PaaS لیارا. |

> جزئیات کامل معماری production، HTTPS از طریق CDN، اتصال بله و کاوه‌نگار، و فرایند redeploy در [DEPLOYMENT.md](DEPLOYMENT.md).
