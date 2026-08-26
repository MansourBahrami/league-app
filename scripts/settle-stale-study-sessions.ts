import { prisma } from "../lib/db";
import { redis } from "../lib/redis";
import {
  previewExpiredStudySessions,
  settleExpiredStudySessions,
} from "../lib/stale-study-sessions";
import { runBusinessInvariantAudit } from "../lib/invariants";

function assertLocalDevelopmentDatabase() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error("DATABASE_URL تنظیم نشده است.");
  const url = new URL(rawUrl);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(url.hostname)) {
    throw new Error(`اجرای maintenance فقط روی دیتابیس محلی مجاز است؛ host فعلی: ${url.hostname}`);
  }
}

async function main() {
  assertLocalDevelopmentDatabase();
  const apply = process.argv.includes("--apply");
  const now = new Date();
  const preview = await previewExpiredStudySessions(now);
  const totals = preview.expired.reduce((result, session) => ({
    verifiedMinutes: result.verifiedMinutes + session.durationMin,
    totalXp: result.totalXp + session.totalXp,
    totalCoins: result.totalCoins + session.totalCoins,
    outstandingXp: result.outstandingXp + session.outstandingXp,
    outstandingCoins: result.outstandingCoins + session.outstandingCoins,
    running: result.running + (session.pausedAt ? 0 : 1),
    paused: result.paused + (session.pausedAt ? 1 : 0),
  }), {
    verifiedMinutes: 0,
    totalXp: 0,
    totalCoins: 0,
    outstandingXp: 0,
    outstandingCoins: 0,
    running: 0,
    paused: 0,
  });

  const report = {
    mode: apply ? "apply" : "preview",
    databaseHost: "local",
    candidates: preview.candidates,
    expiredSessions: preview.expired.length,
    affectedUsers: new Set(preview.expired.map((session) => session.userId)).size,
    oldestStart: preview.expired[0]?.startTime.toISOString() ?? null,
    newestStart: preview.expired.at(-1)?.startTime.toISOString() ?? null,
    ...totals,
  };
  console.log(JSON.stringify(report, null, 2));

  if (!apply || preview.expired.length === 0) return;
  if (process.env.DEV_SETTLE_STALE_CONFIRM !== "1") {
    throw new Error("برای اعمال تغییر، DEV_SETTLE_STALE_CONFIRM=1 و آرگومان --apply هر دو لازم‌اند.");
  }

  let settled = 0;
  let historical = 0;
  for (let page = 0; page < 20; page++) {
    const result = await settleExpiredStudySessions(now);
    settled += result.settled;
    historical += result.historical;
    if (result.expired === 0 || result.settled === 0) break;
  }

  const remaining = await previewExpiredStudySessions(now);
  const invariants = await runBusinessInvariantAudit(now);
  console.log(JSON.stringify({
    applied: { settled, historical },
    remainingExpiredSessions: remaining.expired.length,
    invariants,
  }, null, 2));

  if (remaining.expired.length > 0 || invariants.staleSessions > 0) {
    throw new Error("تسویه کامل نشد؛ دیتابیس را بررسی کنید.");
  }
}

void main().finally(async () => {
  // ioredis با lazyConnect در حالت preview هنوز status="wait" دارد. صدا زدن
  // quit روی اتصالِ هرگز بازنشده خودش connect را آغاز می‌کند و اسکریپت را معطل
  // نگه می‌دارد؛ در این حالت disconnect کافی است.
  const closeRedis = redis.status === "wait" || redis.status === "end"
    ? Promise.resolve(redis.disconnect())
    : redis.quit();
  await Promise.allSettled([prisma.$disconnect(), closeRedis]);
});
