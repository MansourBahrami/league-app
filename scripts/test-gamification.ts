import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { calcLevel, type MedalCount } from "../lib/gamification";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });
const phone = `gamification-test-${crypto.randomBytes(8).toString("hex")}`;

async function cleanup() {
  const user = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
  if (!user) return;

  await prisma.userMission.deleteMany({ where: { userId: user.id } });
  await prisma.userMedal.deleteMany({ where: { userId: user.id } });
  await prisma.studySession.deleteMany({ where: { userId: user.id } });
  await prisma.activityLog.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

async function main() {
  console.log("🧪 تست حلقه گیمیفیکیشن\n");

  // --- تست ۱: calcLevel با assertion واقعی ---
  console.log("--- تست calcLevel ---");
  const cases: Array<{
    desc: string;
    xp: number;
    medals: MedalCount[];
    expectLevel: string;
    expectStars: number;
  }> = [
    { desc: "زیر ۸ XP", xp: 5, medals: [], expectLevel: "تازه‌نفس", expectStars: 1 },
    { desc: "از ۸ XP", xp: 8, medals: [], expectLevel: "تازه‌نفس", expectStars: 2 },
    { desc: "XP کافی برای تازه‌نفس ۳", xp: 100, medals: [], expectLevel: "تازه‌نفس", expectStars: 3 },
    { desc: "مدال ۳۰ بدون مدال ۲۵ کافی نیست", xp: 600, medals: [{ targetHours: 30, count: 1 }], expectLevel: "تازه‌نفس", expectStars: 3 },
    { desc: "مدال‌های ۲۵ و ۳۰ با هم", xp: 600, medals: [{ targetHours: 25, count: 1 }, { targetHours: 30, count: 1 }], expectLevel: "ثابت‌قدم", expectStars: 2 },
    { desc: "مدال ۴۰ بدون دو مدال ۳۵ کافی نیست", xp: 1300, medals: [{ targetHours: 40, count: 1 }], expectLevel: "تازه‌نفس", expectStars: 3 },
    { desc: "دو مدال ۳۵ و یک مدال ۴۰ با هم", xp: 1300, medals: [{ targetHours: 35, count: 2 }, { targetHours: 40, count: 1 }], expectLevel: "پیشرو", expectStars: 1 },
    { desc: "الگو ۱ مستقل از XP", xp: 10, medals: [{ targetHours: 70, count: 1 }], expectLevel: "الگو", expectStars: 1 },
    { desc: "الگو فوق‌ستاره مستقل از XP", xp: 10, medals: [{ targetHours: 70, count: 2 }], expectLevel: "الگو", expectStars: 2 },
  ];
  for (const c of cases) {
    const r = calcLevel(c.xp, c.medals);
    assert.deepEqual(
      { level: r.level, stars: r.stars },
      { level: c.expectLevel, stars: c.expectStars },
      c.desc,
    );
    console.log(`  ✅ ${c.desc}: ${r.level} ${r.stars}⭐`);
  }

  // --- تست ۲: شبیه‌سازی چرخه کامل ماموریت ---
  console.log("\n--- تست چرخه ماموریت ---");
  await cleanup();

  const user = await prisma.user.create({
    data: { phone, name: "تست‌کاربر", onboardingDay: 6, coins: 100, xp: 0 },
  });
  console.log(`  ✅ کاربر ساخته شد (سکه: ${user.coins})`);

  const mission = await prisma.mission.findFirst({ where: { targetHours: 20 } });
  assert(mission, "ماموریت ۲۰ ساعته یافت نشد — اول seed را اجرا کن");

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

  assert(studiedMin >= targetMin, "زمان مطالعه باید به هدف مأموریت برسد");
  await prisma.userMission.update({ where: { id: um.id }, data: { status: "completed", completedAt: new Date() } });
  await prisma.user.update({ where: { id: user.id }, data: { xp: { increment: mission.xpReward } } });
  const medal = await prisma.medal.findUnique({ where: { targetHours: mission.targetHours } });
  assert(medal, `مدال ${mission.targetHours} ساعته پیدا نشد`);
  await prisma.userMedal.create({ data: { userId: user.id, medalId: medal.id } });
  console.log(`  ✅ ماموریت تکمیل شد → +${mission.xpReward} XP + مدال ${mission.targetHours} ساعته`);

  // بررسی نتیجه نهایی
  const finalUser = await prisma.user.findUnique({ where: { id: user.id } });
  const medals = await prisma.userMedal.count({ where: { userId: user.id } });
  const completedMissions = await prisma.userMission.count({ where: { userId: user.id, status: "completed" } });
  console.log(`\n  📊 نتیجه نهایی:`);
  console.log(`     XP: ${finalUser?.xp} | سکه: ${finalUser?.coins} | مدال: ${medals} | ماموریت کامل: ${completedMissions}`);

  assert.equal(finalUser?.xp, 80 + mission.xpReward, "XP نهایی نادرست است");
  assert.equal(medals, 1, "مدال مأموریت ثبت نشده است");
  assert.equal(completedMissions, 1, "ماموریت completed نشده است");
  console.log("\n  ✅✅✅ حلقه گیمیفیکیشن درست کار می‌کند!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
      console.log("\n  🧹 داده‌های تست پاک شد");
    } catch (error) {
      console.error("خطا در پاکسازی تست:", error);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  });
