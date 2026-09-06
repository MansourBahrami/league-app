# بررسی تجربه کاربری (UX) — G-camp

**تاریخ:** ۱۴۰۵/۰۶/۰۳

---

## ۱. مسیرها و صفحات

### صفحات بررسی‌شده

| مسیر | کاربرد | وضعیت |
|-------|--------|-------|
| `/login` | ورود با OTP | ✅ |
| `/dashboard` | صفحه اصلی و تایمر | ⚠️ باگ بحرانی |
| `/leaderboard` | جدول‌برتر | ✅ |
| `/profile` | پروفایل کاربر | ✅ |
| `/mission-rooms` | اتاق مأموریت‌ها | ✅ |
| `/mission-rooms/[id]` | جزئیات مأموریت | ✅ |
| `/videos` | ویدیوهای آموزشی | ✅ |
| `/inbox` | صندوق پیام | ⚠️ مشکل ناوبری |

### Loading و Skeleton

- ✅ `loading.tsx` با Skeleton UI مناسب (`StudyTimerFallback`, `FocusPulseFallback`)
- ✅ Suspense boundaries در `dashboard/page.tsx`

---

## ۲. ناوبری

### BottomNav
- ✅ Fixed در پایین با پشتیبانی safe-area
- ✅ ۵ تب اصلی با highlight فعال

### مشکلات ناوبری

#### 🟡 مشکل ۱: صفحه Inbox بدون دکمه بازگشت
- **فایل:** `app/(app)/inbox/page.tsx`
- **توضیح:** وقتی کاربر از طریق آیکون زنگ هدر به `/inbox` می‌رود، هیچ دکمه بازگشتی
  وجود ندارد و BottomNav حالت فعال خود را از دست می‌دهد. کاربر باید حدس بزند که روی
  یکی از آیتم‌های BottomNav بزند.
- **مقایسه:** صفحه `/mission-rooms/[id]` یک دکمه بازگشت سفارشی (`arrow_forward`) در
  هدر دارد. این الگو باید در همه صفحات تودرتو یکسان باشد.

---

## ۳. فرم‌ها و ورودی‌ها

### صفحه ورود (`app/login/page.tsx`)
- ✅ `type="tel"` و `inputMode="numeric"` با `dir="ltr"` برای کیبورد عددی
- ✅ نرمال‌سازی ارقام فارسی به انگلیسی (`normalizeDigits`)
- ✅ غیرفعال شدن دکمه و نمایش «در حال ارسال/بررسی» حین API call

#### 🟡 مشکل ۲: از دست رفتن state هنگام reload
- اگر کاربر صفحه را در مرحله OTP ریلود کند، state از دست می‌رود و به مرحله ورود
  شماره برمی‌گردد. باید مرحله در `sessionStorage` ذخیره شود.

### ویرایش پروفایل (`components/profile/ProfileActions.tsx`)
- ✅ مدال با قفل اسکرول body
- ✅ Trap focus درون dialog (Tab/Shift+Tab)
- ✅ بستن با Escape
- ✅ غیرفعال شدن دکمه ذخیره بر اساس `canSave`

---

## ۴. تایمر مطالعه — باگ‌های بحرانی

### 🔴 باگ ۱: شکست شبکه هنگام توقف تایمر
- **فایل:** `components/dashboard/StudyTimer.tsx`
- **توضیح:** وقتی کاربر «توقف و ثبت» را می‌زند و fetch به `/api/study/end` شکست
  می‌خورد، تابع `endSession` خطا را بی‌صدا catch می‌کند و return می‌شود. UI به حالت
  idle برمی‌گردد و session ID از state پاک می‌شود، **اما `localStorage.removeItem`
  هرگز فراخوانی نمی‌شود.** اگر کاربر صفحه را ریفرش کند، تایمر سشن قبلی را از
  `localStorage` بازیابی می‌کند و اپ در حالت شکسته قرار می‌گیرد.
- **راه‌حل:** در catch block، یا localStorage پاک شود، یا به کاربر خطا نمایش داده
  شود و UI به idle برنگردد تا بتواند دوباره تلاش کند.

### 🔴 باگ ۲: انقضای تایمر در پس‌زمینه بدون ثبت XP
- **فایل:** `lib/study-timer-storage.ts`
- **توضیح:** اگر کاربر مرورگر را وسط سشن ببندد و پس از اتمام طبیعی تایمر برگردد،
  `restoreStudyTimerSession` عدد `secondsLeft <= 0` محاسبه می‌کند و `null` برمی‌گرداند.
  `StudyTimer` سشن را بی‌صدا از localStorage حذف می‌کند **بدون اینکه `endSession`
  روی سرور فراخوانی شود!** کاربر نه `GoalSettingModal` را می‌بیند و نه پاداش XP/سکه
  دریافت می‌کند. سشن سرور معلق می‌ماند.
- **راه‌حل:** هنگام بازیابی سشن منقضی، باید `/api/study/end` فراخوانی شود تا XP
  ثبت و سشن بسته شود.

---

## ۵. آنبوردینگ
- ✅ `lib/onboarding.ts` قانون «ویدیوی روزانه اختیاری است» را رعایت می‌کند
- ✅ `LeadCaptureModal` اپ را بعد از روز اول قفل می‌کند تا اطلاعات دانش‌آموزی تکمیل شود
- ✅ `ProgressiveOnboarding` coachmarks روی تایمر برای کاربران جدید

---

## ۶. RTL و فارسی
- ✅ ریشه `app/layout.tsx` با `lang="fa"` و `dir="rtl"`
- ✅ `formatMinutes` و `toLocaleString("fa-IR")` برای ارقام فارسی
- ✅ فیلدهای تلفن/OTP و شمارشگر تایمر با `dir="ltr"` و `tabular-nums`
- ✅ رعایت کامل RTL در تمام صفحات

---

## ۷. رفتار PWA
- ✅ `manifest.json`: `display: "standalone"`, `dir: "rtl"`, `lang: "fa"`
- ⚠️ باگ‌های تایمر (بالا) در حالت PWA standalone بسیار مخرب‌تر هستند چون کاربر
  دسترسی ساده به reload ندارد

---

## ۸. ریسپانسیو موبایل
- ✅ عرض محتوا محدود به `max-w-[600px]`
- ✅ BottomNav محدود به `max-w-[480px]`
- ✅ Touch target مناسب (`h-11` برای گزینه‌های تایمر, `py-3.5` برای دکمه‌ها)
- ✅ iOS safe areas با `env(safe-area-inset-bottom)`

---

## ۹. حالت‌های خالی و edge cases
- ✅ **بدون مأموریت:** `StudyTimer.tsx` UI جایگزین با پیشنهاد مطالعه آزاد
- ✅ **بدون دوست:** `leaderboard/page.tsx` تصویر خالی و دعوت دوستان
- ✅ **بدون ویدیو:** `videos/page.tsx` پیام مناسب
- ✅ **لیدربورد خالی:** fallback به لیگ آزاد (`MIN_LEAGUE_SIZE`)

---

## خلاصه

| وضعیت | تعداد |
|--------|-------|
| 🔴 بحرانی | ۲ (باگ‌های تایمر) |
| 🟡 مهم | ۲ (ناوبری inbox، reload OTP) |
| ✅ سالم | بقیه موارد |
