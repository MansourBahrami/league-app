import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { grantStudyTick } from "@/lib/study-session";

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

  const result = await grantStudyTick({
    userId: session.userId,
    sessionId,
  });
  if (result.status === "not_found") {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    granted: result.granted,
    ...(result.granted > 0 ? { xp: result.granted, coins: result.granted } : {}),
  });
}
