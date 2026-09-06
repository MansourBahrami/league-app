import { getDay1MissionHours, getFullDay1Hours, getOnboardingDailyGoalMinutes } from "../lib/gamification";
import { DEFAULT_ONBOARDING_DAYS } from "../lib/onboarding";
import { gradeRequiresField, isStudentProfileComplete } from "../lib/student-profile";
import { isSetupPromptSnoozed } from "../lib/setup-prompt";
import { wasMissionPromptHandledToday } from "../lib/mission-prompt";
import { millisecondsUntilNextTehranDay, tehranDayKey } from "../lib/date";

console.log("🧪 تست منطق آنبوردینگ ۱ روزه (هدف ۱۵ دقیقه مطالعه)\n");

console.log("--- ماموریت روز اول ---");
const avgs = [0.5, 1.5, 3, 5, 7];
let goalOk = true;
for (const a of avgs) {
  const hours = getDay1MissionHours(a, 10);
  const full = getFullDay1Hours(a);
  const min = getOnboardingDailyGoalMinutes(0, a);
  console.log(`  میانگین ${a}h → هدف روز اول: ${hours}h (${min} دقیقه)`);
  if (hours !== 0.25 || full !== 0.25 || min !== 15) goalOk = false;
}

console.log("\n--- بررسی هدف ۱۵ دقیقه‌ای ---");
console.log(goalOk ? "  ✅ هدف شروع دقیقاً ۱۵ دقیقه است" : "  ❌ خطا در هدف شروع");

console.log("\n--- بررسی طول مسیر آنبوردینگ ---");
const totalDays = DEFAULT_ONBOARDING_DAYS;
console.log(`  طول مسیر پیش‌فرض: ${totalDays} روز`);
if (totalDays === 1) {
  console.log("  ✅ طول مسیر دقیقاً ۱ روز است");
} else {
  console.log("  ❌ طول مسیر باید ۱ روز باشد");
}

console.log("\n--- بررسی فرم پایه و رشته ---");
const profileCases = [
  { grade: "ابتدایی", field: null, expected: true },
  { grade: "نهم", field: null, expected: true },
  { grade: "دانشجو", field: null, expected: true },
  { grade: "دهم", field: null, expected: false },
  { grade: "دوازدهم", field: "تجربی", expected: true },
  { grade: "پشت کنکور", field: "ریاضی", expected: true },
] as const;

let profileOk = true;
for (const item of profileCases) {
  const complete = isStudentProfileComplete({ phone: "09120000000", grade: item.grade, field: item.field });
  const fieldLabel = gradeRequiresField(item.grade) ? "رشته لازم" : "بدون رشته";
  console.log(`  ${item.grade} (${fieldLabel}) → ${complete ? "کامل" : "ناقص"}`);
  if (complete !== item.expected) profileOk = false;
}

console.log(profileOk ? "  ✅ شاخه‌بندی پایه و رشته درست است" : "  ❌ خطا در شاخه‌بندی پایه و رشته");

if (!goalOk || totalDays !== 1 || !profileOk) process.exitCode = 1;

console.log("\n--- بررسی تعویق درخواست اعلان و نصب ---");
const now = new Date("2026-08-20T12:00:00.000Z").getTime();
const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000);
const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
const snoozeOk = isSetupPromptSnoozed(sixDaysAgo, now) && !isSetupPromptSnoozed(sevenDaysAgo, now);
console.log(snoozeOk ? "  ✅ درخواست تا ۷ روز دوباره نمایش داده نمی‌شود" : "  ❌ خطا در بازهٔ تعویق درخواست");

if (!snoozeOk) process.exitCode = 1;

console.log("\n--- بررسی تکرار روزانه دعوت مأموریت ---");
const afterTehranMidnight = new Date("2026-08-20T21:00:00.000Z");
const sameTehranDay = new Date("2026-08-20T20:45:00.000Z");
const previousTehranDay = new Date("2026-08-20T19:00:00.000Z");
const missionPromptOk = wasMissionPromptHandledToday(sameTehranDay, afterTehranMidnight)
  && !wasMissionPromptHandledToday(previousTehranDay, afterTehranMidnight);
console.log(missionPromptOk ? "  ✅ دعوت در همان روز تکرار نمی‌شود و روز بعد برمی‌گردد" : "  ❌ خطا در مرز روز تهران برای دعوت مأموریت");

if (!missionPromptOk) process.exitCode = 1;

console.log("\n--- بررسی تازه‌سازی داده‌ها در نیمه‌شب تهران ---");
const oneSecondBeforeMidnight = new Date("2026-08-22T20:29:59.000Z");
const oneSecondAfterMidnight = new Date("2026-08-22T20:30:01.000Z");
const tehranBoundaryOk =
  tehranDayKey(oneSecondAfterMidnight) - tehranDayKey(oneSecondBeforeMidnight) === 24 * 60 * 60 * 1000
  && millisecondsUntilNextTehranDay(oneSecondBeforeMidnight) === 1_000
  && millisecondsUntilNextTehranDay(oneSecondAfterMidnight) === 24 * 60 * 60 * 1000 - 1_000;
console.log(tehranBoundaryOk ? "  ✅ عبور از نیمه‌شب تهران دقیق تشخیص داده می‌شود" : "  ❌ خطا در تشخیص نیمه‌شب تهران");

if (!tehranBoundaryOk) process.exitCode = 1;
