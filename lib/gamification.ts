import { tehranDayDiff } from "@/lib/date";

/**
 * جدول سطوح کاربری.
 * `requiredMedals` ساختار OR-of-AND دارد (آرایه بیرونی = «یا»، درونی = «و»)؛
 * اما طبق نیازمندی فعلی همه مدال‌های یک سطح **با هم (AND)** لازم‌اند، پس هر سطح
 * یک گروه «و» دارد. مثلاً سرآمد یک‌ستاره = هم مدال ۵۰ و هم مدال ۵۳.
 * آرایه خالی [] = بدون نیاز به مدال.
 * اگر minXp و maxXp هر دو ۰ باشند یعنی «XP مهم نیست» (فقط مدال شرط است — سطح الگو).
 */
export const LEVEL_TABLE = [
  { level: "تازه‌نفس", stars: 1, minXp: 8, maxXp: 29, requiredMedals: [] },
  { level: "تازه‌نفس", stars: 2, minXp: 30, maxXp: 59, requiredMedals: [] },
  { level: "تازه‌نفس", stars: 3, minXp: 60, maxXp: 199, requiredMedals: [] },
  { level: "ثابت‌قدم", stars: 1, minXp: 200, maxXp: 499, requiredMedals: [[{ hours: 20, count: 1 }]] },
  { level: "ثابت‌قدم", stars: 2, minXp: 500, maxXp: 799, requiredMedals: [[{ hours: 25, count: 1 }, { hours: 30, count: 1 }]] },
  { level: "ثابت‌قدم", stars: 3, minXp: 800, maxXp: 1199, requiredMedals: [[{ hours: 35, count: 1 }]] },
  { level: "پیشرو", stars: 1, minXp: 1200, maxXp: 1799, requiredMedals: [[{ hours: 35, count: 2 }, { hours: 40, count: 1 }]] },
  { level: "پیشرو", stars: 2, minXp: 1800, maxXp: 2499, requiredMedals: [[{ hours: 40, count: 3 }]] },
  { level: "پیشرو", stars: 3, minXp: 2500, maxXp: 3499, requiredMedals: [[{ hours: 45, count: 3 }]] },
  { level: "سرآمد", stars: 1, minXp: 3500, maxXp: 4499, requiredMedals: [[{ hours: 50, count: 1 }, { hours: 53, count: 1 }]] },
  { level: "سرآمد", stars: 2, minXp: 4500, maxXp: 5999, requiredMedals: [[{ hours: 56, count: 1 }, { hours: 60, count: 1 }]] },
  { level: "سرآمد", stars: 3, minXp: 6000, maxXp: 99999, requiredMedals: [[{ hours: 63, count: 1 }, { hours: 66, count: 1 }]] },
  { level: "الگو", stars: 1, minXp: 0, maxXp: 0, requiredMedals: [[{ hours: 70, count: 1 }]] },
  { level: "الگو", stars: 2, minXp: 0, maxXp: 0, requiredMedals: [[{ hours: 70, count: 2 }]] },
] as const;

export const MISSION_TABLE = [
  { targetHours: 20, minAvgHours: 3, entryCost: 25, xpReward: 40 },
  { targetHours: 25, minAvgHours: 3.5, entryCost: 30, xpReward: 50 },
  { targetHours: 30, minAvgHours: 4, entryCost: 40, xpReward: 60 },
  { targetHours: 35, minAvgHours: 4, entryCost: 60, xpReward: 90 },
  { targetHours: 40, minAvgHours: 4.5, entryCost: 90, xpReward: 100 },
  { targetHours: 45, minAvgHours: 5.5, entryCost: 150, xpReward: 120 },
  { targetHours: 50, minAvgHours: 6, entryCost: 180, xpReward: 250 },
  { targetHours: 53, minAvgHours: 6.5, entryCost: 190, xpReward: 320 },
  { targetHours: 56, minAvgHours: 7, entryCost: 200, xpReward: 400 },
  { targetHours: 60, minAvgHours: 8, entryCost: 220, xpReward: 500 },
  { targetHours: 63, minAvgHours: 8, entryCost: 230, xpReward: 620 },
  { targetHours: 66, minAvgHours: 8.5, entryCost: 240, xpReward: 770 },
  { targetHours: 70, minAvgHours: 9, entryCost: 250, xpReward: 1000 },
];

/**
 * ماموریت‌های روزانه: هدف ساعت مطالعه در یک روز (به وقت تهران).
 * ۳ و ۵ ساعته رایگان‌اند؛ بقیه با سکه. جایزه همیشه سکه است.
 */
export const DAILY_MISSION_TABLE = [
  { targetHours: 3, entryCost: 0, coinReward: 5 },
  { targetHours: 5, entryCost: 0, coinReward: 10 },
  { targetHours: 7, entryCost: 10, coinReward: 15 },
  { targetHours: 8, entryCost: 12, coinReward: 20 },
  { targetHours: 10, entryCost: 15, coinReward: 25 },
];

/** هزینه‌ی «مرخصی» برای نسوختن زنجیره‌ی مطالعه (یک روز) */
export const STREAK_FREEZE_COST = 50;

/** هر ۱۵ دقیقه مطالعه = 1 XP + 1 سکه */
export const MINUTES_PER_XP = 15;
export function calcRewards(minutes: number): { xp: number; coins: number } {
  const intervals = Math.floor(minutes / 15);
  return { xp: intervals, coins: intervals };
}

/** تبدیل اختلاف XP به دقیقه‌ی مطالعه‌ی معادل (هر XP = ۱۵ دقیقه) */
export function xpToStudyMinutes(xp: number): number {
  return Math.max(0, Math.round(xp)) * MINUTES_PER_XP;
}

/** قالب‌بندی دقیقه به فارسی: «۹۰ دقیقه» یا «۱ ساعت و ۳۰ دقیقه» */
export function formatStudyMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${m.toLocaleString("fa-IR")} دقیقه`;
  if (rem === 0) return `${h.toLocaleString("fa-IR")} ساعت`;
  return `${h.toLocaleString("fa-IR")} ساعت و ${rem.toLocaleString("fa-IR")} دقیقه`;
}

/** هزینه سکه برای باز کردن بخش مطالعه‌ی پروفایل یک کاربر دیگر (تا ۱ ساعت) */
export const PROFILE_UNLOCK_COST = 20;

/** مدت اعتبار آنلاک بخش مطالعه‌ی پروفایل (ساعت) */
export const PROFILE_UNLOCK_HOURS = 1;

/** هدف کامل روز اول (بدون قانون ساعت ورود): ۲ تا ۴ ساعت بر اساس میانگین گذشته */
export function getFullDay1Hours(pastAvgHours: number | null): number {
  const avg = pastAvgHours ?? 1.5;
  return Math.min(4, Math.max(2, Math.ceil(avg)));
}

/**
 * ماموریت روز اول بر اساس ساعت ورود (طبق PRD + قانون تکمیلی):
 *  - قبل از ۱۷ → هدف کامل (۲ تا ۴ ساعت)
 *  - ۱۷ تا ۲۱ → نصف هدف کامل (حداقل ۱ ساعت)
 *  - بعد از ۲۱ → فقط ۱ ساعت
 */
export function getDay1MissionHours(pastAvgHours: number | null, hourOfDay: number): number {
  const full = getFullDay1Hours(pastAvgHours);
  if (hourOfDay < 17) return full;
  if (hourOfDay < 21) return Math.max(1, Math.round(full / 2));
  return 1;
}

/**
 * هدف مطالعه روزانه در مسیر آنبوردینگ (بر حسب دقیقه).
 *  - روز اول: مقدار snapshot شده هنگام آنبوردینگ (`day1GoalMinutes`) تا در طول روز تغییر نکند.
 *  - از روز دوم: مبنای میانگین اعلامی کاربر (هدف کامل) + هر روز ۳۰ دقیقه بیشتر.
 */
export function getOnboardingDailyGoalMinutes(
  onboardingDay: number,
  pastAvgHours: number | null,
  day1GoalMinutes?: number | null
): number {
  if (onboardingDay <= 0) {
    return day1GoalMinutes ?? getFullDay1Hours(pastAvgHours) * 60;
  }
  return getFullDay1Hours(pastAvgHours) * 60 + onboardingDay * 30;
}

/**
 * استریک مؤثر برای نمایش: اگر آخرین مطالعه قبل از دیروز باشد، زنجیره شکسته است.
 * (فیلد `streak` در DB فقط هنگام جلسه جدید به‌روز می‌شود.)
 */
export function effectiveStreak(streak: number, lastStudyDate: Date | string | null): number {
  if (!lastStudyDate) return 0;
  const diffDays = tehranDayDiff(new Date(), new Date(lastStudyDate));
  return diffDays <= 1 ? streak : 0;
}

export interface MedalCount {
  targetHours: number;
  count: number;
}

/** آیا مجموعه مدال‌های کاربر شرط OR-of-AND یک سطح را برآورده می‌کند؟ */
function medalsSatisfy(
  userMedals: MedalCount[],
  requirement: readonly (readonly { readonly hours: number; readonly count: number }[])[]
): boolean {
  if (requirement.length === 0) return true;
  // هر گروه = AND؛ بین گروه‌ها = OR
  return requirement.some((group) =>
    group.every((req) => {
      const found = userMedals.find((m) => m.targetHours === req.hours);
      return !!found && found.count >= req.count;
    })
  );
}

/** محاسبه سطح کاربر بر اساس XP و مدال‌ها */
export function calcLevel(xp: number, medals: MedalCount[]): { level: string; stars: number } {
  let result = { level: "تازه‌نفس", stars: 1 };

  for (const row of LEVEL_TABLE) {
    const xpOk = row.minXp === 0 && row.maxXp === 0 ? true : xp >= row.minXp;
    const medalsOk = medalsSatisfy(medals, row.requiredMedals);
    if (xpOk && medalsOk) {
      result = { level: row.level, stars: row.stars };
    }
  }

  return result;
}

/**
 * نیازمندی سطح بعدی برای نمایش در پروفایل: چقدر XP و کدام مدال‌ها لازم است.
 * گام بعدی = اولین ردیف جدول که کاربر هنوز به آن نرسیده.
 */
export function getNextLevelRequirement(
  xp: number,
  medals: MedalCount[]
): { level: string; stars: number; xpNeeded: number; missingMedals: { hours: number; count: number }[] } | null {
  const current = calcLevel(xp, medals);
  const currentRank = LEVEL_TABLE.findIndex((r) => r.level === current.level && r.stars === current.stars);

  for (let i = currentRank + 1; i < LEVEL_TABLE.length; i++) {
    const row = LEVEL_TABLE[i];
    const xpNeeded = row.minXp === 0 && row.maxXp === 0 ? 0 : Math.max(0, row.minXp - xp);

    // کمبود مدال‌ها نسبت به اولین گروه AND این ردیف
    const missingMedals: { hours: number; count: number }[] = [];
    const group = row.requiredMedals[0];
    if (group) {
      for (const req of group) {
        const have = medals.find((m) => m.targetHours === req.hours)?.count ?? 0;
        if (have < req.count) missingMedals.push({ hours: req.hours, count: req.count - have });
      }
    }
    return { level: row.level, stars: row.stars, xpNeeded, missingMedals };
  }
  return null; // به بالاترین سطح رسیده
}

/** ۳ ماموریت پیشنهادی بر اساس میانگین ساعت مطالعه کاربر */
export function suggestMissions(avgStudyHoursPerDay: number): typeof MISSION_TABLE {
  const avgWeekly = avgStudyHoursPerDay * 7;
  const eligible = MISSION_TABLE.filter((m) => avgStudyHoursPerDay >= m.minAvgHours);
  if (eligible.length === 0) return MISSION_TABLE.slice(0, 3);

  const matching = eligible.filter((m) => m.targetHours <= avgWeekly * 1.2);
  const base = matching.length > 0 ? matching[matching.length - 1] : eligible[0];
  const baseIdx = MISSION_TABLE.indexOf(base);

  const suggestions: typeof MISSION_TABLE = [];
  if (baseIdx > 0) suggestions.push(MISSION_TABLE[baseIdx - 1]);
  if (baseIdx > 1) suggestions.push(MISSION_TABLE[baseIdx - 2]);
  suggestions.unshift(base);
  return suggestions.slice(0, 3) as typeof MISSION_TABLE;
}

/**
 * پیام داینامیک مینی‌لیدربورد: رتبه بین هم‌سطح‌ها (XP هفت روز اخیر) + نام سطح واقعی.
 */
export function getLeaderboardMessage(userRank: number, totalUsers: number, levelName = "هم‌رده"): string {
  if (totalUsers <= 1) {
    return "فعلاً تنها «" + levelName + "» فعالی! با هر دقیقه مطالعه رکورد خودتو بالاتر ببر تا رقبا برسن.";
  }
  const percentile = Math.round(((totalUsers - userRank) / totalUsers) * 100);
  if (percentile >= 80) return `عالی! این هفته از ${percentile}٪ «${levelName}»ها بیشتر مطالعه کردی. به همین مسیر ادامه بده!`;
  if (percentile >= 50) return `خوبه! از نیمی از «${levelName}»های هم‌سطحت جلوتری. یه کم دیگه تلاش کن!`;
  if (percentile >= 20) return `می‌تونی بهتر باشی! ${userRank - 1} نفر هم‌سطح جلوتر از تو هستن — قابل جبرانه.`;
  return `شروع کن! هنوز وقت داری امروز از «${levelName}»های دیگه جلو بزنی.`;
}
