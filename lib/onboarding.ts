import { prisma } from "@/lib/db";
import { getOnboardingDailyGoalMinutes } from "@/lib/gamification";
import { getVideoPrice, type VideoAccess } from "@/lib/ab";

/**
 * منطق مسیر آنبوردینگ (روز دوبخشی: دقیقه‌های مطالعه + ویدیوی روز).
 *
 * قواعد:
 *  - طول مسیر منعطف است: بیشترین `day` بین ویدیوهای فعال (پیش‌فرض ۶). ادمین با
 *    افزودن/حذف روزِ ویدیو مسیر را بلند/کوتاه می‌کند.
 *  - روز N وقتی کامل می‌شود که هم دقیقه‌های هدف پر شده باشد و هم ویدیوی روز N
 *    (متناسب با پایه) ≥۹۰٪ دیده شده باشد. اگر برای آن روز/پایه ویدیویی نباشد،
 *    دقیقه‌ها کافی است.
 *  - ویدیوی روز N از همان ابتدا باز است (بدون قفل)؛ `unlockedAt` صرفاً زمان در
 *    دسترس قرار گرفتن آن است و تماشای ویدیو در ۲۴ ساعت اول سکه دوبرابر می‌دهد.
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
export async function getOnboardingState(userId: string): Promise<OnboardingState | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingDay: true,
      onboardingStepMinutes: true,
      pastAvgStudyHours: true,
      day1GoalMinutes: true,
      grade: true,
      coins: true,
      videoAccess: true,
    },
  });
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
  const minutesDone = user.onboardingStepMinutes >= goalMinutes;

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
    stepMinutes: user.onboardingStepMinutes,
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
 * اگر هر دو بخش روز (دقیقه + ویدیو) کامل شده باشد، روز را جلو می‌برد.
 * با پر شدن دقیقه‌ها، ویدیوی روز را باز (`unlockedAt`) می‌کند.
 * idempotent است — از study/end و videos/progress هر دو قابل فراخوانی است.
 */
export async function tryCompleteOnboardingDay(
  userId: string
): Promise<{ dayCompleted: boolean; state: OnboardingState | null }> {
  const state = await getOnboardingState(userId);
  if (!state || !state.inOnboarding) return { dayCompleted: false, state };

  if (state.minutesDone && state.videoWatched) {
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingDay: { increment: 1 }, onboardingStepMinutes: 0 },
    });
    return { dayCompleted: true, state };
  }

  return { dayCompleted: false, state };
}
