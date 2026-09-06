import { prisma } from "@/lib/db";
import { getOnboardingDailyGoalMinutes } from "@/lib/gamification";
import { getVideoPrice, type VideoAccess } from "@/lib/ab";
import { tehranDayDiff } from "@/lib/date";
import { DEFAULT_ONBOARDING_DAYS } from "@/lib/onboarding-config";
import { withUserLock } from "@/lib/user-lock";
import type { AppUserSnapshot } from "@/lib/app-user";

/**
 * منطق مسیر یک‌روزهٔ آنبوردینگ: هدف مطالعه + ویدیوی پاداش اختیاری.
 *
 * قواعد:
 *  - مسیر با تکمیل هدف دقیقه‌ای روز اول تمام می‌شود؛ ویدیو شرط پیشروی نیست.
 *  - ویدیوی روز اول از همان ابتدا باز است (بدون قفل)؛ `unlockedAt` صرفاً زمان در
 *    دسترس قرار گرفتن آن است و تماشای ویدیو در ۲۴ ساعت اول سکه دوبرابر می‌دهد.
 *  - رقابت (تایمر/XP/لیدربورد) هیچ‌وقت پشت ویدیو قفل نمی‌شود.
 */

export { DEFAULT_ONBOARDING_DAYS } from "@/lib/onboarding-config";

/** طول مسیر آنبوردینگ: ۱ روز */
export async function getOnboardingTotalDays(): Promise<number> {
  return DEFAULT_ONBOARDING_DAYS;
}

/** فیلتر پایه: ویدیوی «همه پایه‌ها» (grades خالی) یا شامل پایه کاربر */
export function gradeFilter(grade: string | null) {
  return grade
    ? { OR: [{ grades: { isEmpty: true } }, { grades: { has: grade } }] }
    : { grades: { isEmpty: true } };
}

export interface OnboardingState {
  totalDays: number;
  inOnboarding: boolean;
  /** شماره روز جاری (۱ به بالا) */
  currentDay: number;
  goalMinutes: number;
  stepMinutes: number;
  minutesDone: boolean;
  video: { id: string; title: string; day: number } | null;
  /** آیا ویدیو قابل تماشاست (free: همیشه؛ paid: فقط بعد از خرید) */
  videoUnlocked: boolean;
  videoWatched: boolean;
  /** گروه A/B کاربر */
  variant: VideoAccess;
  /** قیمت ویدیوی روز (سکه) — فقط برای گروه paid معنا دارد */
  videoPrice: number;
  /** آیا ویدیوی روز خریده شده (گروه paid) */
  videoPurchased: boolean;
  /** موجودی سکه‌ی کاربر */
  userCoins: number;
}

/** وضعیت کامل روز جاری آنبوردینگ کاربر (دقیقه‌ها + ویدیو) */
type OnboardingUserSnapshot = Pick<
  AppUserSnapshot,
  | "onboardingDay"
  | "onboardingStepMinutes"
  | "pastAvgStudyHours"
  | "day1GoalMinutes"
  | "grade"
  | "coins"
  | "videoAccess"
  | "lastStudyDate"
>;

export async function getOnboardingState(
  userId: string,
  prefetchedUser?: OnboardingUserSnapshot | null,
): Promise<OnboardingState | null> {
  const user = prefetchedUser === undefined
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          onboardingDay: true,
          onboardingStepMinutes: true,
          pastAvgStudyHours: true,
          day1GoalMinutes: true,
          grade: true,
          coins: true,
          videoAccess: true,
          lastStudyDate: true,
        },
      })
    : prefetchedUser;
  if (!user) return null;

  const variant: VideoAccess = user.videoAccess === "paid" ? "paid" : "free";

  const totalDays = await getOnboardingTotalDays();
  const inOnboarding = user.onboardingDay < totalDays;
  const currentDay = user.onboardingDay + 1;
  const goalMinutes = getOnboardingDailyGoalMinutes(
    user.onboardingDay,
    user.pastAvgStudyHours,
    user.day1GoalMinutes
  );
  // دقیقه‌های ماموریتِ روز فقط مربوط به همین روزِ تقویمیِ تهران است؛ اگر آخرین
  // مطالعه پیش از امروز بوده، پیشرفتِ روزِ قبل صفر در نظر گرفته می‌شود (روزِ ناتمام
  // سرریز نمی‌کند). study/end هم هنگام ثبتِ اولین جلسه‌ی روز جدید مقدار DB را بازنشانی می‌کند.
  const stepMinutes =
    !user.lastStudyDate || tehranDayDiff(new Date(), user.lastStudyDate) >= 1
      ? 0
      : user.onboardingStepMinutes;
  const minutesDone = stepMinutes >= goalMinutes;

  let video: OnboardingState["video"] = null;
  let videoUnlocked = false;
  let videoWatched = true; // بدون ویدیو، این بخش از روز خودکار کامل است
  let videoPrice = 0;
  let videoPurchased = false;

  if (inOnboarding) {
    const v = await prisma.video.findFirst({
      where: { day: currentDay, isActive: true, ...gradeFilter(user.grade) },
      select: { id: true, title: true, day: true },
    });
    if (v) {
      video = v;
      videoPrice = getVideoPrice(v.day);
      const prog = await prisma.videoProgress.findUnique({
        where: { userId_videoId: { userId, videoId: v.id } },
        select: { completed: true, unlockedAt: true, purchasedAt: true },
      });
      videoWatched = prog?.completed ?? false;
      videoPurchased = !!prog?.purchasedAt;

      if (variant === "paid") {
        // گروه paid: تماشا فقط بعد از خرید؛ پنجره‌ی ۲× از لحظه‌ی خرید شروع می‌شود
        videoUnlocked = videoPurchased;
      } else {
        // گروه free: ویدیوی روز همیشه باز است (بدون قفل)
        videoUnlocked = true;
        videoPurchased = true; // برای free مفهوم خرید نداریم
        // شروع پنجره‌ی جایزه ۲× از لحظه‌ای که ویدیوی روز در دسترس قرار می‌گیرد
        if (!prog?.unlockedAt) {
          await prisma.videoProgress.upsert({
            where: { userId_videoId: { userId, videoId: v.id } },
            create: { userId, videoId: v.id, unlockedAt: new Date() },
            update: { unlockedAt: new Date() },
          });
        }
      }
    }
  }

  return {
    totalDays,
    inOnboarding,
    currentDay,
    goalMinutes,
    stepMinutes,
    minutesDone,
    video,
    videoUnlocked,
    videoWatched,
    variant,
    videoPrice,
    videoPurchased,
    userCoins: user.coins,
  };
}

/**
 * اگر دقیقه‌های هدفِ روز پر شده باشد، روز را جلو می‌برد.
 *
 * معیار تکمیل روز فقط «دقیقه‌های مطالعه‌ی همان روز» است؛ تماشای ویدیو الزامی نیست
 * (ویدیوی روز جایزه‌ی اختیاری است، نه شرط پیشروی). ویدیو هیچ‌وقت اینجا به‌صورت
 * دیده‌شده علامت نمی‌خورد — تیک ویدیو فقط با تماشای واقعی در videos/progress ثبت می‌شود.
 *
 * idempotent است — از study/end و videos/progress هر دو قابل فراخوانی است.
 */
export async function tryCompleteOnboardingDay(
  userId: string
): Promise<{ dayCompleted: boolean; state: OnboardingState | null }> {
  const totalDays = await getOnboardingTotalDays();
  const dayCompleted = await withUserLock(userId, async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        onboardingDay: true,
        onboardingStepMinutes: true,
        pastAvgStudyHours: true,
        day1GoalMinutes: true,
        lastStudyDate: true,
      },
    });
    if (!user || user.onboardingDay >= totalDays) return false;

    const stepMinutes =
      !user.lastStudyDate || tehranDayDiff(new Date(), user.lastStudyDate) >= 1
        ? 0
        : user.onboardingStepMinutes;
    const goalMinutes = getOnboardingDailyGoalMinutes(
      user.onboardingDay,
      user.pastAvgStudyHours,
      user.day1GoalMinutes,
    );
    if (stepMinutes < goalMinutes) return false;

    const claimed = await tx.user.updateMany({
      where: { id: userId, onboardingDay: user.onboardingDay },
      data: { onboardingDay: { increment: 1 }, onboardingStepMinutes: 0 },
    });
    return claimed.count === 1;
  });
  const state = await getOnboardingState(userId);
  return { dayCompleted, state };
}
