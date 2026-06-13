import { prisma } from "@/lib/db";
import { broadcastActivity } from "@/app/api/feed/stream/route";
import { fireEvent } from "@/lib/notification-engine";

/**
 * استریک = تعداد روزهای تقویمی متوالی که کاربر حداقل یک جلسه مطالعه داشته.
 * هنگام پایان یک جلسه فراخوانی می‌شود (idempotent در طول یک روز):
 *  - اگر امروز قبلاً ثبت شده → بدون تغییر.
 *  - اگر آخرین مطالعه دیروز بوده → +۱.
 *  - در غیر این صورت → ریست به ۱.
 * هنگام رسیدن به نقاط عطف ۳ و ۶ روزه، رویداد `streak` در بورد زنده ثبت می‌شود.
 */
export async function applyStreak(
  userId: string
): Promise<{ streak: number; milestone: number | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true, lastStudyDate: true, name: true, avatarUrl: true },
  });
  if (!user) return { streak: 0, milestone: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let newStreak = user.streak;
  if (!user.lastStudyDate) {
    newStreak = 1;
  } else {
    const last = new Date(user.lastStudyDate);
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - last.getTime()) / 86400000);
    if (diffDays === 0) {
      return { streak: user.streak, milestone: null }; // امروز قبلاً شمرده شده
    } else if (diffDays === 1) {
      newStreak = user.streak + 1;
    } else {
      newStreak = 1;
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { streak: newStreak, lastStudyDate: today },
  });

  const milestone = newStreak === 3 || newStreak === 6 ? newStreak : null;
  if (milestone) {
    const log = await prisma.activityLog.create({
      data: { userId, type: "streak", metadata: { streak: milestone } },
    });
    broadcastActivity({ ...log, user: { name: user.name, avatarUrl: user.avatarUrl } });
    // تریگر رویدادی: قانون‌های نوتیفیکیشن مربوط به نقطه‌عطف استریک
    await fireEvent("streak_milestone", userId, { streak: milestone });
  }

  return { streak: newStreak, milestone };
}
