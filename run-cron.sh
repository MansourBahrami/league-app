#!/bin/sh
set -eu

TASKS="${1:-missions,tournaments,notifRules}"

cd /app/league
/usr/bin/docker compose -f /app/league/docker-compose.yml exec -T app \
  node -e '
    const tasks = process.argv[1];
    const url = `http://localhost:3000/api/cron/run?tasks=${encodeURIComponent(tasks)}`;

    fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
    })
      .then(async (response) => {
        const body = await response.text();
        if (!response.ok) throw new Error(`cron endpoint returned ${response.status}: ${body}`);
        console.log(body);
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  ' "$TASKS"
