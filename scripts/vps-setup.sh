#!/bin/bash
# اجرا روی VPS جدید (Ubuntu 22.04)
# ssh root@<IP> "bash -s" < scripts/vps-setup.sh

set -e

echo "=== نصب Docker ==="
apt-get update -q
apt-get install -y -q ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "=== ایجاد پوشه پروژه ==="
mkdir -p /app
cd /app

echo ""
echo "✅ Docker نصب شد."
echo ""
echo "حالا:"
echo "  1. فایل‌های پروژه رو آپلود کن:"
echo "     scp -r /Users/mansourbahrami/league_proj_new root@<IP>:/app/league"
echo ""
echo "  2. روی سرور:"
echo "     cd /app/league"
echo "     cp .env.production.example .env.production"
echo "     # مقادیر NEXT_PUBLIC_APP_URL و APP_PUBLIC_URL رو با IP سرور عوض کن"
echo "     nano .env.production"
echo ""
echo "  3. اجرا:"
echo "     docker compose up -d --build"
echo ""
echo "  4. وضعیت:"
echo "     docker compose ps"
echo "     docker compose logs -f app"
