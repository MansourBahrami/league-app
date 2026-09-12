# راهنمای استقرار (Production Deployment)

> وضعیت زنده، معماری، نحوه اتصال و کارهای انجام‌شده برای استقرار اپ روی سرور آروان‌کلاد.
> **آخرین به‌روزرسانی:** ۱۷ شهریور ۱۴۰۵ — runbook انتشار SHAدار، rollout مرحله‌ای دو replica، health guard و rollback خودکار.

## ۰. مسیر استاندارد deploy (منبع حقیقت)

برای deploy عادی اپ فقط همین بخش را اجرا کنید. انتشار production دو مرحله دارد:

1. push به `main`، که workflow فایل `.github/workflows/deploy.yml` را اجرا و
   ایمیج `mansourbahrami/league-app:sha-<FULL_SHA>` را در Docker Hub منتشر می‌کند.
2. اجرای `scripts/deploy-production.sh`، که همان SHA را با بکاپ و rollout
   مرحله‌ای روی سرور فعال می‌کند.

### پیش‌نیازهای سیستم محلی

- فایل `ar-gcamp-agent-privatekey.pem` در ریشه پروژه و با دسترسی `600`؛
- دسترسی push به GitHub و login بودن `gh`؛
- دسترسی SSH کاربر `ubuntu` به production؛
- تمیز بودن **index مربوط به commit**؛ وجود تغییرات محلی دیگر مانع deploy یک
  SHA قبلاً commit‌شده نیست، اما نباید ناخواسته داخل commit قرار بگیرند.

### دستورهای انتشار

```bash
cd /path/to/league_proj_new

# ۱) اعتبارسنجی محلی
npm run lint
npm run build

# ۲) فقط فایل‌های همین تغییر را stage و بازبینی کنید
git status --short
git add -- path/to/changed-file another/changed-file
git diff --cached --check
git diff --cached --stat
git commit -m "شرح کوتاه تغییر"
git push origin main

# ۳) همیشه FULL SHA را deploy کنید؛ نه latest و نه SHA کوتاه
TARGET_SHA="$(git rev-parse HEAD)"

# اختیاری: فقط preflight، بدون هیچ تغییر production
./scripts/deploy-production.sh --check "$TARGET_SHA"

# deploy واقعی
./scripts/deploy-production.sh "$TARGET_SHA"
```

اسکریپت deploy قبل از هر mutation این موارد را کنترل می‌کند:

- SHA هدف دقیقاً `origin/main` باشد؛
- GitHub Actions همان SHA موفق شده باشد؛
- هر دو replica قبل از شروع healthy و روی یک نسخه باشند؛
- بکاپ PostgreSQL ساخته و catalog آن با `pg_restore` اعتبارسنجی شود؛
- ابتدا `app` و فقط بعد از healthy شدن آن `app-replica` تعویض شود؛
- health هر سرویس علاوه بر `status=ok`، دقیقاً SHA هدف را برگرداند؛
- در شکست health، سرویس تغییرکرده به نسخه قبلی rollback شود؛
- در پایان، health عمومی از مسیر CDN نیز همان SHA را گزارش کند.

موفقیت deploy فقط وقتی قطعی است که آخرین خط این باشد:

```text
Deployment complete: <FULL_SHA>
```

> `git push` به‌تنهایی deploy را کامل نمی‌کند؛ فقط ایمیج را می‌سازد. همچنین
> `latest` هرگز مبنای انتشار یا rollback نیست.

---

## ۱. وضعیت فعلی (زنده ✅)

| سرویس | وضعیت | جزئیات |
|-------|-------|--------|
| دامنه لندینگ و سئو | ✅ | `https://gcamp.ir` و `https://www.gcamp.ir` (سایت معرفی، سئو، نقشه سایت و لندینگ) |
| دامنه وب‌اپلیکیشن | ✅ | `https://app.gcamp.ir` (محیط مطالعه، لاگین، لیدربورد و داشبورد دانش‌آموز) |
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
  - `app` و `app-replica`: دو کانتینر Next.js 16 (فقط loopback روی پورت‌های 3000 و 3001)
  - `postgres`: کانتینر `postgres:17-alpine` (دیتابیس `league_db`)
  - `redis`: کانتینر `redis:7-alpine` (کش و سشن با پسورد)
- **وب‌سرور و Reverse Proxy:** Caddy 2 (پورت‌های 80 و 443 با پشتیبانی HTTP/2 و HTTP/3)

### دستور اتصال به سرور از سیستم محلی:
```bash
ssh -i ar-gcamp-agent-privatekey.pem -o StrictHostKeyChecking=accept-new ubuntu@194.5.206.14
```

### همگام‌سازی فایل‌های زیرساختی با سرور (deploy عادی نیست)

کد اپ از داخل ایمیج Docker می‌آید و برای deploy عادی نباید کل repository را
با `rsync` کپی کرد. به‌خصوص `rsync --delete ./` می‌تواند فایل‌های production یا
تغییرات محلی ناخواسته را وارد سرور کند.

فقط وقتی خود فایل‌های زیرساختی تغییر کرده‌اند، همان فایل‌های بازبینی‌شده را
صریحاً همگام کنید:

```bash
rsync -avz \
  -e "ssh -i ar-gcamp-agent-privatekey.pem -o StrictHostKeyChecking=accept-new" \
  docker-compose.yml run-cron.sh backup-production.sh gcamp.crontab \
  ubuntu@194.5.206.14:/app/league/

ssh -i ar-gcamp-agent-privatekey.pem -o StrictHostKeyChecking=accept-new \
  ubuntu@194.5.206.14 \
  'chmod 0755 /app/league/run-cron.sh /app/league/backup-production.sh && crontab /app/league/gcamp.crontab'
```

فایل `.env.production` و secretها هیچ‌وقت با rsync بازنویسی نمی‌شوند. تغییر
`Dockerfile` فقط از مسیر GitHub Actions و ایمیج جدید منتشر می‌شود.

---

## ۳. معماری شبکه و لایه امنیتی

```
کاربر (اینترنت ایران)
   │  https://gcamp.ir (لندینگ)  یا  https://app.gcamp.ir (اپلیکیشن)
   ▼
CDN ابر آروان  (لبهٔ داخل ایران)
   │  ← گواهی معتبر Let's Encrypt در لبه ارائه می‌شود
   │  پروکسی ابری (ابر روشن / نارنجی برای @، www و app)
   ▼
سرور مبدأ (ابرک آروان 194.5.206.14)
   │
   ▼
Caddy Reverse Proxy + least-connection load balancing  (پورت 80 و 443)
   │
   ▼
کانتینرهای app:3000 و app-replica:3000
(روی host به‌ترتیب 127.0.0.1:3000 و 127.0.0.1:3001)
```

### تنظیمات DNS در ابر آروان:
- رکورد `A` برای `@` (دامنه `gcamp.ir`) به مقدار `194.5.206.14` (پروکسی روشن ☁️)
- رکورد `CNAME` یا `A` برای `www` به مقدار `gcamp.ir` / `194.5.206.14` (پروکسی روشن ☁️)
- رکورد `A` برای `app` به مقدار `194.5.206.14` (پروکسی روشن ☁️)

### پیکربندی Caddy روی سرور (`/etc/caddy/Caddyfile`):
```caddyfile
{
    auto_https disable_redirects
}

gcamp.ir, www.gcamp.ir, app.gcamp.ir {
    tls internal
    reverse_proxy 127.0.0.1:3000 127.0.0.1:3001 {
        lb_policy least_conn
        lb_try_duration 2s
        health_uri /api/health
        health_interval 15s
        health_timeout 3s
        health_fails 2
        health_passes 2
        fail_duration 30s
        max_fails 2
    }
}

194.5.206.14.sslip.io {
    redir https://app.gcamp.ir{uri} permanent
}

:443 {
    tls internal
    reverse_proxy 127.0.0.1:3000 127.0.0.1:3001
}

:80 {
    reverse_proxy 127.0.0.1:3000 127.0.0.1:3001
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
*/5 * * * * /app/league/run-cron.sh studySessions,missions,tournaments,notifRules,invariants,analytics >> /var/log/league-cron.log 2>&1
0   * * * * /app/league/run-cron.sh ranks                            >> /var/log/league-cron.log 2>&1
20  3 * * * /app/league/run-cron.sh retention                        >> /var/log/league-cron.log 2>&1
35  3 * * * /app/league/backup-production.sh                         >> /var/log/league-backup.log 2>&1
```

فایل نسخه‌شدهٔ `gcamp.crontab` منبع حقیقت زمان‌بندی production است. فقط پس از
تغییر فایل‌های cron یا همگام‌سازی زیرساخت:

```bash
chmod 0755 /app/league/run-cron.sh /app/league/backup-production.sh
crontab /app/league/gcamp.crontab
```

---

## ۷. دستورهای کاربردی

روی **سیستم محلی**:

```bash
# deploy نسخه‌ای که commit و push شده است
./scripts/deploy-production.sh "$(git rev-parse HEAD)"

# اتصال تعاملی به سرور
ssh -i ar-gcamp-agent-privatekey.pem -o StrictHostKeyChecking=accept-new ubuntu@194.5.206.14
```

پس از اتصال، روی **سرور production**:

```bash
# مشاهده وضعیت کانتینرها
cd /app/league
sudo docker compose ps

# مشاهده لاگ زنده برنامه
sudo docker compose logs -f app

# بررسی لاگ‌های کران
tail -f /var/log/league-cron.log

# وضعیت سرویس Caddy
sudo systemctl status caddy --no-pager
```

---

## ۸. Healthcheck، نسخه و rollback

- readiness: `GET /api/health` اتصال PostgreSQL و Redis را بررسی می‌کند و در خرابی `503` می‌دهد.
- liveness: `GET /api/health?mode=live` فقط زنده‌بودن process را بررسی می‌کند.
- هر build علاوه بر `latest` با `sha-<git-sha>` منتشر می‌شود و همان SHA در پاسخ health دیده می‌شود.
- دستور اصلی و توصیه‌شده برای rollout همان `scripts/deploy-production.sh` در
  بخش صفر است. دستورهای زیر fallback دستی برای عیب‌یابی‌اند.

### بررسی نسخه فعال

```bash
ssh -i ar-gcamp-agent-privatekey.pem -o StrictHostKeyChecking=accept-new \
  ubuntu@194.5.206.14 \
  'curl --fail --silent --show-error http://127.0.0.1:3000/api/health && echo && curl --fail --silent --show-error http://127.0.0.1:3001/api/health'
```

هر دو پاسخ باید `status: ok` و `version` یکسان داشته باشند.

### rollback دستی

فقط از SHA کامل نسخه سالم قبلی استفاده کنید. replicaها را هم‌زمان recreate
نکنید؛ بعد از هر سرویس health همان پورت را تأیید کنید:

```bash
PREVIOUS_SHA="FULL_40_CHARACTER_SHA"
PREVIOUS_IMAGE="mansourbahrami/league-app:sha-$PREVIOUS_SHA"

ssh -i ar-gcamp-agent-privatekey.pem -o StrictHostKeyChecking=accept-new \
  ubuntu@194.5.206.14 "
    cd /app/league
    export APP_IMAGE='$PREVIOUS_IMAGE'
    sudo -E docker compose pull app app-replica
    sudo -E docker compose up -d --no-deps --force-recreate app
  "

# این command باید هم موفق شود و هم نسخه دقیق PREVIOUS_SHA را پیدا کند؛
# در غیر این صورت replica دوم را تغییر ندهید.
ssh -i ar-gcamp-agent-privatekey.pem -o StrictHostKeyChecking=accept-new \
  ubuntu@194.5.206.14 "
    health=\$(curl --fail --silent --show-error http://127.0.0.1:3000/api/health) &&
    printf '%s\n' \"\$health\" &&
    printf '%s' \"\$health\" | grep -Fq '\"version\":\"$PREVIOUS_SHA\"'
  "

ssh -i ar-gcamp-agent-privatekey.pem -o StrictHostKeyChecking=accept-new \
  ubuntu@194.5.206.14 "
    cd /app/league
    export APP_IMAGE='$PREVIOUS_IMAGE'
    sudo -E docker compose up -d --no-deps --force-recreate app-replica
  "

# پایان rollback: هر دو پورت باید status=ok و version=PREVIOUS_SHA داشته باشند.
ssh -i ar-gcamp-agent-privatekey.pem -o StrictHostKeyChecking=accept-new \
  ubuntu@194.5.206.14 \
  'curl --fail --silent --show-error http://127.0.0.1:3000/api/health && echo && curl --fail --silent --show-error http://127.0.0.1:3001/api/health'
```

مایگریشن‌ها forward-only هستند؛ rollback کد نباید و نمی‌تواند migration را
خودکار پایین بیاورد. هر migration جدید باید با نسخه قبلی اپ backward-compatible
باشد تا rollout مرحله‌ای امن بماند.

## ۹. بکاپ و تمرین بازیابی

بکاپ روزانه باید قبل از استقرار و مستقل از volume snapshot گرفته شود. فایل خروجی حاوی داده شخصی است و باید با دسترسی محدود نگه‌داری شود. اسکریپت نسخه‌شدهٔ `backup-production.sh` خروجی را ابتدا در فایل موقت می‌نویسد، catalog را با `pg_restore` اعتبارسنجی می‌کند، سپس به‌صورت atomic منتشر می‌کند و نسخه‌های قدیمی‌تر از ۱۴ روز را حذف می‌کند.

```bash
cd /app/league
mkdir -p /app/backups/league
/app/league/backup-production.sh
```

ماهانه یک restore drill روی دیتابیس staging خالی انجام دهید و پس از بازیابی، migration status، `/api/health` و تست‌های invariant را بررسی کنید.

## ۱۰. مقیاس چندنمونه‌ای و pool دیتابیس

فید بین replicaها از Redis Pub/Sub عبور می‌کند، ۱۰۰ رخداد اخیر برای reconnect نگه داشته می‌شود و Cron قفل توزیع‌شده دارد. در مقیاس افقی، Caddy/CDN باید SSE را بدون buffering به چند instance سالم توزیع کند. مقدار `DB_POOL_MAX` باید از فرمول زیر تعیین شود:

`DB_POOL_MAX × تعداد replica + ظرفیت jobها < max_connections PostgreSQL - حاشیه مدیریت`

پیش از افزودن replica، تست `npm run test:load:500` را روی staging مشابه production اجرا کنید و CPU، RAM، connectionهای DB و p95 را هم‌زمان ثبت کنید.
