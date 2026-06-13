import { NextRequest, NextResponse } from "next/server";
import { runScheduledJobs, type JobTask } from "@/lib/jobs";

export const dynamic = "force-dynamic";

const ALL_TASKS: JobTask[] = ["missions", "tournaments", "reminders", "streakRisk", "ranks"];

/**
 * نقطه‌ی فراخوانی کارهای زمان‌بندی‌شده.
 * با هدر `Authorization: Bearer <CRON_SECRET>` محافظت می‌شود تا فقط cron مجاز اجرا کند.
 * قابل اتصال به Vercel Cron، سرویس cron خارجی، یا فراخوانی دستی با curl.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ?tasks=missions,ranks برای کنترل فرکانس cronهای مختلف؛ بدون پارامتر = پیش‌فرض
    const tasksParam = req.nextUrl.searchParams.get("tasks");
    const tasks = tasksParam
      ? (tasksParam.split(",").map((t) => t.trim()).filter((t) => ALL_TASKS.includes(t as JobTask)) as JobTask[])
      : undefined;
    const result = await runScheduledJobs(tasks);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("cron run error:", err);
    return NextResponse.json({ error: "خطا در اجرای کارها" }, { status: 500 });
  }
}

// اجازه‌ی GET هم برای سهولت تست (با همان احراز هویت)
export async function GET(req: NextRequest) {
  return POST(req);
}
