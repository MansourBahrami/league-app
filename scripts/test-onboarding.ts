import { getDay1MissionHours, getFullDay1Hours, getOnboardingDailyGoalMinutes } from "../lib/gamification";
import { DEFAULT_ONBOARDING_DAYS, getOnboardingTotalDays } from "../lib/onboarding";

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

