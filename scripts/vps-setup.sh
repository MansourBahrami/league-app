#!/bin/bash
# راهنمای اتصال و راه‌اندازی سرور ابری آروان (Ubuntu 24.04)
# IP سرور: 194.5.206.14
# کلید اتصال: ar-gcamp-agent-privatekey.pem

set -e

# دستور اتصال:
# ssh -i ar-gcamp-agent-privatekey.pem ubuntu@194.5.206.14

# همگام‌سازی فایل‌های پروژه با سرور:
# rsync -avz --delete -e "ssh -i ar-gcamp-agent-privatekey.pem -o StrictHostKeyChecking=no" --exclude 'node_modules' --exclude '.next' --exclude '.git' --exclude '*.pem' --exclude '*.key' --exclude '.env*' ./ ubuntu@194.5.206.14:/app/league/

echo "=== وضعیت سرور ==="
echo "پروژه در مسیر /app/league مستقر شده است."
echo "کانتینرها با docker compose مدیریت می‌شوند."
