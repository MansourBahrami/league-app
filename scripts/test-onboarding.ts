import { getDay1MissionHours, getFullDay1Hours, getOnboardingDailyGoalMinutes } from "../lib/gamification";

console.log("🧪 تست منطق آنبوردینگ (قانون ساعت ورود + هدف روزانه)\n");

console.log("--- ماموریت روز اول بر اساس ساعت ورود (getDay1MissionHours) ---");
const avgs = [0.5, 1.5, 3, 5, 7];
for (const a of avgs) {
  const morning = getDay1MissionHours(a, 10); // قبل از ۱۷ → کامل
  const evening = getDay1MissionHours(a, 18); // ۱۷ تا ۲۱ → نصف
  const night = getDay1MissionHours(a, 22);   // بعد از ۲۱ → ۱ ساعت
  console.log(`  میانگین ${a}h → صبح(۱۰): ${morning}h | عصر(۱۸): ${evening}h | شب(۲۲): ${night}h`);
}

console.log("\n--- بررسی قانون ساعت ---");
let rulesOk = true;
// میانگین ۳ → کامل = ۳
if (getDay1MissionHours(3, 10) !== 3) { rulesOk = false; console.log("  ❌ صبح باید کامل (۳) باشد"); }
if (getDay1MissionHours(3, 18) !== 2) { rulesOk = false; console.log("  ❌ عصر باید نصف (۲) باشد"); }
if (getDay1MissionHours(3, 22) !== 1) { rulesOk = false; console.log("  ❌ شب باید ۱ باشد"); }
console.log(rulesOk ? "  ✅ قانون ساعت ۱۷/۲۱ درست است" : "  ❌ مشکل در قانون ساعت");

console.log("\n--- هدف روزانه آنبوردینگ (هر روز +۳۰ دقیقه) ---");
const pastAvg = 3;
const day1Snapshot = getFullDay1Hours(pastAvg) * 60; // ۱۸۰ دقیقه
for (let day = 0; day <= 6; day++) {
  const goal = getOnboardingDailyGoalMinutes(day, pastAvg, day1Snapshot);
  const h = Math.floor(goal / 60), m = goal % 60;
  console.log(`  روز ${day}: ${goal} دقیقه (${h}ساعت${m > 0 ? ` و ${m}دقیقه` : ""})`);
}

console.log("\n--- بررسی افزایش ۳۰ دقیقه‌ای ---");
let ok = true;
for (let day = 1; day <= 6; day++) {
  const prev = getOnboardingDailyGoalMinutes(day - 1, pastAvg, day1Snapshot);
  const curr = getOnboardingDailyGoalMinutes(day, pastAvg, day1Snapshot);
  if (curr - prev !== 30) { ok = false; console.log(`  ❌ روز ${day}: اختلاف ${curr - prev} (باید ۳۰ باشد)`); }
}
console.log(ok ? "  ✅ همه روزها دقیقاً +۳۰ دقیقه" : "  ❌ مشکل در افزایش");
