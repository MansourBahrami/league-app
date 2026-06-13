import { calcLevel, LEVEL_TABLE, type MedalCount } from "../lib/gamification";

/** هر سناریو: XP و مدال‌ها → سطح و ستاره مورد انتظار */
interface Case {
  desc: string;
  xp: number;
  medals: MedalCount[];
  expectLevel: string;
  expectStars: number;
}

const m = (hours: number, count = 1): MedalCount => ({ targetHours: hours, count });

const cases: Case[] = [
  // --- تازه‌نفس: فقط XP، بدون مدال ---
  { desc: "زیر ۸ XP → تازه‌نفس ۱ (حداقل)", xp: 0, medals: [], expectLevel: "تازه‌نفس", expectStars: 1 },
  { desc: "۸ XP → تازه‌نفس ۱", xp: 8, medals: [], expectLevel: "تازه‌نفس", expectStars: 1 },
  { desc: "۲۹ XP → هنوز تازه‌نفس ۱", xp: 29, medals: [], expectLevel: "تازه‌نفس", expectStars: 1 },
  { desc: "۳۰ XP → تازه‌نفس ۲", xp: 30, medals: [], expectLevel: "تازه‌نفس", expectStars: 2 },
  { desc: "۶۰ XP → تازه‌نفس ۳", xp: 60, medals: [], expectLevel: "تازه‌نفس", expectStars: 3 },
  { desc: "۲۵۰ XP بدون مدال → همچنان تازه‌نفس ۳ (مدال لازم است)", xp: 250, medals: [], expectLevel: "تازه‌نفس", expectStars: 3 },

  // --- ثابت‌قدم: XP + مدال (همه با هم «و») ---
  { desc: "۲۰۰ XP + مدال ۲۰ → ثابت‌قدم ۱", xp: 200, medals: [m(20)], expectLevel: "ثابت‌قدم", expectStars: 1 },
  { desc: "۵۰۰ XP + فقط مدال ۲۵ (نه ۳۰) → می‌ماند ثابت‌قدم ۱", xp: 500, medals: [m(20), m(25)], expectLevel: "ثابت‌قدم", expectStars: 1 },
  { desc: "۵۰۰ XP + مدال ۲۵ و ۳۰ (هردو) → ثابت‌قدم ۲", xp: 500, medals: [m(20), m(25), m(30)], expectLevel: "ثابت‌قدم", expectStars: 2 },
  { desc: "۸۰۰ XP + مدال ۳۵ → ثابت‌قدم ۳", xp: 800, medals: [m(20), m(25), m(30), m(35)], expectLevel: "ثابت‌قدم", expectStars: 3 },

  // --- پیشرو ---
  { desc: "۱۲۰۰ XP + ۲×مدال ۳۵ ولی بدون ۴۰ → می‌ماند ثابت‌قدم ۳", xp: 1200, medals: [m(35, 2)], expectLevel: "ثابت‌قدم", expectStars: 3 },
  { desc: "۱۲۰۰ XP + ۲×مدال ۳۵ و ۱×مدال ۴۰ (هردو) → پیشرو ۱", xp: 1200, medals: [m(35, 2), m(40, 1)], expectLevel: "پیشرو", expectStars: 1 },
  { desc: "۱۸۰۰ XP + ۳×مدال ۴۰ → پیشرو ۲", xp: 1800, medals: [m(35, 2), m(40, 3)], expectLevel: "پیشرو", expectStars: 2 },
  { desc: "۲۵۰۰ XP + ۳×مدال ۴۵ → پیشرو ۳", xp: 2500, medals: [m(45, 3)], expectLevel: "پیشرو", expectStars: 3 },

  // --- سرآمد (هم X هم Y لازم است) ---
  { desc: "۳۵۰۰ XP + فقط مدال ۵۰ (نه ۵۳) → سرآمد نمی‌شود", xp: 3500, medals: [m(50)], expectLevel: "تازه‌نفس", expectStars: 3 },
  { desc: "۳۵۰۰ XP + مدال ۵۰ و ۵۳ (هردو) → سرآمد ۱", xp: 3500, medals: [m(50), m(53)], expectLevel: "سرآمد", expectStars: 1 },
  { desc: "۴۵۰۰ XP + مدال ۵۶ و ۶۰ (هردو) → سرآمد ۲", xp: 4500, medals: [m(56), m(60)], expectLevel: "سرآمد", expectStars: 2 },
  { desc: "۶۰۰۰ XP + مدال ۶۳ و ۶۶ (هردو) → سرآمد ۳", xp: 6000, medals: [m(63), m(66)], expectLevel: "سرآمد", expectStars: 3 },

  // --- الگو (XP مهم نیست) ---
  { desc: "XP کم + مدال ۷۰ → الگو ۱ (XP مهم نیست)", xp: 10, medals: [m(70)], expectLevel: "الگو", expectStars: 1 },
  { desc: "XP کم + ۲×مدال ۷۰ → الگو فوق‌ستاره", xp: 10, medals: [m(70, 2)], expectLevel: "الگو", expectStars: 2 },
];

console.log("🧪 تست کامل نیازمندی‌های سطح/ستاره (مطابق PRD)\n");
let pass = 0, fail = 0;
for (const c of cases) {
  const r = calcLevel(c.xp, c.medals);
  const ok = r.level === c.expectLevel && r.stars === c.expectStars;
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? "✅" : "❌"} ${c.desc}`);
  if (!ok) console.log(`      دریافت شد: ${r.level} ${r.stars}⭐ | انتظار: ${c.expectLevel} ${c.expectStars}⭐`);
}

console.log(`\n  نتیجه: ${pass} موفق، ${fail} ناموفق از ${cases.length}`);

// چاپ جدول کامل برای مرور
console.log("\n📋 جدول سطوح پیاده‌سازی‌شده:");
for (const row of LEVEL_TABLE) {
  const xpText = row.minXp === 0 && row.maxXp === 0 ? "XP مهم نیست" : `${row.minXp}+ XP`;
  const medalText = row.requiredMedals.length === 0
    ? "بدون مدال"
    : row.requiredMedals.map((g) => g.map((req) => `${req.count}×مدال ${req.hours}`).join(" و ")).join(" یا ");
  console.log(`  ${row.level} (${row.stars}⭐): ${xpText} | ${medalText}`);
}

if (fail > 0) process.exit(1);
