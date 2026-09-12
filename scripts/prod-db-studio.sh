#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# باز کردن Prisma Studio روی دیتابیسِ پروداکشن (داخل داکر، پورت 5432 به بیرون باز نیست).
# یک تونل SSH می‌زند (localhost:5433 → کانتینر postgres:5432) و Studio را وصل می‌کند.
# با Ctrl+C هم Studio و هم تونل بسته می‌شوند.
#
# پیش‌نیازها (یک‌بار): کلید ar-gcamp-agent-privatekey.pem و فایل
# .env.prod-db.local در ریشه‌ی پروژه.
# اجرا: ./scripts/prod-db-studio.sh
# ---------------------------------------------------------------------------
set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_KEY="${GCAMP_SSH_KEY:-$DIR/ar-gcamp-agent-privatekey.pem}"
SERVER="${GCAMP_SSH_TARGET:-ubuntu@194.5.206.14}"
REMOTE_DIR="${GCAMP_REMOTE_DIR:-/app/league}"
LOCAL_PORT="${LOCAL_PORT:-5433}"
SSH=(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SERVER")

if [[ ! -f "$SSH_KEY" ]]; then
  echo "❌ کلید SSH پیدا نشد: $SSH_KEY" >&2
  exit 1
fi

# connection string پروداکشن (gitignore‌شده)
if [[ ! -f "$DIR/.env.prod-db.local" ]]; then
  echo "❌ فایل .env.prod-db.local پیدا نشد." >&2; exit 1
fi
# shellcheck disable=SC1091
source "$DIR/.env.prod-db.local"   # PROD_DATABASE_URL را تعریف می‌کند

# IP کانتینر postgres ممکن است با بازسازی عوض شود؛ هر بار زنده می‌گیریمش.
echo "🔎 گرفتن IP کانتینر postgres ..."
PG_IP=$("${SSH[@]}" \
  "cd '$REMOTE_DIR' && container_id=\$(sudo docker compose ps -q postgres) && sudo docker inspect \"\$container_id\" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'" | tr -d '\r')
if [[ -z "$PG_IP" ]]; then echo "❌ IP کانتینر گرفته نشد." >&2; exit 1; fi
echo "🔗 تونل: localhost:${LOCAL_PORT} → ${PG_IP}:5432"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -N \
  -L "${LOCAL_PORT}:${PG_IP}:5432" "$SERVER" &
TUNNEL_PID=$!
trap 'kill "$TUNNEL_PID" 2>/dev/null || true' EXIT
sleep 2

echo "🚀 Prisma Studio → http://localhost:5555  (برای بستن: Ctrl+C)"
cd "$DIR"
npx prisma studio --port 5555 --browser none --url "$PROD_DATABASE_URL"
