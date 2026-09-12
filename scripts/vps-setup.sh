#!/usr/bin/env bash
# فقط بررسی اولیه سرور ابری آروان (Ubuntu 24.04).
# این فایل ابزار deploy نیست؛ منبع حقیقت انتشار production در DEPLOYMENT.md و
# فرمان استاندارد ./scripts/deploy-production.sh <FULL_SHA> است.

set -Eeuo pipefail

# دستور اتصال:
# ssh -i ar-gcamp-agent-privatekey.pem -o StrictHostKeyChecking=accept-new ubuntu@194.5.206.14
# کل repository را با rsync --delete به production نفرستید. برای تغییرات
# زیرساختی فقط فایل‌های صریح بخش ۲ DEPLOYMENT.md را همگام کنید.

echo "=== وضعیت سرور ==="
echo "پروژه در مسیر /app/league مستقر شده است."
echo "کانتینرها با docker compose مدیریت می‌شوند."
echo "راهنمای deploy: DEPLOYMENT.md"
