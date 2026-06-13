import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * پاداش فوری هر ۱۵ دقیقه (۱ XP + ۱ سکه) — کاملاً سمت سرور اعتبارسنجی می‌شود:
 *  - جلسه باید باز و متعلق به خود کاربر باشد.
 *  - استحقاق = زمان واقعی سپری‌شده (منهای pause) تقسیم بر ۱۵ دقیقه، با سقف مدت انتخابی تایمر.
 *  - فقط مابه‌التفاوت استحقاق و پاداش‌های قبلی پرداخت می‌شود (spam بی‌اثر است).
 *  - قفل خوش‌بینانه روی tickCount جلوی پرداخت دوباره در درخواست‌های موازی را می‌گیرد.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const s = await prisma.studySession.findUnique({
    where: { id: sessionId, userId: session.userId },
  });
  if (!s) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (s.endTime) return NextResponse.json({ granted: 0 });

  const now = Date.now();
  const pausedMs = s.pausedSec * 1000 + (s.pausedAt ? Math.max(0, now - s.pausedAt.getTime()) : 0);
  const effectiveMin = Math.floor((now - s.startTime.getTime() - pausedMs) / 60000);
  const capIntervals = s.plannedMin > 0 ? Math.floor(s.plannedMin / 15) : 0;
  const entitled = Math.min(Math.floor(effectiveMin / 15), capIntervals);
  const grant = Math.max(0, entitled - s.tickCount);

  if (grant === 0) return NextResponse.json({ granted: 0 });

  // قفل خوش‌بینانه: فقط اگر tickCount از زمان خواندن تغییری نکرده باشد
  const updated = await prisma.studySession.updateMany({
    where: { id: s.id, tickCount: s.tickCount, endTime: null },
    data: { tickCount: { increment: grant } },
  });
  if (updated.count === 0) return NextResponse.json({ granted: 0 });

  await prisma.user.update({
    where: { id: session.userId },
    data: { xp: { increment: grant }, coins: { increment: grant } },
  });

  return NextResponse.json({ granted: grant, xp: grant, coins: grant });
}
