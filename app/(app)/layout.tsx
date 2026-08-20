import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureVariant } from "@/lib/ab";
import { getUnreadCount } from "@/lib/inbox";
import { hasOnboardingHint, ONBOARDING_HINTS } from "@/lib/onboarding-hints";
import { isMessengerPromptSnoozed } from "@/lib/messenger-prompt";
import AppShell from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, xp: true, coins: true, level: true, stars: true, avatarUrl: true, isLeadComplete: true, onboardingDay: true, onboardingHints: true, videoAccess: true, phone: true, telegramId: true, baleId: true, messengerPromptDismissedAt: true },
  });

  if (!user) redirect("/login");

  // تخصیص گروه A/B در اولین ورود (idempotent)
  if (!user.videoAccess) {
    await ensureVariant(user.id, user.videoAccess);
  }

  const hasMessenger = !!(user.telegramId || user.baleId);
  const completedSessions = await prisma.studySession.count({
    where: { userId: user.id, endTime: { not: null }, durationMin: { gte: 15 } },
  });
  const botAvailability = {
    telegram: !!process.env.TELEGRAM_BOT_USERNAME,
    bale: !!process.env.BALE_BOT_USERNAME,
  };
  const hasAvailableBot = botAvailability.telegram || botAvailability.bale;
  const setupHandled = hasOnboardingHint(user.onboardingHints, ONBOARDING_HINTS.PUSH_PROMPTED)
    && hasOnboardingHint(user.onboardingHints, ONBOARDING_HINTS.INSTALL_PROMPTED);
  const showBotConnect = setupHandled
    && hasAvailableBot
    && completedSessions > 0
    && !hasMessenger
    && !isMessengerPromptSnoozed(user.messengerPromptDismissedAt);

  // روز دوم به بعد: اگر هنوز ماموریتی برای امروز فعال نکرده است
  let showDay2Mission = false;
  if (setupHandled && user.onboardingDay >= 1 && !showBotConnect) {
    const activeMission = await prisma.userMission.findFirst({
      where: { userId: user.id, status: "active" },
    });
    showDay2Mission = !activeMission;
  }

  const unreadCount = await getUnreadCount(user.id);
  const needsLead = user.onboardingDay >= 1 && !user.isLeadComplete;

  return (
    <AppShell
      user={user}
      onboardingHints={user.onboardingHints}
      hasCompletedSession={completedSessions > 0}
      needsLead={needsLead}
      hasPhone={!!user.phone}
      unreadCount={unreadCount}
      showBotConnect={showBotConnect}
      showDay2Mission={showDay2Mission}
      botAvailability={botAvailability}
    >
      {children}
    </AppShell>
  );
}
