# راهنمای استقرار (Production Deployment)

> وضعیت زنده، معماری، نحوه اتصال و کارهای انجام‌شده برای استقرار اپ روی سرور آروان‌کلاد.
> **آخرین به‌روزرسانی:** شهریور ۱۴۰۵ — انتقال به سرور آروان‌کلاد، فعال‌سازی ورود با پیامک کاوه‌نگار، اتصال ربات بله، گواهی SSL فوری، زمان‌بند کران و Caddy Reverse Proxy.

---

## ۱. وضعیت فعلی (زنده ✅)

| سرویس | وضعیت | جزئیات |
|-------|-------|--------|
| دامنه نهایی پروداکشن | ✅ | `https://app.gcamp.ir` (زنده روی CDN ابر آروان با گواهی معتبر SSL لبه) |
| نشانی تستی sslip.io | 🔄 | `https://194.5.206.14.sslip.io` (ریدایرکت دائم 301 به `https://app.gcamp.ir`) |
| ورود با پیامک (OTP) | ✅ | کاوه‌نگار، خط فرستنده `9982005239` (تست‌شده با وضعیت تایید شد) |
| اتصال ربات بله | ✅ | `@gcamp_bot` — webhook فعال روی نشانی HTTPS برای اعلان‌های حساب کاربری |
| دیتابیس + کش | ✅ | PostgreSQL 17 + Redis 7 در Docker |
| زمان‌بند دوره‌ای (Cron) | ✅ | کران ۵ دقیقه‌ای برای پردازش ماموریت‌ها، تورنومنت‌ها و موتور قوانین نوتیفیکیشن |

---

## ۲. مشخصات زیرساخت سرور و نحوه اتصال

- **ارائه‌دهنده:** ابر آروان (ArvanCloud) — سرور ابری (IaaS)
- **آی‌پی سرور:** `194.5.206.14`
- **نام کاربری SSH:** `ubuntu`
- **کلید SSH خصوصی:** `ar-gcamp-agent-privatekey.pem` (ذخیره در ریشه پروژه با دسترسی `chmod 600`)
- **مسیر پروژه روی سرور:** `/app/league/`
- **حافظه مجازی:** ۲ گیگابایت Swap فعال روی `/swapfile`
- **سرویس‌های در حال اجرا (Docker Compose):**
  - `app`: کانتینر Next.js 16 (پورت 3000)
  - `postgres`: کانتینر `postgres:17-alpine` (دیتابیس `league_db`)
  - `redis`: کانتینر `redis:7-alpine` (کش و سشن با پسورد)
- **وب‌سرور و Reverse Proxy:** Caddy 2 (پورت‌های 80 و 443 با پشتیبانی HTTP/2 و HTTP/3)

### دستور اتصال به سرور از سیستم محلی:
```bash
ssh -i ar-gcamp-agent-privatekey.pem ubuntu@194.5.206.14
```

### همگام‌سازی فایل‌های پروژه با سرور (rsync):
```bash
rsync -avz --delete \
  -e "ssh -i ar-gcamp-agent-privatekey.pem -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '*.pem' \
  --exclude '*.key' \
  --exclude '.env*' \
  ./ ubuntu@194.5.206.14:/app/league/
```

---

## ۳. معماری شبکه و لایه امنیتی

```
کاربر (اینترنت ایران)
   │  https://app.gcamp.ir
   ▼
CDN ابر آروان  (لبهٔ داخل ایران)
   │  ← گواهی معتبر Let's Encrypt در لبه ارائه می‌شود
   │  پروکسی ابری (ابر روشن / نارنجی)
   ▼
سرور مبدأ (ابرک آروان 194.5.206.14)
   │
   ▼
Caddy Reverse Proxy  (پورت 80 و 443)
   │
   ▼
کانتینر app:3000  (Next.js)
```

### چک‌لیست کارایی CDN

برای تشخیص کندی‌ای که در process داخلی Next دیده نمی‌شود، این موارد پس از هر
تغییر CDN از حداقل دو اپراتور موبایل ایران کنترل شوند:

- `/_next/static/*` باید با cache بلندمدت و `HIT` از edge پاسخ بگیرد؛ HTML/RSC
  شخصی‌سازی‌شده نباید به‌صورت عمومی cache شود.
- HTTP/2 یا HTTP/3 در سمت کاربر و keep-alive بین CDN و origin فعال باشد.
- زمان DNS، TCP، TLS، TTFB و مقدار `server-timing` جدا ثبت شود. افزایش TLS به
  چند ثانیه، مشکل application/DB نیست و باید با شناسه POP برای پشتیبانی CDN
  ارسال شود.
- یک A/B کوتاه بین CDN و origin انجام شود؛ حذف یا تغییر دائمی CDN فقط بعد از
  مقایسه p75/p95 چند اپراتور انجام شود.
- هدف عملیاتی: acknowledgment رابط کمتر از ۱۰۰ms، INP کمتر از ۲۰۰ms و p75
  navigation گرم کمتر از ۳۰۰ms.

### پیکربندی Caddy روی سرور (`/etc/caddy/Caddyfile`):
```caddyfile
{
    auto_https disable_redirects
}

app.gcamp.ir {
    tls internal
    reverse_proxy 127.0.0.1:3000
}

194.5.206.14.sslip.io {
    redir https://app.gcamp.ir{uri} permanent
}

:443 {
    tls internal
    reverse_proxy 127.0.0.1:3000
}

:80 {
    reverse_proxy 127.0.0.1:3000
}
```

---

## ۴. پیامک OTP (کاوه‌نگار)

- پیاده‌سازی در `lib/sms.ts` (فراخوانی متد `sms/send.json`).
- متغیرها در `.env.production`:
  - `KAVENEGAR_API_KEY`: کلید API اختصاصی
  - `KAVENEGAR_SENDER`: شماره فرستنده `9982005239`
- تست وضعیت اتصال به کاوه‌نگار از روی سرور:
```bash
curl -s https://api.kavenegar.com/v1/$KAVENEGAR_API_KEY/account/info.json
```

---

## ۵. اتصال ربات‌های بله و تلگرام

- **Endpoints:** `POST /api/bot/bale` و `POST /api/bot/telegram`
- **جریان اتصال:** کاربر بعد از ورود، لینک اتصال ربات را باز می‌کند و شناسه بله/تلگرام به حساب کاربر متصل می‌شود.
- **ثبت مجدد وب‌هوک روی سرور (از طریق CDN ابر آروان):**
```bash
cd /app/league
BALE_TOKEN=$(sudo docker compose exec -T app node -e 'process.stdout.write(process.env.BALE_BOT_TOKEN || "")')
TG_TOKEN=$(sudo docker compose exec -T app node -e 'process.stdout.write(process.env.TELEGRAM_BOT_TOKEN || "")')
SECRET=$(sudo docker compose exec -T app node -e 'process.stdout.write(process.env.BOT_WEBHOOK_SECRET || "")')

# ثبت وب‌هوک بله:
curl -s -X POST -H 'Content-Type: application/json' \
  -d "{\"url\":\"https://app.gcamp.ir/api/bot/bale?secret=$SECRET\",\"secret_token\":\"$SECRET\"}" \
  "https://tapi.bale.ai/bot$BALE_TOKEN/setWebhook"

# ثبت وب‌هوک تلگرام:
curl -s -X POST -H 'Content-Type: application/json' \
  -d "{\"url\":\"https://app.gcamp.ir/api/bot/telegram?secret=$SECRET\"}" \
  "https://api.telegram.org/bot$TG_TOKEN/setWebhook"

# بررسی وضعیت وب‌هوک‌ها:
curl -s "https://tapi.bale.ai/bot$BALE_TOKEN/getWebhookInfo"
curl -s "https://api.telegram.org/bot$TG_TOKEN/getWebhookInfo"
```

---

## ۶. زمان‌بند دوره‌ای (Cron)

اسکریپت `/app/league/run-cron.sh` به صورت دوره‌ای توسط crontab سرور صدا زده می‌شود و بدون وابستگی به شبکه بیرونی، با `http://localhost:3000` ارتباط برقرار می‌کند:

```bash
# فایل نسخه‌شدهٔ `run-cron.sh` در ریشهٔ پروژه باید در همین مسیر deploy و executable باشد.
# این runner کد خروج ناموفق endpoint را به cron برمی‌گرداند تا خرابی در مانیتورینگ پنهان نشود.
chmod 0755 /app/league/run-cron.sh
```

زمان‌بندی crontab سرور (`crontab -l`):
```
*/5 * * * * /app/league/run-cron.sh missions,tournaments,notifRules >> /var/log/league-cron.log 2>&1
0   * * * * /app/league/run-cron.sh ranks                            >> /var/log/league-cron.log 2>&1
```

---

## ۷. دستورهای کاربردی مدیریت سرور

```bash
# اتصال به سرور
ssh -i ar-gcamp-agent-privatekey.pem ubuntu@194.5.206.14

# مشاهده وضعیت کانتینرها
cd /app/league && sudo docker compose ps

# مشاهده لاگ زنده برنامه
sudo docker compose logs -f app

# اجرای مجدد و ساخت مجدد کانتینر
sudo docker compose up -d --force-recreate app

# بررسی لاگ‌های کران
tail -f /var/log/league-cron.log

# وضعیت سرویس Caddy
sudo systemctl status caddy --no-pager
```
