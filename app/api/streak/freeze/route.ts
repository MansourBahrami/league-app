import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { STREAK_FREEZE_COST } from "@/lib/gamification";
import { tehranDayStart, tehranDayDiff } from "@/lib/date";

/**
 * خرید «مرخصی»: با کسر سکه، زنجیره‌ی مطالعه برای امروز نمی‌سوزد.
 * مکانیزم: lastStudyDate به ابتدای امروز (وقت تهران) جابه‌جا می‌شود تا روزِ بدونِ
 * مطالعه، زنجیره را قطع نکند (بدون افزایش شمارش زنجیره).
 * فقط وقتی مجاز است که زنجیره زنده باشد و امروز هنوز ثبت/امن نشده باشد.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { coins: true, streak: true, lastStudyDate: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.streak <= 0 || !user.lastStudyDate) {
    return NextResponse.json({ error: "زنجیره‌ی فعالی برای محافظت نداری" }, { status: 400 });
  }

  const diff = tehranDayDiff(new Date(), new Date(user.lastStudyDate));
  if (diff <= 0) {
    return NextResponse.json({ error: "امروز زنجیره‌ات امنه — نیازی به مرخصی نیست" }, { status: 400 });
  }
  if (diff > 1) {
    return NextResponse.json({ error: "زنجیره‌ات سوخته و دیگه با مرخصی برنمی‌گرده" }, { status: 400 });
  }
  if (user.coins < STREAK_FREEZE_COST) {
    return NextResponse.json({ error: "سکه کافی نیست" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      coins: { decrement: STREAK_FREEZE_COST },
      lastStudyDate: tehranDayStart(),
    },
  });

  return NextResponse.json({ message: "مرخصی ثبت شد", streak: user.streak });
}
