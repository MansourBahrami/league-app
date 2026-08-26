import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { withUserLock } from "@/lib/user-lock";
import { redis } from "@/lib/redis";
import { captureCaughtError } from "@/lib/observability";

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.confirmation !== "حذف حساب من") {
    return NextResponse.json({ error: "عبارت تأیید درست نیست" }, { status: 400 });
  }

  await withUserLock(session.userId, async (tx) => {
    // NotificationLog رابطه FK ندارد تا تاریخچه عملیاتی rule حفظ شود؛ شناسه کاربر حذف می‌شود.
    await tx.notificationLog.deleteMany({ where: { userId: session.userId } });
    await tx.user.delete({ where: { id: session.userId } });
  });
  await redis.del(`gcamp:session-version:${session.userId}`).catch((error) => {
    captureCaughtError("privacy.session_cache_delete", error, { userId: session.userId });
  });

  const response = NextResponse.json({ ok: true });
  const cookie = clearSessionCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
  return response;
}
