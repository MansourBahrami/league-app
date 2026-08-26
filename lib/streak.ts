import { broadcastActivity } from "@/lib/feed-broadcast";
import { fireEvent } from "@/lib/notification-engine";
import { tehranDayStart, tehranDayDiff } from "@/lib/date";
import { withUserLock } from "@/lib/user-lock";

/**
 * استریک = تعداد روزهای تقویمی متوالی که کاربر حداقل یک جلسه مطالعه داشته.
 * هنگام پایان یک جلسه فراخوانی می‌شود (idempotent در طول یک روز):
 *  - اگر امروز قبلاً ثبت شده → بدون تغییر.
 *  - اگر آخرین مطالعه دیروز بوده → +۱.
 *  - در غیر این صورت → ریست به ۱.
 * هنگام رسیدن به نقاط عطف ۳ و ۶ روزه، رویداد `streak` در بورد زنده ثبت می‌شود.
 */
export async function applyStreak(
  userId: string,
  now = new Date(),
): Promise<{ streak: number; milestone: number | null }> {
  const today = tehranDayStart(now); // شروع روز به وقت تهران
  const result = await withUserLock(userId, async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { streak: true, lastStudyDate: true, name: true, avatarUrl: true },
    });
    if (!user) return null;

    let newStreak = user.streak;
    if (!user.lastStudyDate) {
      newStreak = 1;
    } else {
      const diffDays = tehranDayDiff(now, user.lastStudyDate);
      if (diffDays === 0) {
        return { streak: user.streak, milestone: null, log: null, user };
      }
      newStreak = diffDays === 1 ? user.streak + 1 : 1;
    }

    await tx.user.update({
      where: { id: userId },
      data: { streak: newStreak, lastStudyDate: today },
    });

    const milestone = newStreak === 3 || newStreak === 6 ? newStreak : null;
    const log = milestone
      ? await tx.activityLog.create({
          data: {
            userId,
            type: "streak",
            metadata: { streak: milestone },
            dedupeKey: `streak:${userId}:${today.toISOString()}:${milestone}`,
          },
        })
      : null;
    return { streak: newStreak, milestone, log, user };
  });

  if (!result) return { streak: 0, milestone: null };
  if (result.milestone && result.log) {
    broadcastActivity({
      ...result.log,
      user: { name: result.user.name, avatarUrl: result.user.avatarUrl },
    });
    await fireEvent("streak_milestone", userId, { streak: result.milestone });
  }
  return { streak: result.streak, milestone: result.milestone };
}
