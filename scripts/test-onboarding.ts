import { getDay1MissionHours, getFullDay1Hours, getOnboardingDailyGoalMinutes } from "../lib/gamification";
import { DEFAULT_ONBOARDING_DAYS } from "../lib/onboarding";
import { gradeRequiresField, isStudentProfileComplete } from "../lib/student-profile";
import { isSetupPromptSnoozed } from "../lib/setup-prompt";

console.log("🧪 تست منطق آنبوردینگ ۱ روزه (هدف ۱ ساعت مطالعه)\n");

console.log("--- ماموریت روز اول ---");
const avgs = [0.5, 1.5, 3, 5, 7];
let goalOk = true;
for (const a of avgs) {
  const hours = getDay1MissionHours(a, 10);
  const full = getFullDay1Hours(a);
  const min = getOnboardingDailyGoalMinutes(0, a);
  console.log(`  میانگین ${a}h → هدف روز اول: ${hours}h (${min} دقیقه)`);
  if (hours !== 1 || full !== 1 || min !== 60) goalOk = false;
}

console.log("\n--- بررسی هدف ۱ ساعته ---");
console.log(goalOk ? "  ✅ هدف روز اول دقیقاً ۱ ساعت (۶۰ دقیقه) است" : "  ❌ خطا در هدف روز اول");

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
