# مستندات پروژه — اپلیکیشن گیمیفیکیشن مطالعه

> سند فنی و محصولی پروژه. هرچیزی که برای ادامه توسعه لازم است اینجاست: استک، ساختار دیتابیس، یوزر فلو، فیچرها، و گام‌های بعدی.
>
> **آخرین به‌روزرسانی:** خرداد ۱۴۰۵ — **استقرار production زنده** (HTTPS با CDN پارس‌پک، ربات بله، پیامک کاوه‌نگار). فازهای ۱ تا ۲۸ تکمیل (۲۸: ری‌اکشن فید + صندوق نوتیف). نقشهٔ فایل‌ها: [FILES.md](FILES.md) · استقرار: [DEPLOYMENT.md](DEPLOYMENT.md) · کارهای آینده: [ROADMAP.md](ROADMAP.md).

---

## ۱. معرفی محصول

یک وب‌اپلیکیشن **PWA** فارسی و راست‌چین برای **گیمیفیکیشن مطالعه دانش‌آموزان دبیرستانی** (کنکوری‌ها و پایه‌های دهم تا دوازدهم).

ایده اصلی: تبدیل ساعت مطالعه به یک بازی با **XP، سکه، سطح، مدال، ماموریت هفتگی و لیدربورد**. کاربر با تایمر مطالعه می‌کند، امتیاز جمع می‌کند، با دیگران رقابت می‌کند و در یک مسیر آنبوردینگ ۶ روزه آموزش می‌بیند.

---

## ۲. تکنولوژی استک

| لایه | تکنولوژی | نسخه |
|------|-----------|------|
| Framework | Next.js (App Router) + Turbopack | 16.2.9 |
| Runtime | React | 19.2.4 |
| زبان | TypeScript | 5.x |
| استایل | Tailwind CSS (CSS-variable based، بدون `tailwind.config`) | v4 |
| فونت | Vazirmatn (Google Fonts) + Material Symbols | — |
| ORM | Prisma (TypeScript-native client) | 7.8.0 |
| دیتابیس | PostgreSQL | 17 (via DBngin) |
| Cache / OTP | Redis (ioredis) | 5.x |
| Auth | JWT (jose) + OTP موبایل | — |
| Realtime | Server-Sent Events (SSE) | بومی |
| Push | Web Push (web-push + VAPID) + Service Worker | 3.6.x |
| ویدیو | HLS.js | 1.6.x |
| تاریخ | date-fns + locale `faIR` | 4.x |

### نکات مهم استک (تله‌های شناخته‌شده)

- **Prisma v7** دیگر `url` را در `schema.prisma` نمی‌پذیرد. اتصال از طریق **driver adapter** (`@prisma/adapter-pg`) با pattern زیر انجام می‌شود:
  ```ts
  const adapter = new PrismaPg(process.env.DATABASE_URL!); // رشته مستقیم، نه { connectionString }
  const prisma = new PrismaClient({ adapter });
  ```
- کلاینت Prisma به `app/generated/prisma/` تولید می‌شود؛ import از `@/app/generated/prisma/client`.
- **Next.js 16**: فایل `middleware.ts` منسوخ شده و به `proxy.ts` با تابع `export async function proxy()` تغییر کرده است.
- **Tailwind v4**: توکن‌های رنگ و طراحی در `app/globals.css` داخل بلوک `@theme inline { }` تعریف می‌شوند، نه فایل JS.

---

## ۳. راه‌اندازی محیط توسعه (Local)

### پیش‌نیازها (DBngin)
در DBngin دو سرور باید روشن باشند:
- **PostgreSQL** روی پورت `5432` (user: `postgres`، بدون پسورد)
- **Redis** روی پورت `6379`

دیتابیس `league_db` باید داخل PostgreSQL ساخته شده باشد:
```bash
/Users/Shared/DBngin/postgresql/17.0/bin/psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE league_db;"
```

### متغیرهای محیطی (`.env.local`)
```env
DATABASE_URL="postgresql://postgres@localhost:5432/league_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="league-gamification-super-secret-jwt-key-2024-change-me"
JWT_EXPIRES_IN="7d"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
OTP_EXPIRY_SECONDS=300
```
> ⚠️ توجه: `.env.local` بر `.env` اولویت دارد. هر دو باید هماهنگ باشند.

### دستورات
```bash
npm run dev          # سرور توسعه روی http://localhost:3000
npm run build        # بیلد production
npm run db:seed      # پر کردن مدال‌ها، ماموریت‌ها و ویدیوهای نمونه
npm run db:studio    # Prisma Studio برای مشاهده دیتابیس
npx prisma generate  # تولید مجدد کلاینت بعد از تغییر schema
npx prisma migrate dev --name <name>  # ساخت migration جدید
```

---

## ۴. ساختار دیتابیس (Prisma Schema)

### مدل‌ها

#### `User` — کاربر
| فیلد | نوع | توضیح |
|------|-----|-------|
| `id` | String (cuid) | شناسه |
| `phone` | String (unique) | شماره موبایل (فرمت `0XXXXXXXXXX`) |
| `name`, `grade`, `field` | String? | اطلاعات lead capture (نام، پایه، رشته) |
| `avatarUrl` | String? | آواتار |
| `xp` | Int | امتیاز تجربه |
| `coins` | Int | سکه |
| `level` | String | سطح فعلی (تازه‌نفس، ثابت‌قدم، ...) |
| `stars` | Int | ستاره داخل سطح (۱ تا ۳) |
| `onboardingDay` | Int | روزهای **تکمیل‌شده** مسیر ۶ روزه (۰ تا ۶) |
| `onboardingStepMinutes` | Int | دقایق انباشته روز جاری (روز با رسیدن به هدف تایید می‌شود) |
| `nextStudyTarget` | DateTime? | هدف زمان مطالعه فردا |
| `isLeadComplete` | Boolean | آیا فرم اطلاعات تکمیل شده |
| `hasSeenIntro` | Boolean | آیا اسلایدهای welcome دیده شده |
| `pastAvgStudyHours` | Float? | میانگین ساعت مطالعه گذشته (از پرسش آنبوردینگ) — مبنای هدف روزانه |
| `day1GoalMinutes` | Int? | **snapshot** هدف روز اول (هنگام پاسخ به پرسش میانگین، طبق قانون ساعت ۱۷/۲۱) تا در طول روز ثابت بماند |
| `streak` | Int | زنجیره روزهای متوالی مطالعه |
| `lastStudyDate` | DateTime? | آخرین روز (۰۰:۰۰) با جلسه — مبنای محاسبه streak |
| `referralCode` | String? (unique) | کد دعوت دوستان |
| `role` | String | `user` یا `admin` (پیش‌فرض `user`) |
| ایندکس‌ها | `xp`, `level` | برای لیدربورد و رتبه‌بندی |

#### `StudySession` — جلسه مطالعه
`startTime`, `endTime`, `durationMin`, `xpEarned`, `coinsEarned` + فیلدهای ضدتقلب: `plannedMin` (مدت انتخابی تایمر = سقف پاداش)، `tickCount` (تعداد پاداش‌های ۱۵دقیقه‌ای پرداخت‌شده)، `pausedSec`/`pausedAt` (مدیریت pause سمت سرور). مدت واقعی = `endTime − startTime − pausedSec` با سقف `plannedMin`.

#### `Mission` / `UserMission` — ماموریت‌ها
- `Mission`: تعریف ماموریت (هدف ساعت هفتگی، حداقل میانگین، هزینه سکه، جایزه XP، مدال مرتبط).
- `UserMission`: ماموریت خریداری‌شده با `activatesAt` (ابتدای روز بعد)، `expiresAt` (۷ روز بعد از فعال‌سازی)، `status` (`pending`/`active`/`completed`/`failed`). چرخه عمر در `lib/mission.ts`.

#### `Medal` / `UserMedal` — مدال‌ها
`Medal` بر اساس `targetHours` (۲۰ تا ۷۰ ساعت، یکتا). `UserMedal` رکورد کسب مدال (تکرارپذیر — هر تکمیل ماموریت یک رکورد جدید).

#### `Video` / `VideoProgress` — ویدیوهای آنبوردینگ
- `Video`: `title`, `day` (روز مسیر؛ طول مسیر = بیشترین `day` فعال)، `durationMin`, `hlsUrl`, `thumbnailUrl`, `grades String[]` (پایه‌های هدف؛ خالی = همه)، `ctaLabel`/`ctaUrl` (دکمه CTA زیر ویدیو)، `isActive`.
- `VideoProgress`: `watchedSeconds`, `completed`, `rewardGiven`, `unlockedAt` (مبنای جایزه ۲× تماشای سریع در ۲۴ ساعت). یکتا بر `[userId, videoId]`.

#### `ProfileUnlock` — باز کردن لاگ مطالعه دیگران
`viewerId`, `targetUserId`, `expiresAt` (۱ روز). یکتا بر `[viewerId, targetUserId]`. هزینه ۱۰ سکه (`PROFILE_UNLOCK_COST`).

#### `Friendship` — دوستی دوطرفه (رفرال)
یک رکورد برای هر جفت با کلید مرتب‌شده `[userId, friendId]`. کوئری دوستان با `OR` روی دو ستون (`lib/referral.ts`).

#### `ActivityLog` — فید فعالیت‌ها
`type` (`timer_start`, `session_complete`, `mission_buy`, `medal_earn`, `level_up`, `streak`, `video_complete`)، `metadata` (JSON). ایندکس نزولی روی `createdAt` برای فید زنده.

#### `Reaction` — واکنش روی آیتم فید
`actorId` (واکنش‌دهنده)، `activityId`، `targetUserId` (صاحب آیتم، denormalized)، `emoji`. یکتا بر `[actorId, activityId]` (هر کاربر یک واکنش روی هر آیتم، قابل تغییر/برداشتن). منطق در `lib/reaction.ts`.

#### `InboxItem` — صندوق پیام/نوتیف
`userId` (گیرنده)، `type` (`reaction` / `reaction_reward` / `system` / `message`)، `actorId?`، `body?` (برای DM آینده)، `metadata` (JSON)، `read`. ایندکس‌ها روی `[userId, read]` و `[userId, createdAt desc]`. منطق در `lib/inbox.ts`. (مدل عمداً برای توسعه به پیام خصوصی آماده شده؛ DM فعلاً ساخته نشده — ریسک مودریشن کاربر زیر سن قانونی.)

#### `OtpToken` — کد یکبارمصرف
`phone` (PK)، `code`، `expiresAt`. (همچنین در Redis با TTL نگهداری می‌شود — Redis منبع اصلی اعتبارسنجی است.)

---

## ۵. موتور گیمیفیکیشن (`lib/gamification.ts`)

### قانون پایه پاداش
```
هر ۱۵ دقیقه مطالعه = ۱ XP + ۱ سکه
```

### جدول سطوح (`LEVEL_TABLE`) — دقیق، مطابق PRD
۵ سطح اصلی، هرکدام تا ۳ ستاره (الگو: یک‌ستاره + فوق‌ستاره). ارتقاء نیازمند **هم XP و هم مدال** است.
مدال‌های یک سطح با **«و» (AND)** لازم‌اند (همه با هم). تست: `npm run test:levels`.

| سطح | ستاره | XP | مدال لازم |
|-----|------|-----|-----------|
| تازه‌نفس | ⭐ / ⭐⭐ / ⭐⭐⭐ | ۸ / ۳۰ / ۶۰ | — |
| ثابت‌قدم | ⭐ | ۲۰۰ | مدال ۲۰ |
| ثابت‌قدم | ⭐⭐ | ۵۰۰ | مدال ۲۵ **و** ۳۰ |
| ثابت‌قدم | ⭐⭐⭐ | ۸۰۰ | مدال ۳۵ |
| پیشرو | ⭐ | ۱۲۰۰ | ۲×مدال ۳۵ **و** ۱×مدال ۴۰ |
| پیشرو | ⭐⭐ | ۱۸۰۰ | ۳×مدال ۴۰ |
| پیشرو | ⭐⭐⭐ | ۲۵۰۰ | ۳×مدال ۴۵ |
| سرآمد | ⭐ | ۳۵۰۰ | مدال ۵۰ **و** ۵۳ |
| سرآمد | ⭐⭐ | ۴۵۰۰ | مدال ۵۶ **و** ۶۰ |
| سرآمد | ⭐⭐⭐ | ۶۰۰۰ | مدال ۶۳ **و** ۶۶ |
| الگو | ⭐ | مهم نیست | مدال ۷۰ |
| الگو | فوق‌ستاره | مهم نیست | ۲×مدال ۷۰ |

> ساختار داده `requiredMedals` به‌صورت OR-of-AND است (انعطاف آینده)، ولی فعلاً هر سطح یک گروه «و» دارد.

### جدول ماموریت‌ها (`MISSION_TABLE`)
۱۳ ماموریت از ۲۰ تا ۷۰ ساعت هفتگی. هرکدام: `minAvgHours` (شرط نمایش)، `entryCost` (سکه)، `xpReward`.
مثال: ۲۰ ساعت → هزینه ۲۵ سکه، جایزه ۴۰ XP. تا ۷۰ ساعت → هزینه ۲۵۰ سکه، جایزه ۱۰۰۰ XP.

### توابع کلیدی (`lib/gamification.ts`)
- `calcRewards(minutes)` → `{ xp, coins }`
- `calcLevel(xp, medals)` → `{ level, stars }` (OR-of-AND مدال‌ها)
- `getNextLevelRequirement(xp, medals)` → سطح بعدی + XP لازم + مدال‌های کم (برای نوار پیشرفت پروفایل)
- `suggestMissions(avgHoursPerDay)` → ۳ ماموریت پیشنهادی
- `getLeaderboardMessage(rank, total, levelName)` → پیام داینامیک بر اساس رتبه بین هم‌سطح‌ها
- `getFullDay1Hours(pastAvg)` / `getDay1MissionHours(pastAvg, hourOfDay)` → هدف روز اول (قانون ساعت: <۱۷ کامل، ۱۷–۲۱ نصف، >۲۱ یک ساعت)
- `getOnboardingDailyGoalMinutes(day, pastAvg, day1GoalMinutes)` → هدف روزانه (روز اول از snapshot، بعد +۳۰ دقیقه)
- `effectiveStreak(streak, lastStudyDate)` → استریک با احتساب شکست (آخرین مطالعه قبل از دیروز = ۰)
- `PROFILE_UNLOCK_COST` → هزینه باز کردن لاگ دیگران (۱۰ سکه)

### چرخه عمر ماموریت و سطح (`lib/mission.ts`)
- `processUserMissions(userId)` → فعال‌سازی pendingها، بررسی تکمیل + اعطای XP/مدال، منقضی کردن.
- `recalcUserLevel(userId)` → محاسبه مجدد سطح + ثبت `level_up` در فید هنگام ارتقا.
- `getUserMedalCounts(userId)` → شمارش مدال‌ها برای `calcLevel`.

### آنبوردینگ دوبخشی (`lib/onboarding.ts`)
- `getOnboardingTotalDays()` → طول مسیر = بیشترین `day` ویدیوهای فعال (پیش‌فرض ۶).
- `getOnboardingState(userId)` → وضعیت روز جاری: هدف دقیقه، ویدیوی روز، باز/دیده‌شدن.
- `tryCompleteOnboardingDay(userId)` → روز را وقتی **هم دقیقه‌ها هم ویدیو** کامل شد جلو می‌برد؛ با پر شدن دقیقه‌ها ویدیوی روز را باز می‌کند (`unlockedAt`). بدون ویدیو برای آن روز/پایه، دقیقه‌ها کافی است.

### استریک (`lib/streak.ts`)
- `applyStreak(userId)` → در پایان هر جلسه: حفظ/+۱/ریست زنجیره؛ ثبت رویداد `streak` در فید روی نقاط عطف ۳ و ۶ روزه.

### دعوت دوستان (`lib/referral.ts`)
- `ensureReferralCode(userId)` → کد دعوت یکتا (lazy).
- `addFriendByCode(userId, code)` → دوستی دوطرفه (رد خوداضافه/تکرار).
- `getFriendIds(userId)` → شناسه همه دوستان (هر دو جهت).

### واکنش فید و صندوق (`lib/reaction.ts` + `lib/inbox.ts`)
- `REACTION_EMOJIS` (🔥 👏 💪 ❤️ 🎯)، `toggleReaction(actorId, activityId, emoji)` → افزودن/تغییر/برداشتن + اعلان به گیرنده (صندوق + Web Push) + بررسی جایزه.
- `getReactionsForActivities(ids, meId)` → شمارش‌ها + واکنش خودِ کاربر (برای رندر فید).
- **جایزه‌ی روزانه‌ی تشویق**: واکنش به `REACTION_REWARD_TARGETS` (=۵) نفرِ متفاوت در یک روزِ تهران → یک‌بار `REACTION_REWARD_COINS` (=۵) سکه. idempotent با چک کردن آیتم `reaction_reward` امروزِ صندوق.
- `lib/inbox.ts`: `createInboxItem`، `getUnreadCount` (نشان زنگوله)، `listInbox`، `markAllRead`.

---

## ۶. یوزر فلو (User Flow)

```
ورود (/login)
  │  وارد کردن شماره موبایل
  ▼
POST /api/auth/send-otp ──► کد ۶ رقمی در Redis (TTL 300s)
  │  (در dev کد در پاسخ JSON برمی‌گردد: _dev_otp)
  ▼
وارد کردن کد ──► POST /api/auth/verify-otp
  │  upsert کاربر + ست شدن کوکی JWT (league_session, httpOnly, 7d)
  ▼
داشبورد (/dashboard)
  ├─ مسیر آنبوردینگ ۶ روزه (تا onboardingDay < 6)
  ├─ تایمر مطالعه (۳۰/۶۰/۹۰/۱۲۰ دقیقه)
  │    ├─ شروع → POST /api/study/start (ثبت startTime + localStorage)
  │    ├─ هر ۱۵ دقیقه → POST /api/study/tick (۱ XP + ۱ سکه فوری)
  │    └─ پایان → POST /api/study/end (محاسبه نهایی + بررسی سطح + لاگ فعالیت)
  │         │
  │         ├─ اگر اولین جلسه → LeadCaptureModal (نام/پایه/رشته اجباری)
  │         └─ سپس → GoalSettingModal (فردا ساعت چند شروع می‌کنی؟)
  ▼
سایر تب‌ها (BottomNav):
  /missions    → بازارچه ماموریت (قفل تا روز ۶، خرید با سکه)
  /feed        → بورد زنده فعالیت‌ها (SSE real-time)
  /leaderboard → لیدربورد هفتگی (XP هفت روز اخیر، سکوی تاپ ۳)
  /profile     → آمار، مدال‌ها، ویرایش پروفایل، خروج
  /videos      → ویدیوهای آموزشی (باز شدن تدریجی بر اساس onboardingDay)
```

### محافظت از مسیرها (`proxy.ts`)
- مسیرهای عمومی: `/login`، `/api/auth/send-otp`، `/api/auth/verify-otp`، فایل‌های استاتیک.
- بقیه نیازمند کوکی JWT معتبر؛ در غیر این صورت redirect به `/login`.
- هدرهای `x-user-id` و `x-user-phone` روی درخواست‌های احرازشده ست می‌شوند.

---

## ۷. فیچرهای پیاده‌سازی‌شده (فاز ۱ تا ۱۷)

| # | فیچر | وضعیت | فایل‌های کلیدی |
|---|------|-------|----------------|
| ۱ | Setup + Tailwind + Prisma | ✅ | `globals.css`, `schema.prisma` |
| ۲ | احراز هویت OTP + JWT | ✅ | `lib/auth.ts`, `app/api/auth/*`, `app/login/page.tsx` |
| ۳ | Layout (Header، BottomNav، RTL) | ✅ | `components/layout/*` |
| ۴ | داشبورد + تایمر مقاوم آفلاین | ✅ | `StudyTimer.tsx`, `app/api/study/*` |
| ۵ | موتور گیمیفیکیشن | ✅ | `lib/gamification.ts` |
| ۶ | آنبوردینگ + Lead Capture | ✅ | `components/onboarding/*` |
| ۷ | بازارچه ماموریت‌ها | ✅ | `MissionCard.tsx`, `app/api/missions/buy` |
| ۸ | لیدربورد | ✅ | `Podium.tsx`, `LeaderboardList.tsx` |
| ۹ | بورد زنده (SSE) | ✅ | `app/api/feed/stream`, `LiveFeed.tsx` |
| ۱۰ | ویدیو + anti-seek | ✅ | `VideoPlayerClient.tsx` |
| ۱۱ | صفحه پروفایل | ✅ | `ProfileActions.tsx`, `StatsGrid.tsx`, `MedalsSection.tsx` |
| ۱۲ | PWA (manifest + icons) | ✅ | `public/manifest.json`, `public/icon-*.png` |
| **۱۳** | **حلقه کامل گیمیفیکیشن** | ✅ | `lib/mission.ts` (تکمیل ماموریت، مدال، level_up) |
| **۱۴** | **آنبوردینگ کامل + welcome** | ✅ | `WelcomeSlides.tsx`؛ تایید روز با تکمیل هدف کامل |
| **۱۵** | **لیدربورد هم‌سطح + فید ۲۰۰** | ✅ | `leaderboard/page.tsx` (فیلتر `level`) |
| **۱۶** | **پروفایل عمومی + قفل لاگ** | ✅ | `profile/[id]/page.tsx`, `UnlockLogButton.tsx` |
| **۱۷** | **ویدیوی چندپایه + پنل ادمین** | ✅ | `app/(admin)/*`, `VideoForm.tsx` (`grades[]`) |

### جزئیات قابل‌توجه پیاده‌سازی
- **تایمر مقاوم آفلاین**: مدت زمان از `startTime` محاسبه می‌شود نه شمارنده؛ در `localStorage` ذخیره و در reload بازیابی می‌شود.
- **تایید روز آنبوردینگ**: روز فقط وقتی پیش می‌رود که `onboardingStepMinutes` (انباشت پیوسته، نه تقویمی) به هدف آن روز برسد. ویدیوی پاداش فقط آن‌وقت باز می‌شود.
- **حلقه ماموریت**: خرید (`pending`، سکه کسر) → فعال از روز بعد (`active`) → تکمیل با رسیدن به ساعت هدف (`completed` + XP + مدال + فید) → یا انقضا (`failed`، سکه سوخته). همه در `lib/mission.ts`.
- **بورد زنده با SSE**: `broadcastActivity()` در `app/api/feed/stream/route.ts` به subscriberها push می‌کند. هنگام جلسه، خرید ماموریت، مدال، و ارتقای سطح فراخوانی می‌شود.
- **لیدربورد هم‌سطح**: هرکس فقط با کاربران هم‌`level` خودش رقابت می‌کند (شامل تازه‌نفس).
- **Anti-seek ویدیو**: کاربر نمی‌تواند جلوتر از بیشترین نقطه دیده‌شده برود. جایزه ۱۵ سکه در ۹۰٪ تماشا.
- **پنل ادمین**: route group `(admin)` با محافظت دو لایه (`proxy.ts` احراز هویت + `getAdminSession()` بررسی نقش از DB). CRUD ویدیو با انتخاب پایه چندگانه (`grades String[]`).

---

## ۸. ساختار پوشه‌ها

```
league_proj_new/
├── app/
│   ├── (app)/                  # گروه احرازشده کاربر (با AppShell)
│   │   ├── layout.tsx          # واکشی user + AppShell + WelcomeSlides
│   │   ├── dashboard/page.tsx
│   │   ├── missions/page.tsx
│   │   ├── feed/page.tsx
│   │   ├── leaderboard/page.tsx
│   │   ├── profile/{page, [id]/page}.tsx   # پروفایل خود + عمومی دیگران
│   │   └── videos/{page, [id]/page}.tsx
│   ├── (admin)/                # گروه ادمین (layout با getAdminSession)
│   │   └── admin/{page, videos/{page, new/page, [id]/page}}.tsx
│   ├── api/
│   │   ├── auth/{send-otp, verify-otp, logout}/route.ts
│   │   ├── study/{start, end, tick}/route.ts
│   │   ├── missions/buy/route.ts
│   │   ├── feed/stream/route.ts            # SSE
│   │   ├── profile/route.ts                # GET + PATCH
│   │   ├── profile/[id]/unlock/route.ts    # باز کردن لاگ با سکه
│   │   ├── admin/videos/{route, [id]/route}.ts  # CRUD ویدیو (ادمین)
│   │   └── videos/[id]/progress/route.ts
│   ├── generated/prisma/       # کلاینت تولیدشده Prisma
│   ├── login/page.tsx
│   ├── layout.tsx              # ریشه: فونت، RTL، Material Symbols
│   ├── page.tsx                # ریدایرکت ریشه
│   └── globals.css             # توکن‌های Tailwind v4
├── components/
│   ├── layout/{AppShell, Header, BottomNav}.tsx
│   ├── dashboard/{StudyTimer, MissionProgress, CloseCompetitors}.tsx
│   ├── onboarding/{WelcomeSlides, OnboardingPath, LeadCaptureModal, GoalSettingModal}.tsx
│   ├── missions/MissionCard.tsx
│   ├── leaderboard/{Podium, LeaderboardList}.tsx
│   ├── feed/{LiveFeed, FeedItem}.tsx
│   ├── profile/{StatsGrid, MedalsSection, ProfileActions, UnlockLogButton}.tsx
│   ├── videos/{VideoPlayerClient, VideoCard}.tsx
│   └── admin/{VideoForm, AdminVideoRow}.tsx
├── lib/{db, redis, auth, gamification, mission, socket}.ts
├── prisma/{schema.prisma, seed.ts, migrations/}
├── scripts/{make-admin, test-gamification, test-levels, test-onboarding}.ts
├── public/{manifest.json, icon-192.png, icon-512.png}
├── proxy.ts                    # میدلور احراز هویت (Next.js 16)
└── .env / .env.local
```

> `lib/socket.ts` و `components/feed/FeedItem.tsx` بلااستفاده‌اند (بورد زنده با SSE/LiveFeed کار می‌کند).

---

## ۹. API Reference

| متد | مسیر | بدنه | توضیح |
|-----|------|------|-------|
| POST | `/api/auth/send-otp` | `{ phone }` | ارسال کد (در dev: `_dev_otp` در پاسخ) |
| POST | `/api/auth/verify-otp` | `{ phone, code }` | تأیید + کوکی JWT |
| POST | `/api/auth/logout` | — | پاک کردن کوکی |
| GET | `/api/profile` | — | اطلاعات کامل کاربر |
| PATCH | `/api/profile` | `{ name?, grade?, field?, nextStudyTarget?, hasSeenIntro?, pastAvgStudyHours? }` | به‌روزرسانی + ست `isLeadComplete`؛ با `pastAvgStudyHours` هدف روز اول snapshot می‌شود |
| POST | `/api/profile/[id]/unlock` | — | باز کردن لاگ مطالعه کاربر (۱۰ سکه، ۱ روز) |
| POST | `/api/study/start` | `{ durationMin }` | شروع جلسه (بستن جلسات باز قبلی) + رویداد `timer_start` → `{ sessionId }` |
| POST | `/api/study/tick` | `{ sessionId }` | پاداش هر ۱۵ دقیقه — **اعتبارسنجی سرور**: زمان واقعی منهای pause، سقف `plannedMin`، فقط مابه‌التفاوت → `{ granted }` |
| POST | `/api/study/pause` | `{ sessionId }` | ثبت شروع pause سمت سرور |
| POST | `/api/study/resume` | `{ sessionId }` | پایان pause → افزودن مدت به `pausedSec` |
| POST | `/api/study/end` | `{ sessionId }` | پایان (idempotent، رد جلسه بسته) + نتیجه (XP، `dayCompleted`، `needsVideo`، `rewardVideo`، `streak`، `streakMilestone`، ...) |
| POST | `/api/missions/buy` | `{ missionId }` | خرید ماموریت (وضعیت `pending`) |
| POST | `/api/videos/[id]/progress` | `{ watchedSeconds, totalSeconds }` | ثبت پیشرفت + جایزه ۹۰٪ (۲× اگر در ۲۴ ساعت اول) + احتمال تکمیل روز آنبوردینگ |
| GET | `/api/feed/stream` | — | SSE stream فعالیت‌ها |
| POST | `/api/feed/[id]/react` | `{ emoji }` | افزودن/تغییر/برداشتن واکنش روی آیتم فید → `{ action, myEmoji, counts, rewardGranted }` |
| GET | `/api/inbox` | — | فهرست صندوق + تعداد نخوانده‌ها |
| POST | `/api/inbox/read` | — | علامت‌گذاری همه‌ی نخوانده‌ها به‌عنوان خوانده‌شده |
| GET | `/api/friends` | — | کد دعوت من + فهرست دوستان |
| POST | `/api/friends` | `{ code }` | افزودن دوست با کد دعوت |
| POST | `/api/admin/videos` | فیلدهای ویدیو + `grades[]` + `ctaLabel`/`ctaUrl` | ساخت ویدیو (فقط ادمین → ۴۰۳) |
| PATCH/DELETE | `/api/admin/videos/[id]` | — | ویرایش/حذف ویدیو (فقط ادمین) |

### اسکریپت‌ها (`package.json`)
- `npm run db:seed` — مدال‌ها، ماموریت‌ها، ویدیوهای آنبوردینگ
- `npm run test:gamification` / `test:levels` / `test:onboarding` — تست‌های منطق
- `npx tsx scripts/make-admin.ts 0912XXXXXXX` — ادمین‌کردن یک کاربر

---

## ۱۰. استقرار (Production) و گام‌های بعدی

فازهای ۱ تا ۲۷ تکمیل شده‌اند و اپ **روی سرور زنده است**: `https://app.ayandetalayee.ir`.

> 🚀 جزئیات کامل استقرار (معماری CDN/HTTPS، اتصال بله، کاوه‌نگار، فرایند redeploy و عیب‌یابی) در [DEPLOYMENT.md](DEPLOYMENT.md).
> 🗺️ نقشهٔ کامل فایل‌های کدبیس در [FILES.md](FILES.md).

### انجام‌شده در استقرار ✅
- **HTTPS واقعی**: TLS در لبهٔ CDN پارس‌پک (داخل ایران) با گواهی معتبر Let's Encrypt؛ مبدأ با Caddy `tls internal`.
- **ربات بله**: webhook مستقیم در اپ (`/api/bot/bale`)؛ ورود seamless با Magic Link.
- **پیامک OTP**: کاوه‌نگار (`lib/sms.ts`) — در production کد واقعی پیامک می‌شود.

### باقی‌مانده
- **تست واقعی OTP پیامکی** (مصرف اعتبار کاوه‌نگار).
- **کلیدهای VAPID**: `npx web-push generate-vapid-keys` و قرار دادن در env تا Web Push فعال شود.
- **اتصال cron واقعی** به `POST /api/cron/run` (با `?tasks=...` برای فرکانس‌های مختلف: `reminders` هر چند دقیقه، `streakRisk` عصرها، `ranks` ساعتی).
- **تلگرام**: ارسال از سرور ایران بلاک است؛ نیازمند relay خارج از ایران یا سرویس `bot/`.
- جابه‌جایی دامنهٔ نهایی به `Gcamp.ir`.
- موارد کوچک معوق: فالوآپ زمان‌بندی‌شده ادمین (۱۹.۵)، انیمیشن‌های Framer Motion.

### خلاصه فازهای ۲۰ تا ۲۷
- **۲۰**: امنیت `tick`، pause واقعی، قانون ساعت ورود ۱۷/۲۱، رقبای نزدیک و مینی‌لیدربورد بر اساس XP هفتگی هم‌سطح.
- **۲۱**: استریک (`lib/streak.ts`)، رویدادهای جدید فید (`timer_start`, `streak`, `video_complete`)، جایزه لحظه‌ای شناور روی تایمر.
- **۲۲**: ویدیو در حلقه روزانه (`lib/onboarding.ts`)، سکه ۲× تماشای سریع، طول مسیر منعطف، ویدیوهای قفل، CTA ادمین.
- **۲۳**: توکن‌های رنگ `@theme`، کانفتی (`components/ui/Confetti.tsx`)، تایمر فشرده، شرط مدال در پیشرفت سطح، safe-area، ساعت دلخواه.
- **۲۴**: دعوت دوستان (`lib/referral.ts` + `/api/friends` + تب «دوستان»)، cold start با «لیگ آزاد».
- **۲۵**: Magic Link (`lib/magic.ts`, `/api/auth/magic`, `/api/bot/magic-link`) + سرویس ربات مجزا در `bot/`.
- **۲۶**: Web Push (`lib/push.ts`, `public/sw.js`, `PushSubscription`, `/api/push/subscribe`, `PushRegister`/`NotificationToggle`).
- **۲۷**: نوتیف رقابتی (`lib/notifications.ts`) + تورنومنت (`lib/tournament.ts`, پنل ادمین + صفحات کاربر + تسویه در cron).
- **۲۸**: تعامل اجتماعی فید — ری‌اکشن روی آیتم‌های فید (`Reaction`, `lib/reaction.ts`, نوار واکنش در `LiveFeed` با به‌روزرسانی خوش‌بینانه)، صندوق نوتیف (`InboxItem`, `lib/inbox.ts`, آیکون زنگوله‌ی هدر + صفحه‌ی `/inbox`)، اعلان واکنش با Web Push، و جایزه‌ی روزانه‌ی تشویق (۵ نفر/روز = ۵ سکه). مدل صندوق آماده‌ی توسعه به پیام خصوصی (DM).

---

## ۱۱. بدهی فنی و نکات نگهداری

- **`lib/socket.ts`** باقیمانده از تصمیم اولیه Socket.io است و استفاده نمی‌شود (فید با SSE کار می‌کند).
- **`OtpToken` در دیتابیس**: Redis منبع اصلی اعتبارسنجی OTP است؛ جدول دیتابیس backup/audit است.
- **تب «لیگ آزاد» (cold start)**: وقتی پایگاه کاربر بزرگ شد، آستانه `MIN_LEAGUE_SIZE` در `leaderboard/page.tsx` بازبینی شود.
- **هماهنگی env**: `.env` و `.env.local` باید همگام باشند (`.env.local` اولویت دارد). اسکریپت‌های مستقیم `tsx` ممکن است `.env` را بخوانند.
- **`app/generated/prisma/`** بهتر است در `.gitignore` باشد و در CI با `prisma generate` ساخته شود.
- **migration شبح**: یک migration ناموفق `20260612110000_product_review_schema` (که روی دیسک نبود) در DB پیدا و rolled-back شد — احتمالاً از یک session موازی. اگر دوباره دیده شد، با `prisma migrate resolve` رفع شود.
```
