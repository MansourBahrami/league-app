import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processUserMissions } from "@/lib/mission";
import { getCurrentMissionRoomSnapshots, pickMissionRoomToOpen } from "@/lib/mission-room";
import { formatJalaliLong, getNextTehranMissionWeek } from "@/lib/date";
import { suggestMissions } from "@/lib/gamification";
import MissionRoomChooser, { type MissionChoice } from "@/components/mission-rooms/MissionRoomChooser";
import ActionGuidanceModal from "@/components/onboarding/ActionGuidanceModal";
import { ONBOARDING_HINTS } from "@/lib/onboarding-hints";
import SectionInfoButton from "@/components/ui/SectionInfoButton";

export const dynamic = "force-dynamic";

function selectClosest<T extends { targetHours: number }>(items: T[], target: number, take = 3): T[] {
  return [...items]
    .sort((a, b) => Math.abs(a.targetHours - target) - Math.abs(b.targetHours - target))
    .slice(0, take)
    .sort((a, b) => a.targetHours - b.targetHours);
}

export default async function MissionRoomsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await processUserMissions(session.userId);
  const now = new Date();
  const rooms = await getCurrentMissionRoomSnapshots(session.userId);
  const roomToOpen = pickMissionRoomToOpen(rooms);
  if (roomToOpen) redirect(`/mission-rooms/${roomToOpen.id}`);

  const [user, allDaily, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { coins: true, onboardingDay: true },
    }),
    prisma.mission.findMany({ where: { kind: "daily", isActive: true }, orderBy: { targetHours: "asc" } }),
    prisma.studySession.aggregate({
      where: { userId: session.userId, startTime: { gte: new Date(now.getTime() - 7 * 86400000) } },
      _sum: { durationMin: true },
    }),
  ]);
  if (!user) redirect("/login");

  const avgHours = ((sessions._sum.durationMin ?? 0) / 60) / 7;
  const dailyRecommended = selectClosest(allDaily, Math.max(3, avgHours), 3);
  const suggestedTargets = suggestMissions(avgHours).map((mission) => mission.targetHours);
  const weeklyMissions = await prisma.mission.findMany({
    where: { kind: "weekly", isActive: true, targetHours: { in: suggestedTargets } },
    orderBy: { targetHours: "asc" },
  });
  const weeklyChoices = weeklyMissions.length > 0
    ? weeklyMissions
    : await prisma.mission.findMany({ where: { kind: "weekly", isActive: true }, orderBy: { targetHours: "asc" }, take: 3 });

  const toChoice = (mission: typeof allDaily[number], recommendedTarget: number): MissionChoice => ({
    id: mission.id,
    kind: mission.kind === "daily" ? "daily" : "weekly",
    targetHours: mission.targetHours,
    entryCost: mission.entryCost,
    xpReward: mission.xpReward,
    coinReward: mission.coinReward,
    recommended: mission.targetHours === recommendedTarget,
  });
  const dailyTarget = dailyRecommended.reduce((best, mission) =>
    Math.abs(mission.targetHours - Math.max(3, avgHours)) < Math.abs(best - Math.max(3, avgHours)) ? mission.targetHours : best,
    dailyRecommended[0]?.targetHours ?? 3
  );
  const weeklyTarget = suggestedTargets[0] ?? weeklyChoices[0]?.targetHours ?? 20;
  const dailyChoices = dailyRecommended.map((mission) => toChoice(mission, dailyTarget));
  const weeklyChoiceRows = weeklyChoices.map((mission) => toChoice(mission, weeklyTarget));

  const weeklyWindow = getNextTehranMissionWeek(now);

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <header data-tour="mission-rooms" className="glass-card rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>meeting_room</span>
          </span>
          <div className="min-w-0 flex-1 text-right">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[18px] font-extrabold text-on-surface">اتاق مأموریت</h1>
              <SectionInfoButton
                title="اتاق مأموریت چطوری کار می‌کنه؟"
                description="اینجا هدفت رو انتخاب می‌کنی و کنار بچه‌هایی که دقیقاً همین هدف رو دارن درس می‌خونی."
                points={[
                  "مأموریت روزانه: برای هدف‌گذاری امروز و گرفتن سکه جایزه.",
                  "مأموریت هفتگی: برای ایجاد عادت خفن مطالعه، گرفتن کلی XP و مدال‌های ارتقای سطح.",
                  "مأموریتی که می‌خری از فردا صبح فعال می‌شه."
                ]}
              />
            </div>
            <p className="mt-0.5 text-[11.5px] text-on-surface-variant">هدفت را انتخاب کن و با هم‌هدف‌هایت جلو برو.</p>
          </div>
          <span className="rounded-full bg-tertiary-fixed/60 px-2.5 py-1 text-[11px] font-bold text-tertiary">{user.coins.toLocaleString("fa-IR")} سکه</span>
        </div>
      </header>

      <ActionGuidanceModal
        hint={ONBOARDING_HINTS.MISSION_ROOMS_EXPLAINED}
        eyebrow="اتاق‌های مأموریت"
        title="مأموریتت رو انتخاب کن!"
        description={user.onboardingDay < 1
          ? "اتاق‌های مأموریت بعد از روز اول باز می‌شن. فعلاً ۱ ساعت مطالعه امروزت رو کامل کن تا بتونی مأموریت برداری."
          : "یک مأموریت روزانه یا هفتگی بردار تا از فردا کنار بچه‌هایی که همین هدف رو دارن درس بخونی و مدال بگیری."}
        icon="meeting_room"
        actionText="انتخاب مأموریت"
        points={[
          "مأموریت روزانه سکه جایزه میده و مأموریت هفتگی XP بالا + مدال ارتقای سطح.",
          "مأموریتی که می‌خری از فردا فعال می‌شه و مطالعه امروزت آزاده."
        ]}
      />

      <MissionRoomChooser
        daily={dailyChoices}
        weekly={weeklyChoiceRows}
        userCoins={user.coins}
        onboardingLocked={user.onboardingDay < 1}
        weeklyEnrollmentOpen={weeklyWindow.enrollmentOpen}
        weeklyStartsLabel={formatJalaliLong(weeklyWindow.startsAt, true)}
      />

      <p className="px-4 text-center text-[10.5px] leading-5 text-outline">
        زمان مطالعه با تایمر G-camp ثبت می‌شود؛ پاداش هر عضو مستقل از عملکرد بقیه است.
      </p>
    </div>
  );
}
