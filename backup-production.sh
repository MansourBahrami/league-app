#!/bin/sh
set -eu

BACKUP_DIR="${GCAMP_BACKUP_DIR:-/app/backups/league}"
RETENTION_DAYS="${GCAMP_BACKUP_RETENTION_DAYS:-14}"
COMPOSE_FILE="${GCAMP_COMPOSE_FILE:-/app/league/docker-compose.yml}"
LOCK_DIR="${GCAMP_BACKUP_LOCK_DIR:-/tmp/gcamp-production-backup.lock}"
DOCKER_BIN="${GCAMP_DOCKER_BIN:-/usr/bin/docker}"

case "$RETENTION_DAYS" in
  ''|*[!0-9]*)
    echo "GCAMP_BACKUP_RETENTION_DAYS must be a positive integer" >&2
    exit 2
    ;;
esac

if [ "$RETENTION_DAYS" -lt 1 ]; then
  echo "GCAMP_BACKUP_RETENTION_DAYS must be at least 1" >&2
  exit 2
fi

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "another production backup is already running" >&2
  exit 1
fi

backup_stamp="$(date -u +%Y-%m-%dT%H%M%SZ)"
backup_tmp="$BACKUP_DIR/.league-$backup_stamp.dump.tmp"
backup_final="$BACKUP_DIR/league-$backup_stamp.dump"

cleanup() {
  rm -f "$backup_tmp"
  rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT INT TERM HUP

install -d -m 700 "$BACKUP_DIR"

"$DOCKER_BIN" compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U league_user -d league_db -Fc > "$backup_tmp"

if [ ! -s "$backup_tmp" ]; then
  echo "database backup is empty" >&2
  exit 1
fi

"$DOCKER_BIN" compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_restore -l < "$backup_tmp" >/dev/null

chmod 600 "$backup_tmp"
mv "$backup_tmp" "$backup_final"

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'league-*.dump' \
  -mtime "+$RETENTION_DAYS" -delete

backup_bytes="$(wc -c < "$backup_final" | tr -d ' ')"
disk_used_percent="$(df -P "$BACKUP_DIR" | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }')"

printf '{"ok":true,"backup":"%s","bytes":%s,"diskUsedPercent":%s}\n' \
  "$backup_final" "$backup_bytes" "$disk_used_percent"

if [ "$disk_used_percent" -ge 90 ]; then
  echo "warning: production disk usage is ${disk_used_percent}%" >&2
fi
