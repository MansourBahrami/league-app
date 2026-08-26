import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

async function within<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("healthcheck_timeout")), timeoutMs);
      timer.unref?.();
    }),
  ]);
}

export async function GET(req: NextRequest) {
  const liveOnly = req.nextUrl.searchParams.get("mode") === "live";
  if (liveOnly) {
    return NextResponse.json({ status: "ok", version: process.env.APP_VERSION ?? "unknown" });
  }

  const [database, cache] = await Promise.allSettled([
    within(prisma.$queryRaw`SELECT 1`, 2_000),
    within(redis.ping(), 2_000),
  ]);
  const checks = {
    database: database.status === "fulfilled" ? "ok" : "error",
    cache: cache.status === "fulfilled" ? "ok" : "error",
  };
  const healthy = checks.database === "ok" && checks.cache === "ok";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      version: process.env.APP_VERSION ?? "unknown",
      loadTestReady: process.env.GCAMP_LOAD_TEST_MODE === "1",
    },
    { status: healthy ? 200 : 503 },
  );
}
