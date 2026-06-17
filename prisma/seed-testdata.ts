/**
 * داده‌ی تست برای محیط محلی — یوزرهای متنوع برای پوشش حالت‌های مختلف اپ.
 * اجرا: npx tsx prisma/seed-testdata.ts
 * idempotent: یوزرهای تستی (شماره با پیشوند 091200000) را پاک و دوباره می‌سازد.
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tehranDayStart } from "../lib/date";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const day0 = tehranDayStart();
const daysAgo = (n: number) => new Date(day0.getTime() - n * 86400000);
const xpOf = (min: number) => Math.floor(min / 15);

// یک جلسه‌ی مطالعه‌ی تمام‌شده در روزِ `agoDays` پیش
function session(userId: string, agoDays: number, durationMin: number) {
  const start = new Date(daysAgo(agoDays).getTime() + 10 * 3600000); // ساعت ۱۰ صبح آن روز
  return {
    userId,
    startTime: start,
    endTime: new Date(start.getTime() + durationMin * 60000),
    durationMin,
    plannedMin: durationMin,
    xpEarned: xpOf(durationMin),
    coinsEarned: xpOf(durationMin),
    tickCount: 0,
  };
}

async function main() {
  console.log("Seeding TEST data...");

  // پاک‌سازی یوزرهای تستی قبلی
  const olds = await prisma.user.findMany({
    where: { phone: { startsWith: "091200000" } },
    select: { id: true },
  });
  const ids = olds.map((u) => u.id);
  if (ids.length) {
    await prisma.studySession.deleteMany({ where: { userId: { in: ids } } });
    await prisma.videoProgress.deleteMany({ where: { userId: { in: ids } } });
    await prisma.userMission.deleteMany({ where: { userId: { in: ids } } });
    await prisma.activityLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    console.log(`🧹 ${ids.length} یوزر تستی قبلی پاک شد`);
  }

  const sessions: ReturnType<typeof session>[] = [];

  // ۱) آرش — آنبوردینگ از صفر (روز ۱)، اسلایدها هنوز دیده نشده، لید ناقص، گروه free
  const u1 = await prisma.user.create({
    data: {
      phone: "09120000001", name: "آرش آنبورد", grade: "دهم", field: "ریاضی",
      xp: 0, coins: 0, level: "تازه‌نفس", stars: 1,
      onboardingDay: 0, hasSeenIntro: false, isLeadComplete: false, videoAccess: "free",
    },
  });

  // ۲) بهار — وسط آنبوردینگ (روز ۳)، لید کامل، free، استریک ۲
  const u2 = await prisma.user.create({
    data: {
      phone: "09120000002", name: "بهار روزسه", grade: "دوازدهم", field: "تجربی",
      xp: 40, coins: 30, level: "تازه‌نفس", stars: 2,
      onboardingDay: 2, onboardingStepMinutes: 60, hasSeenIntro: true, isLeadComplete: true,
      pastAvgStudyHours: 1.5, day1GoalMinutes: 90, videoAccess: "free",
      streak: 2, lastStudyDate: day0,
    },
  });
  sessions.push(session(u2.id, 1, 90), session(u2.id, 0, 60));

  // ۳) پیمان — گروه paid (تست خرید ویدیو)، روز ۱، ۱۰ سکه‌ی اولیه
  const u3 = await prisma.user.create({
    data: {
      phone: "09120000003", name: "پیمان پولی", grade: "یازدهم", field: "ریاضی",
      xp: 0, coins: 10, level: "تازه‌نفس", stars: 1,
      onboardingDay: 0, hasSeenIntro: true, isLeadComplete: true, videoAccess: "paid",
    },
  });

  // ۴) ترانه — آنبوردینگ تمام‌شده، بدون ماموریت فعال (تست دکمه‌ی انتخاب ماموریت)، استریک ۴
  const u4 = await prisma.user.create({
    data: {
      phone: "09120000004", name: "ترانه فارغ", grade: "فارغ‌التحصیل", field: "تجربی",
      xp: 120, coins: 80, level: "تازه‌نفس", stars: 3,
      onboardingDay: 6, hasSeenIntro: true, isLeadComplete: true, videoAccess: "free",
      streak: 4, lastStudyDate: day0,
    },
  });
  // جلسه‌ها در ۱۴ روز اخیر (برای گزارش تقویمی) + ۷ روز اخیر (برای لیدربورد)
  for (const [ago, min] of [[0, 120], [1, 90], [2, 150], [4, 60], [6, 100], [9, 80], [12, 110]] as const) {
    sessions.push(session(u4.id, ago, min));
  }

  // ۵) حسام — آنبوردینگ تمام، با ماموریت هفتگی فعال (تست دو پراگرس‌بار + روز جبران)
  const u5 = await prisma.user.create({
    data: {
      phone: "09120000005", name: "حسام ماموریت", grade: "دوازدهم", field: "ریاضی",
      xp: 200, coins: 50, level: "تازه‌نفس", stars: 3,
      onboardingDay: 6, hasSeenIntro: true, isLeadComplete: true, videoAccess: "free",
      streak: 3, lastStudyDate: day0,
    },
  });
  const mission = (await prisma.mission.findFirst({ where: { targetHours: 30 } }))
    ?? (await prisma.mission.findFirst({ orderBy: { targetHours: "asc" } }));
  if (mission) {
    const activatesAt = daysAgo(2); // روز سوم ماموریت
    await prisma.userMission.create({
      data: {
        userId: u5.id, missionId: mission.id,
        activatesAt, expiresAt: new Date(activatesAt.getTime() + 7 * 86400000),
        status: "active",
      },
    });
    // مطالعه‌ی هفته‌ی ماموریت: ۶ساعت + ۵ساعت + امروز ۳ساعت
    sessions.push(session(u5.id, 2, 360), session(u5.id, 1, 300), session(u5.id, 0, 180));
  }

  // ۶) زهرا — رتبه‌ی بالای لیدربورد (XP زیاد در ۷ روز اخیر)
  const u6 = await prisma.user.create({
    data: {
      phone: "09120000006", name: "زهرا رتبه", grade: "دوازدهم", field: "تجربی",
      xp: 400, coins: 120, level: "تازه‌نفس", stars: 3,
      onboardingDay: 6, hasSeenIntro: true, isLeadComplete: true, videoAccess: "paid",
      streak: 6, lastStudyDate: day0,
    },
  });
  for (const [ago, min] of [[0, 240], [1, 200], [2, 220], [3, 180], [5, 160]] as const) {
    sessions.push(session(u6.id, ago, min));
  }

  // ۷) مدیر تست — دسترسی به پنل ادمین محلی
  await prisma.user.create({
    data: {
      phone: "09120000009", name: "مدیر تست", grade: "دوازدهم", field: "ریاضی",
      xp: 300, coins: 200, level: "ثابت‌قدم", stars: 1,
      onboardingDay: 6, hasSeenIntro: true, isLeadComplete: true, videoAccess: "free",
      role: "admin",
    },
  });

  await prisma.studySession.createMany({ data: sessions });

  console.log(`✅ ۷ یوزر تستی ساخته شد + ${sessions.length} جلسه‌ی مطالعه`);
  console.log("شماره‌ها برای ورود (کد OTP در dev توی پاسخ/کنسول نشان داده می‌شود):");
  console.log("  09120000001 آرش — آنبوردینگ از صفر (اسلایدها + لید اجباری بعد روز۱)");
  console.log("  09120000002 بهار — وسط آنبوردینگ روز ۳");
  console.log("  09120000003 پیمان — گروه paid (خرید ویدیو)");
  console.log("  09120000004 ترانه — بعد آنبوردینگ، بدون ماموریت (دکمه انتخاب)");
  console.log("  09120000005 حسام — بعد آنبوردینگ، با ماموریت هفتگی فعال (دو پراگرس‌بار)");
  console.log("  09120000006 زهرا — رتبه‌ی بالای لیدربورد، گروه paid");
  console.log("  09120000009 مدیر تست — role=admin (پنل /admin)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
