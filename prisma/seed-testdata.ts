/**
 * داده‌ی تست برای محیط محلی — یوزرهای متنوع برای پوشش حالت‌های مختلف اپ.
 * اجرا: npx tsx prisma/seed-testdata.ts
 * idempotent: یوزرهای تستی (شماره با پیشوند 091200000) را پاک و دوباره می‌سازد.
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tehranDayStart } from "../lib/date";
import { calcLevel } from "../lib/gamification";
import { REACTION_EMOJIS } from "../lib/reaction";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const day0 = tehranDayStart();
const daysAgo = (n: number) => new Date(day0.getTime() - n * 86400000);
const xpOf = (min: number) => Math.floor(min / 15);

// شمارش مدال‌ها به‌تفکیک ساعت (ورودی calcLevel)
function medalCounts(hoursList: number[]) {
  const m = new Map<number, number>();
  for (const h of hoursList) m.set(h, (m.get(h) ?? 0) + 1);
  return [...m].map(([targetHours, count]) => ({ targetHours, count }));
}

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
    await prisma.reaction.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { targetUserId: { in: ids } }] } });
    await prisma.inboxItem.deleteMany({ where: { OR: [{ userId: { in: ids } }, { actorId: { in: ids } }] } });
    await prisma.friendship.deleteMany({ where: { OR: [{ userId: { in: ids } }, { friendId: { in: ids } }] } });
    await prisma.userMedal.deleteMany({ where: { userId: { in: ids } } });
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

  // ===================================================================
  // کاربران پیشرفته‌تر: مدال‌های متنوع + سطح بالا + جلسه‌های زیاد (لیدربورد)
  // ===================================================================
  const medals = await prisma.medal.findMany({ select: { id: true, targetHours: true } });
  const medalIdByHours = new Map(medals.map((m) => [m.targetHours, m.id]));
  if (medals.length === 0) {
    console.warn("⚠️ هیچ مدالی در DB نیست — اول `npm run db:seed` را اجرا کن. مدال‌ها رد شدند.");
  }

  // ساخت کاربر + اعطای مدال‌ها + محاسبه‌ی خودکار سطح/ستاره از روی XP و مدال‌ها
  async function richUser(opts: {
    phone: string; name: string; grade: string; field: string;
    xp: number; coins: number; streak: number; avatar: string; medalHours: number[];
    sessionPlan: readonly (readonly [number, number])[];
  }) {
    const { level, stars } = calcLevel(opts.xp, medalCounts(opts.medalHours));
    const u = await prisma.user.create({
      data: {
        phone: opts.phone, name: opts.name, grade: opts.grade, field: opts.field,
        xp: opts.xp, coins: opts.coins, level, stars,
        onboardingDay: 6, hasSeenIntro: true, isLeadComplete: true, videoAccess: "free",
        streak: opts.streak, lastStudyDate: day0, avatarUrl: `/avatars/${opts.avatar}.svg`,
      },
    });
    const grantable = opts.medalHours.filter((h) => medalIdByHours.has(h));
    if (grantable.length) {
      await prisma.userMedal.createMany({
        data: grantable.map((h, i) => ({
          userId: u.id, medalId: medalIdByHours.get(h)!,
          earnedAt: daysAgo(grantable.length - i), // مدال‌ها در روزهای مختلف کسب شده‌اند
        })),
      });
    }
    for (const [ago, min] of opts.sessionPlan) sessions.push(session(u.id, ago, min));
    return u;
  }

  // ۸) کیان — سطح «پیشرو»، مدال‌های زیاد، صدرنشین لیدربورد
  const u8 = await richUser({
    phone: "09120000008", name: "کیان قهرمان", grade: "دوازدهم", field: "ریاضی",
    xp: 2600, coins: 320, streak: 12, avatar: "a1",
    medalHours: [20, 25, 30, 35, 40, 45, 45, 45],
    sessionPlan: [[0, 300], [1, 280], [2, 260], [3, 240], [4, 300], [5, 220], [6, 260]],
  });

  // ۹) نیلوفر — سطح «ثابت‌قدم» ⭐۳، مجموعه‌ی کامل مدال‌های پایه
  const u9 = await richUser({
    phone: "09120000010", name: "نیلوفر ساعی", grade: "یازدهم", field: "تجربی",
    xp: 850, coins: 140, streak: 7, avatar: "a2",
    medalHours: [20, 25, 30, 35],
    sessionPlan: [[0, 180], [1, 200], [2, 160], [3, 140], [5, 150], [8, 120]],
  });

  // ۱۰) سامان — تازه به «ثابت‌قدم» رسیده (یک مدال ۲۰ساعته)
  const u10 = await richUser({
    phone: "09120000011", name: "سامان میانه", grade: "دهم", field: "ریاضی",
    xp: 350, coins: 60, streak: 3, avatar: "a3",
    medalHours: [20],
    sessionPlan: [[0, 120], [2, 90], [4, 100], [7, 80]],
  });

  // ۱۱) رها — تازه‌نفس، بدون مدال (برای مقایسه‌ی پایین جدول)
  const u11 = await richUser({
    phone: "09120000012", name: "رها نوگل", grade: "نهم", field: "—",
    xp: 30, coins: 10, streak: 1, avatar: "a4",
    medalHours: [],
    sessionPlan: [[0, 45], [3, 60]],
  });

  // مدال هم به چند یوزر قبلی بدهیم تا پروفایلشان مدال داشته باشد
  async function grantMedals(userId: string, hours: number[]) {
    const grantable = hours.filter((h) => medalIdByHours.has(h));
    if (!grantable.length) return;
    await prisma.userMedal.createMany({
      data: grantable.map((h, i) => ({ userId, medalId: medalIdByHours.get(h)!, earnedAt: daysAgo(grantable.length - i) })),
    });
  }
  // اعطای مدال + هم‌زمان به‌روزرسانی سطح/ستاره‌ی ذخیره‌شده تا با XP+مدال هم‌خوان بماند
  async function grantAndRelevel(userId: string, xp: number, hours: number[]) {
    await grantMedals(userId, hours);
    const { level, stars } = calcLevel(xp, medalCounts(hours.filter((h) => medalIdByHours.has(h))));
    await prisma.user.update({ where: { id: userId }, data: { level, stars } });
  }
  await grantAndRelevel(u5.id, 200, [20]);      // حسام → ثابت‌قدم
  await grantAndRelevel(u6.id, 400, [20, 25]);  // زهرا → ثابت‌قدم

  console.log("✅ مدال‌ها اعطا شد (UserMedal) و سطح‌ها هم‌خوان شد");

  // ===================================================================
  // ۱۲) مانی — دقیقاً وسط آنبوردینگ: روز ۳ از ۶، روزهای ۱و۲ کامل،
  //     پیشرفتِ امروز نیمه‌کاره (دقیقه‌ها ~۳۳٪ هدف، ویدیوی روز ۳ هنوز دیده‌نشده).
  // ===================================================================
  const todayMin = 60; // دقیقه‌های مطالعه‌ی امروز (روز جاری آنبوردینگ، ناتمام)
  const u12 = await prisma.user.create({
    data: {
      phone: "09120000007", name: "مانی وسط‌راه", grade: "یازدهم", field: "ریاضی",
      xp: xpOf(90) + xpOf(120) + xpOf(todayMin), coins: xpOf(90) + xpOf(120) + xpOf(todayMin),
      level: "تازه‌نفس", stars: 2,
      // ۲ روز کامل‌شده → روز جاری = ۳. اسلایدها دیده، لید کامل، گروه free.
      onboardingDay: 2,
      onboardingStepMinutes: todayMin, // پیشرفت امروز (چون lastStudyDate=امروز، نمایش داده می‌شود)
      hasSeenIntro: true, isLeadComplete: true, videoAccess: "free",
      pastAvgStudyHours: 2, day1GoalMinutes: 120, // snapshot هدف روز اول
      streak: 3, lastStudyDate: day0, avatarUrl: "/avatars/a5.svg",
    },
  });
  // جلسه‌های دو روز کامل + جلسه‌ی نیمه‌کاره‌ی امروز
  sessions.push(session(u12.id, 2, 90), session(u12.id, 1, 120), session(u12.id, 0, todayMin));
  // ویدیوهای روز ۱ و ۲ دیده شده (آن روزها کامل‌اند)؛ ویدیوی روز ۳ هنوز نه.
  const onbVideos = await prisma.video.findMany({ where: { day: { in: [1, 2] }, isActive: true }, select: { id: true } });
  if (onbVideos.length) {
    await prisma.videoProgress.createMany({
      data: onbVideos.map((v) => ({
        userId: u12.id, videoId: v.id,
        watchedSeconds: 600, totalSeconds: 600, completed: true, rewardGiven: true,
        unlockedAt: daysAgo(2),
      })),
    });
  }
  console.log("✅ کاربر «وسط آنبوردینگ» ساخته شد (روز ۳ از ۶، پیشرفت امروز ناتمام)");

  // ===================================================================
  // شبکه‌ی دوستی (یک رکورد برای هر جفت؛ اپ با OR روی دو ستون کوئری می‌کند)
  // ===================================================================
  const pairs: [string, string][] = [
    [u4.id, u5.id], [u5.id, u6.id], [u4.id, u6.id], [u2.id, u4.id],
    [u8.id, u9.id], [u8.id, u6.id], [u9.id, u10.id], [u10.id, u11.id], [u5.id, u8.id],
    [u12.id, u2.id], [u12.id, u4.id],
  ];
  await prisma.friendship.createMany({
    data: pairs.map(([a, b]) => ({ userId: a, friendId: b, createdAt: daysAgo(3) })),
  });
  console.log(`✅ ${pairs.length} دوستی ساخته شد`);

  // ===================================================================
  // فید + واکنش + صندوق پیام (Reaction / InboxItem / ActivityLog)
  // ===================================================================
  // آیتم‌های فید (پایان جلسه) برای چند یوزر
  async function feedLog(userId: string, agoDays: number, durationMin: number) {
    return prisma.activityLog.create({
      data: {
        userId, type: "session_complete",
        metadata: { durationMin, xp: xpOf(durationMin), coins: xpOf(durationMin) },
        createdAt: new Date(daysAgo(agoDays).getTime() + 18 * 3600000),
      },
    });
  }
  const logU4 = await feedLog(u4.id, 0, 120);
  const logU6 = await feedLog(u6.id, 0, 240);
  const logU8 = await feedLog(u8.id, 0, 300);
  const logU9 = await feedLog(u9.id, 1, 180);
  // مدال‌گرفتن کیان هم در فید
  await prisma.activityLog.create({
    data: { userId: u8.id, type: "medal_earn", metadata: { hours: 45 }, createdAt: daysAgo(1) },
  });

  // واکنش‌ها + صندوقِ گیرنده
  async function react(actorId: string, log: { id: string; userId: string }, emoji: string) {
    await prisma.reaction.create({
      data: { actorId, activityId: log.id, targetUserId: log.userId, emoji },
    });
    await prisma.inboxItem.create({
      data: {
        userId: log.userId, type: "reaction", actorId,
        metadata: { emoji, activityType: "session_complete" },
        createdAt: new Date(),
      },
    });
  }
  await react(u5.id, logU4, REACTION_EMOJIS[0]); // حسام 🔥 به ترانه
  await react(u6.id, logU4, REACTION_EMOJIS[1]); // زهرا 👏 به ترانه
  await react(u4.id, logU6, REACTION_EMOJIS[3]); // ترانه ❤️ به زهرا
  await react(u9.id, logU8, REACTION_EMOJIS[2]); // نیلوفر 💪 به کیان
  await react(u8.id, logU9, REACTION_EMOJIS[4]); // کیان 🎯 به نیلوفر

  // صندوق: جایزه‌ی واکنش + پیام سیستمی خوش‌آمد
  await prisma.inboxItem.create({
    data: { userId: u4.id, type: "reaction_reward", metadata: { coins: 5 }, createdAt: new Date() },
  });
  await prisma.inboxItem.create({
    data: { userId: u11.id, type: "system", body: "به لیگ خوش اومدی! اولین جلسه‌ی مطالعه‌ت رو شروع کن 🎯", createdAt: daysAgo(1) },
  });
  console.log("✅ فید/واکنش/صندوق پیام ساخته شد");

  await prisma.studySession.createMany({ data: sessions });

  console.log(`✅ ۱۲ یوزر تستی ساخته شد + ${sessions.length} جلسه‌ی مطالعه`);
  console.log("شماره‌ها برای ورود (کد OTP در dev توی پاسخ/کنسول نشان داده می‌شود):");
  console.log("  09120000001 آرش — آنبوردینگ از صفر (اسلایدها + لید اجباری بعد روز۱)");
  console.log("  09120000002 بهار — وسط آنبوردینگ روز ۳");
  console.log("  09120000007 مانی — وسط آنبوردینگ روز ۳ از ۶، پیشرفت امروز ناتمام، ویدیوهای روز۱و۲ دیده");
  console.log("  09120000003 پیمان — گروه paid (خرید ویدیو)");
  console.log("  09120000004 ترانه — بعد آنبوردینگ، بدون ماموریت (دکمه انتخاب)");
  console.log("  09120000005 حسام — بعد آنبوردینگ، با ماموریت هفتگی فعال (دو پراگرس‌بار)");
  console.log("  09120000006 زهرا — رتبه‌ی بالای لیدربورد، گروه paid (+۲ مدال، دوست)");
  console.log("  09120000008 کیان — سطح «پیشرو»، ۸ مدال، صدرنشین، دوست‌های زیاد");
  console.log("  09120000010 نیلوفر — سطح «ثابت‌قدم»⭐۳، ۴ مدال، دوست");
  console.log("  09120000011 سامان — تازه به «ثابت‌قدم»، ۱ مدال");
  console.log("  09120000012 رها — تازه‌نفس بدون مدال، پیام خوش‌آمد در صندوق");
  console.log("  09120000009 مدیر تست — role=admin (پنل /admin)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
