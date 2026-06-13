# راهنمای استقرار (Production Deployment)

> وضعیت زنده، معماری، و کارهای انجام‌شده برای استقرار اپ روی سرور.
> **آخرین به‌روزرسانی:** خرداد ۱۴۰۵ — اتصال ربات بله، HTTPS واقعی، و پیامک OTP کاوه‌نگار.

---

## ۱. وضعیت فعلی (زنده ✅)

| سرویس | وضعیت | جزئیات |
|-------|-------|--------|
| آدرس عمومی | ✅ | `https://app.ayandetalayee.ir` (گواهی معتبر Let's Encrypt) |
| HTTPS | ✅ | TLS در لبهٔ CDN پارس‌پک (داخل ایران) ترمینیت می‌شود |
| ورود با پیامک (OTP) | ✅ | کاوه‌نگار، خط فرستنده `9982005239` |
| ورود با ربات بله | ✅ | `@gcamp_bot` — webhook روی آدرس HTTPS |
| ورود با تلگرام | 🟡 | کد آماده؛ ارسال از سرور ایران به api.telegram.org بلاک است |
| دیتابیس + کش | ✅ | PostgreSQL 17 + Redis 7 در Docker |

> دامنهٔ نهایی بعداً به `Gcamp.ir` تغییر می‌کند؛ `app.ayandetalayee.ir` فعلاً برای تست/تولید فعال است.

---

## ۲. زیرساخت

- **سرور:** VPS لیارا، Ubuntu 24.04، IP `62.60.198.110` (hostname `ubuntu-league-vps`).
- **مسیر پروژه روی سرور:** `/app/league/`
- **اجرا:** Docker Compose با ۴ سرویس (شبکهٔ `league-net`):
  - `app` — ایمیج `mansourbahrami/league-app:latest` (Next.js، expose پورت 3000)
  - `postgres` — `postgres:17-alpine` (دیتابیس `league_db`)
  - `redis` — `redis:7-alpine` (OTP + توکن magic، با پسورد)
  - `caddy` — `caddy:2-alpine` (reverse proxy، پورت‌های 80 و 443)
- **رجیستری:** Docker Hub (با mirror آروان روی سرور به‌خاطر تحریم).

---

## ۳. معماری شبکه (چرا این‌طوری؟)

```
کاربر (اینترنت ایران)
   │  https://app.ayandetalayee.ir
   ▼
CDN پارس‌پک  (لبهٔ داخل ایران، IP 185.208.173.17)
   │  ← گواهی معتبر Let's Encrypt اینجا ارائه می‌شود (قفل سبز مرورگر)
   │  پروکسی DNS-based (مثل ابر نارنجی کلودفلر)
   ▼
سرور مبدأ 62.60.198.110
   │
   ▼
Caddy  (پورت 80 و 443)
   │  443: tls internal (گواهی self-signed)  |  80: HTTP ساده
   ▼
app:3000  (Next.js)
```

### چرا CDN لازم بود؟
1. **پایداری:** دسترسی مستقیم به IP خارجی روی برخی ISPهای ایران ناپایدار است. CDN داخل ایران این را حل می‌کند.
2. **HTTPS:** سرور مبدأ به **هیچ‌کدام** از CAهای ACME (Let's Encrypt, ZeroSSL, Google, Buypass) دسترسی ندارد (همه از ایران بلاک‌اند)، پس **نمی‌تواند خودش گواهی معتبر بگیرد**. CDN پارس‌پک در لبهٔ داخل ایران گواهی معتبر Let's Encrypt را ارائه می‌کند.

### چرا Caddy روی مبدأ `tls internal` است؟
چون مبدأ نمی‌تواند گواهی معتبر بگیرد، Caddy یک گواهی self-signed (آفلاین) روی 443 می‌سازد و یک بلوک `:80` ساده هم دارد. پارس‌پک (حالت Full) با مبدأ ارتباط برقرار می‌کند و خودش گواهی معتبر را به کاربر می‌دهد. پیکربندی:

```caddyfile
{
	auto_https disable_redirects
}
app.ayandetalayee.ir {
	tls internal
	reverse_proxy app:3000
}
:80 {
	reverse_proxy app:3000
}
```

---

## ۴. اتصال ربات بله

بله از Bot API سازگار با تلگرام استفاده می‌کند (`https://tapi.bale.ai/bot<TOKEN>/`). برخلاف سرویس مجزای `bot/` (که long-polling تلگرام است)، **بله از طریق webhook مستقیم در خود اپ** وصل شده:

- **Endpoint:** `POST /api/bot/bale?secret=<BOT_WEBHOOK_SECRET>` → `handleBotUpdate("bale", …)`
- **امنیت:** secret اشتباه → ۴۰۳.
- **جریان ورود:** کاربر `/start` می‌زند → ربات کاربر را پیدا/می‌سازد و یک Magic Link (Redis، ۱۵ دقیقه) با دکمهٔ «ورود به اپ» می‌فرستد → کلیک → `/api/auth/magic` کوکی JWT ست و به `/dashboard` ریدایرکت می‌کند.

### ثبت webhook (یک‌بار، از روی سرور که به بله دسترسی دارد)
```bash
TOKEN='<BALE_BOT_TOKEN>'
URL='https://app.ayandetalayee.ir/api/bot/bale?secret=<BOT_WEBHOOK_SECRET>'
curl -s -G --data-urlencode "url=$URL" "https://tapi.bale.ai/bot$TOKEN/setWebhook"
# بررسی:
curl -s "https://tapi.bale.ai/bot$TOKEN/getWebhookInfo"
```

> نکتهٔ مهم: ریدایرکت پس از مصرف magic از `APP_PUBLIC_URL` ساخته می‌شود نه `req.url`. اگر از `req.url` استفاده شود، پشت CDN/Caddy میزبان داخلی `localhost:3000` دیده می‌شود و کاربر به آدرس اشتباه می‌رود. (اصلاح در `app/api/auth/magic/route.ts`.)

---

## ۵. پیامک OTP (کاوه‌نگار)

- پیاده‌سازی در `lib/sms.ts` (endpoint `sms/send.json`). کاوه‌نگار از سرور ایران کاملاً در دسترس است.
- `app/api/auth/send-otp` در حالت production کد را با کاوه‌نگار پیامک می‌کند؛ در dev کد را در پاسخ JSON برمی‌گرداند (`_dev_otp`).
- متغیرها: `KAVENEGAR_API_KEY` و `KAVENEGAR_SENDER` (خط `9982005239`).

---

## ۶. متغیرهای محیطی production (`/app/league/.env.production`)

اپ از `env_file: .env.production` می‌خواند (نه `.env`؛ `.env` فقط برای interpolation پسوردهای compose است).

```env
DATABASE_URL=postgresql://league_user:<PW>@postgres:5432/league_db
REDIS_URL=redis://:<PW>@redis:6379
JWT_SECRET=<...>
NEXT_PUBLIC_APP_URL=https://app.ayandetalayee.ir
APP_PUBLIC_URL=https://app.ayandetalayee.ir
KAVENEGAR_API_KEY=<...>
KAVENEGAR_SENDER=9982005239
BALE_BOT_TOKEN=<...>
BALE_BOT_USERNAME=gcamp_bot
BOT_WEBHOOK_SECRET=<...>
TELEGRAM_BOT_TOKEN=<...>
# اختیاری (هنوز ست نشده): VAPID_*، CRON_SECRET، BOT_API_SECRET
```

> مقادیر واقعی فقط روی سرور و در GitHub Secrets نگهداری می‌شوند، نه در گیت.

---

## ۷. فرایند انتشار (CI/CD)

```
git push origin main
   ▼
GitHub Actions (.github/workflows/deploy.yml)
   build ایمیج linux/amd64 → push به Docker Hub :latest
   ▼
روی سرور: pull ایمیج جدید + بازسازی کانتینر app
```

### دستورهای redeploy روی سرور
```bash
cd /app/league
docker compose pull app
docker compose up -d --force-recreate app
docker compose ps
```

### ⚠️ تله: کش mirror رجیستری آروان
mirror آروان تگ `:latest` را **کش می‌کند** و گاهی نسخهٔ کهنه می‌دهد؛ `docker compose pull` می‌گوید "Pulled" ولی کد قدیمی اجرا می‌شود. برای اطمینان، دیجست را مقایسه و در صورت اختلاف **با دیجست دقیق** pull کنید:

```bash
# دیجست روی سرور:
docker image inspect mansourbahrami/league-app:latest --format '{{.RepoDigests}}'
# دیجست واقعی Docker Hub را بگیرید (header docker-content-digest از manifests/latest)
# اگر فرق داشت:
docker pull mansourbahrami/league-app@sha256:<DIGEST>
docker tag  mansourbahrami/league-app@sha256:<DIGEST> mansourbahrami/league-app:latest
docker compose up -d --force-recreate app
```

---

## ۸. عیب‌یابی سریع

| نشانه | علت محتمل | راه‌حل |
|-------|-----------|--------|
| لینک بله به `localhost:3000` می‌رود | ریدایرکت از `req.url` ساخته شده | باید از `APP_PUBLIC_URL` باشد (در `magic/route.ts` رفع شده) |
| کد بعد از push دیده نمی‌شود | کش کهنهٔ mirror آروان | pull با دیجست دقیق (بخش ۷) |
| خطای ۵۰۲ از CDN | مبدأ روی پورت/پروتکل موردانتظار پاسخ نمی‌دهد | اطمینان از بالا بودن Caddy روی 80 و 443 |
| پیامک نمی‌رسد | `KAVENEGAR_*` ست نشده یا اعتبار تمام | بررسی env داخل کانتینر + پنل کاوه‌نگار |
| OTP «اشتباه یا منقضی» | کد در Redis منقضی شده (۵ دقیقه) | دوباره درخواست کد |

### دستورهای پرکاربرد
```bash
# لاگ اپ
docker compose logs -f app
# env داخل کانتینر در حال اجرا
docker compose exec app printenv | grep -E 'KAVENEGAR|APP_URL|BALE'
# تست HTTPS و گواهی
curl -sI https://app.ayandetalayee.ir | head -1
```

---

## ۹. کارهای باقی‌مانده در استقرار

- [ ] تست واقعی ورود با پیامک OTP (مصرف اعتبار کاوه‌نگار).
- [ ] تنظیم کلیدهای VAPID (`npx web-push generate-vapid-keys`) برای فعال‌سازی Web Push.
- [ ] اتصال cron واقعی به `POST /api/cron/run` با `CRON_SECRET` (فرکانس‌های مختلف با `?tasks=`).
- [ ] (در صورت نیاز تلگرام) استقرار سرویس `bot/` روی یک سرور خارج از ایران به‌عنوان relay.
- [ ] جابه‌جایی دامنهٔ نهایی به `Gcamp.ir` و به‌روزرسانی `NEXT_PUBLIC_APP_URL`/`APP_PUBLIC_URL` + build-arg + webhook بله.
