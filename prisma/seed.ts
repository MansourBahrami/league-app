import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { MISSION_TABLE } from "../lib/gamification";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Medals
  const medalHours = [20, 25, 30, 35, 40, 45, 50, 53, 56, 60, 63, 66, 70];
  for (const hours of medalHours) {
    await prisma.medal.upsert({
      where: { targetHours: hours },
      update: {},
      create: { name: `مدال ${hours} ساعته`, targetHours: hours },
    });
  }
  console.log("✅ Medals seeded");

  // Missions
  const medals = await prisma.medal.findMany();
  const medalMap = new Map(medals.map((m) => [m.targetHours, m.id]));

  for (const m of MISSION_TABLE) {
    const existing = await prisma.mission.findFirst({ where: { targetHours: m.targetHours } });
    if (!existing) {
      await prisma.mission.create({
        data: {
          targetHours: m.targetHours,
          minAvgHours: m.minAvgHours,
          entryCost: m.entryCost,
          xpReward: m.xpReward,
          medalId: medalMap.get(m.targetHours) ?? null,
          description: `${m.targetHours} ساعت مطالعه در ۷ روز`,
        },
      });
    }
  }
  console.log("✅ Missions seeded");

  // Sample videos for onboarding
  const sampleVideos = [
    { day: 1, title: "تکنیک حفظ نکردن و یادگیری مفهوم و کلیدواژه", durationMin: 12, hlsUrl: "" },
    { day: 2, title: "روش مطالعه فعال و یادداشت‌برداری موثر", durationMin: 10, hlsUrl: "" },
    { day: 3, title: "استراتژی برنامه‌ریزی برای شروع از الان", durationMin: 15, hlsUrl: "" },
    { day: 4, title: "چطور ساعت مطالعه‌مونو ببریم بالا؟", durationMin: 13, hlsUrl: "" },
    { day: 5, title: "چطور سریع‌تر توی درسا پیشرفت کنیم؟", durationMin: 14, hlsUrl: "" },
    { day: 6, title: "تکنیک‌های پیشرفته مدیریت زمان", durationMin: 18, hlsUrl: "" },
  ];

  for (const v of sampleVideos) {
    const existing = await prisma.video.findFirst({ where: { day: v.day } });
    if (!existing) {
      // grades خالی = برای همه پایه‌ها نمایش داده می‌شود
      await prisma.video.create({ data: { ...v, grades: [], isActive: true } });
    }
  }
  console.log("✅ Onboarding videos seeded");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
