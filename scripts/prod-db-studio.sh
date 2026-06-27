#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# باز کردن Prisma Studio روی دیتابیسِ پروداکشن (داخل داکر، پورت 5432 به بیرون باز نیست).
# یک تونل SSH می‌زند (localhost:5433 → کانتینر postgres:5432) و Studio را وصل می‌کند.
# با Ctrl+C هم Studio و هم تونل بسته می‌شوند.
#
# پیش‌نیازها (یک‌بار): کلید ~/.ssh/league_vps و فایل .env.prod-db.local در ریشه‌ی پروژه.
# اجرا: ./scripts/prod-db-studio.sh
# ---------------------------------------------------------------------------
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/league_vps}"
SERVER="${SERVER:-root@62.60.198.110}"
LOCAL_PORT="${LOCAL_PORT:-5433}"

# connection string پروداکشن (gitignore‌شده)
if [[ ! -f "$DIR/.env.prod-db.local" ]]; then
  echo "❌ فایل .env.prod-db.local پیدا نشد." >&2; exit 1
fi
# shellcheck disable=SC1091
source "$DIR/.env.prod-db.local"   # PROD_DATABASE_URL را تعریف می‌کند

# IP کانتینر postgres ممکن است با بازسازی عوض شود؛ هر بار زنده می‌گیریمش.
echo "🔎 گرفتن IP کانتینر postgres ..."
PG_IP=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" \
  "export DOCKER_API_VERSION=1.43; docker inspect league-postgres-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'" | tr -d '\r')
if [[ -z "$PG_IP" ]]; then echo "❌ IP کانتینر گرفته نشد." >&2; exit 1; fi
echo "🔗 تونل: localhost:${LOCAL_PORT} → ${PG_IP}:5432"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -N -L "${LOCAL_PORT}:${PG_IP}:5432" "$SERVER" &
TUNNEL_PID=$!
trap 'kill "$TUNNEL_PID" 2>/dev/null || true' EXIT
sleep 2

echo "🚀 Prisma Studio → http://localhost:5555  (برای بستن: Ctrl+C)"
cd "$DIR"
npx prisma studio --port 5555 --browser none --url "$PROD_DATABASE_URL"
