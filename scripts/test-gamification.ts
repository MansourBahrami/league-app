import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { calcLevel } from "../lib/gamification";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧪 تست حلقه گیمیفیکیشن\n");

  // --- تست ۱: calcLevel با شرط‌های OR ---
  console.log("--- تست calcLevel ---");
  const cases: { xp: number; medals: { targetHours: number; count: number }[]; expect: string }[] = [
    { xp: 5, medals: [], expect: "تازه‌نفس (زیر ۸)" },
    { xp: 100, medals: [], expect: "تازه‌نفس ۳" },
    { xp: 600, medals: [{ targetHours: 30, count: 1 }], expect: "ثابت‌قدم ۲ (مدال ۳۰ = جایگزین ۲۵)" },
    { xp: 1300, medals: [{ targetHours: 40, count: 1 }], expect: "پیشرو ۱ (مدال ۴۰ = جایگزین ۲×۳۵)" },
    { xp: 10, medals: [{ targetHours: 70, count: 1 }], expect: "الگو ۱ (XP مهم نیست)" },
    { xp: 10, medals: [{ targetHours: 70, count: 2 }], expect: "الگو ۲ فوق‌ستاره" },
  ];
  for (const c of cases) {
    const r = calcLevel(c.xp, c.medals);
    console.log(`  XP=${c.xp} → ${r.level} ${r.stars}⭐  (انتظار: ${c.expect})`);
  }

  // --- تست ۲: شبیه‌سازی چرخه کامل ماموریت ---
  console.log("\n--- تست چرخه ماموریت ---");
  const phone = "09990000099";
  await prisma.userMission.deleteMany({ where: { user: { phone } } });
  await prisma.userMedal.deleteMany({ where: { user: { phone } } });
  await prisma.studySession.deleteMany({ where: { user: { phone } } });
  await prisma.activityLog.deleteMany({ where: { user: { phone } } });
  await prisma.user.deleteMany({ where: { phone } });

  const user = await prisma.user.create({
    data: { phone, name: "تست‌کاربر", onboardingDay: 6, coins: 100, xp: 0 },
  });
  console.log(`  ✅ کاربر ساخته شد (سکه: ${user.coins})`);

  const mission = await prisma.mission.findFirst({ where: { targetHours: 20 } });
  if (!mission) throw new Error("ماموریت ۲۰ ساعته یافت نشد — اول seed را اجرا کن");

  // خرید ماموریت (activatesAt را دیروز می‌گذاریم تا فوراً active شود برای تست)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const expiresAt = new Date(yesterday.getTime() + 7 * 24 * 60 * 60 * 1000);
  await prisma.user.update({ where: { id: user.id }, data: { coins: { decrement: mission.entryCost } } });
  const um = await prisma.userMission.create({
    data: { userId: user.id, missionId: mission.id, activatesAt: yesterday, expiresAt, status: "active" },
  });
  console.log(`  ✅ ماموریت ${mission.targetHours} ساعته خریده شد (هزینه ${mission.entryCost} سکه)`);

  // ثبت ۲۰ ساعت مطالعه (= هدف)
  await prisma.studySession.create({
    data: {
      userId: user.id,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endTime: new Date(),
      durationMin: 20 * 60,
      xpEarned: 80,
      coinsEarned: 80,
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { xp: { increment: 80 }, coins: { increment: 80 } } });
  console.log(`  ✅ ۲۰ ساعت مطالعه ثبت شد`);

  // اجرای processUserMissions (شبیه‌سازی منطق lib/mission.ts بدون SSE)
  const agg = await prisma.studySession.aggregate({
    where: { userId: user.id, startTime: { gte: um.activatesAt } },
    _sum: { durationMin: true },
  });
  const studiedMin = agg._sum.durationMin ?? 0;
  const targetMin = mission.targetHours * 60;
  console.log(`  مطالعه: ${studiedMin} دقیقه / هدف: ${targetMin} دقیقه`);

  if (studiedMin >= targetMin) {
    await prisma.userMission.update({ where: { id: um.id }, data: { status: "completed", completedAt: new Date() } });
    await prisma.user.update({ where: { id: user.id }, data: { xp: { increment: mission.xpReward } } });
    const medal = await prisma.medal.findUnique({ where: { targetHours: mission.targetHours } });
    if (medal) await prisma.userMedal.create({ data: { userId: user.id, medalId: medal.id } });
    console.log(`  ✅ ماموریت تکمیل شد → +${mission.xpReward} XP + مدال ${mission.targetHours} ساعته`);
  }

  // بررسی نتیجه نهایی
  const finalUser = await prisma.user.findUnique({ where: { id: user.id } });
  const medals = await prisma.userMedal.count({ where: { userId: user.id } });
  const completedMissions = await prisma.userMission.count({ where: { userId: user.id, status: "completed" } });
  console.log(`\n  📊 نتیجه نهایی:`);
  console.log(`     XP: ${finalUser?.xp} | سکه: ${finalUser?.coins} | مدال: ${medals} | ماموریت کامل: ${completedMissions}`);

  const ok = finalUser?.xp === 80 + mission.xpReward && medals === 1 && completedMissions === 1;
  console.log(ok ? "\n  ✅✅✅ حلقه گیمیفیکیشن درست کار می‌کند!" : "\n  ❌ مشکلی در حلقه هست");

  // پاکسازی
  await prisma.userMission.deleteMany({ where: { userId: user.id } });
  await prisma.userMedal.deleteMany({ where: { userId: user.id } });
  await prisma.studySession.deleteMany({ where: { userId: user.id } });
  await prisma.activityLog.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("\n  🧹 داده‌های تست پاک شد");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
