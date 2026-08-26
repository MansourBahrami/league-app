import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { STREAK_FREEZE_COST } from "@/lib/gamification";
import { tehranDayStart, tehranDayDiff } from "@/lib/date";
import { withUserLock } from "@/lib/user-lock";

/**
 * خرید «مرخصی»: با کسر سکه، زنجیره‌ی مطالعه برای امروز نمی‌سوزد.
 * مکانیزم: lastStudyDate به ابتدای امروز (وقت تهران) جابه‌جا می‌شود تا روزِ بدونِ
 * مطالعه، زنجیره را قطع نکند (بدون افزایش شمارش زنجیره).
 * فقط وقتی مجاز است که زنجیره زنده باشد و امروز هنوز ثبت/امن نشده باشد.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await withUserLock(session.userId, async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: session.userId },
      select: { streak: true, lastStudyDate: true },
    });
    if (!user) return { status: "not_found" } as const;
    if (user.streak <= 0 || !user.lastStudyDate) return { status: "inactive" } as const;

    const diff = tehranDayDiff(new Date(), user.lastStudyDate);
    if (diff <= 0) return { status: "safe", streak: user.streak } as const;
    if (diff > 1) return { status: "expired" } as const;

    const updated = await tx.user.updateMany({
      where: { id: session.userId, coins: { gte: STREAK_FREEZE_COST } },
      data: {
        coins: { decrement: STREAK_FREEZE_COST },
        lastStudyDate: tehranDayStart(),
      },
    });
    if (updated.count !== 1) return { status: "insufficient" } as const;
    return { status: "purchased", streak: user.streak } as const;
  });

  if (result.status === "not_found") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result.status === "inactive") return NextResponse.json({ error: "زنجیره‌ی فعالی برای محافظت نداری" }, { status: 400 });
  if (result.status === "safe") return NextResponse.json({ error: "امروز زنجیره‌ات امنه — نیازی به مرخصی نیست" }, { status: 400 });
  if (result.status === "expired") return NextResponse.json({ error: "زنجیره‌ات سوخته و دیگه با مرخصی برنمی‌گرده" }, { status: 400 });
  if (result.status === "insufficient") return NextResponse.json({ error: "سکه کافی نیست" }, { status: 400 });
  return NextResponse.json({ message: "مرخصی ثبت شد", streak: result.streak });
}
