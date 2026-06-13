import { prisma } from "@/lib/db";
import { getOnboardingDailyGoalMinutes } from "@/lib/gamification";

/**
 * منطق مسیر آنبوردینگ (روز دوبخشی: دقیقه‌های مطالعه + ویدیوی روز).
 *
 * قواعد:
 *  - طول مسیر منعطف است: بیشترین `day` بین ویدیوهای فعال (پیش‌فرض ۶). ادمین با
 *    افزودن/حذف روزِ ویدیو مسیر را بلند/کوتاه می‌کند.
 *  - روز N وقتی کامل می‌شود که هم دقیقه‌های هدف پر شده باشد و هم ویدیوی روز N
 *    (متناسب با پایه) ≥۹۰٪ دیده شده باشد. اگر برای آن روز/پایه ویدیویی نباشد،
 *    دقیقه‌ها کافی است.
 *  - ویدیوی روز N با پر شدن دقیقه‌ها باز (`unlockedAt`) می‌شود؛ تماشای آن در ۲۴
 *    ساعت اول سکه دوبرابر می‌دهد.
 *  - رقابت (تایمر/XP/لیدربورد) هیچ‌وقت پشت ویدیو قفل نمی‌شود.
 */

export const DEFAULT_ONBOARDING_DAYS = 6;

/** طول مسیر آنبوردینگ = بیشترین day بین ویدیوهای فعال (پیش‌فرض ۶) */
export async function getOnboardingTotalDays(): Promise<number> {
  const agg = await prisma.video.aggregate({
    where: { isActive: true, day: { gte: 1 } },
    _max: { day: true },
  });
  return agg._max.day ?? DEFAULT_ONBOARDING_DAYS;
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
  videoUnlocked: boolean;
  videoWatched: boolean;
}

/** وضعیت کامل روز جاری آنبوردینگ کاربر (دقیقه‌ها + ویدیو) */
export async function getOnboardingState(userId: string): Promise<OnboardingState | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingDay: true,
      onboardingStepMinutes: true,
      pastAvgStudyHours: true,
      day1GoalMinutes: true,
      grade: true,
    },
  });
  if (!user) return null;

  const totalDays = await getOnboardingTotalDays();
  const inOnboarding = user.onboardingDay < totalDays;
  const currentDay = user.onboardingDay + 1;
  const goalMinutes = getOnboardingDailyGoalMinutes(
    user.onboardingDay,
    user.pastAvgStudyHours,
    user.day1GoalMinutes
  );
  const minutesDone = user.onboardingStepMinutes >= goalMinutes;

  let video: OnboardingState["video"] = null;
  let videoUnlocked = false;
  let videoWatched = true; // بدون ویدیو، این بخش از روز خودکار کامل است

  if (inOnboarding) {
    const v = await prisma.video.findFirst({
      where: { day: currentDay, isActive: true, ...gradeFilter(user.grade) },
      select: { id: true, title: true, day: true },
    });
    if (v) {
      video = v;
      const prog = await prisma.videoProgress.findUnique({
        where: { userId_videoId: { userId, videoId: v.id } },
        select: { completed: true, unlockedAt: true },
      });
      videoUnlocked = !!prog?.unlockedAt;
      videoWatched = prog?.completed ?? false;
    }
  }

  return {
    totalDays,
    inOnboarding,
    currentDay,
    goalMinutes,
    stepMinutes: user.onboardingStepMinutes,
    minutesDone,
    video,
    videoUnlocked,
    videoWatched,
  };
}

/**
 * اگر هر دو بخش روز (دقیقه + ویدیو) کامل شده باشد، روز را جلو می‌برد.
 * با پر شدن دقیقه‌ها، ویدیوی روز را باز (`unlockedAt`) می‌کند.
 * idempotent است — از study/end و videos/progress هر دو قابل فراخوانی است.
 */
export async function tryCompleteOnboardingDay(
  userId: string
): Promise<{ dayCompleted: boolean; state: OnboardingState | null }> {
  const state = await getOnboardingState(userId);
  if (!state || !state.inOnboarding) return { dayCompleted: false, state };

  // باز کردن ویدیوی روز به محض پر شدن دقیقه‌ها (مبنای جایزه ۲× تماشای سریع)
  if (state.minutesDone && state.video && !state.videoUnlocked) {
    await prisma.videoProgress.upsert({
      where: { userId_videoId: { userId, videoId: state.video.id } },
      update: { unlockedAt: new Date() },
      create: { userId, videoId: state.video.id, unlockedAt: new Date() },
    });
    state.videoUnlocked = true;
  }

  if (state.minutesDone && state.videoWatched) {
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingDay: { increment: 1 }, onboardingStepMinutes: 0 },
    });
    return { dayCompleted: true, state };
  }

  return { dayCompleted: false, state };
}
