import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureVariant } from "@/lib/ab";
import { getUnreadCount } from "@/lib/inbox";
import { ONBOARDING_HINTS } from "@/lib/onboarding-hints";
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

  // قفل اپ تا تکمیل لید (بعد از روز اول، اطلاعات + موبایلِ تأییدشده اجباری است)
  const needsLead = user.onboardingDay >= 1 && !user.isLeadComplete;

  const hasMessenger = !!(user.telegramId || user.baleId);
  const setupHandled = user.onboardingHints.includes(ONBOARDING_HINTS.PUSH_PROMPTED)
    && user.onboardingHints.includes(ONBOARDING_HINTS.INSTALL_PROMPTED);
  const needsSessionCount = !setupHandled || (!hasMessenger && !user.messengerPromptDismissedAt);
  const completedSessions = needsSessionCount
    ? await prisma.studySession.count({
        where: { userId: user.id, endTime: { not: null }, durationMin: { gt: 0 } },
      })
    : 0;
  const botAvailability = {
    telegram: !!process.env.TELEGRAM_BOT_USERNAME,
    bale: !!process.env.BALE_BOT_USERNAME,
  };
  const hasAvailableBot = botAvailability.telegram || botAvailability.bale;
  const showBotConnect = setupHandled && hasAvailableBot && completedSessions > 0 && !hasMessenger && !user.messengerPromptDismissedAt;

  const unreadCount = await getUnreadCount(user.id);

  return (
    <AppShell
      user={user}
      onboardingHints={user.onboardingHints}
      hasCompletedSession={completedSessions > 0}
      needsLead={needsLead}
      hasPhone={!!user.phone}
      unreadCount={unreadCount}
      showBotConnect={showBotConnect}
      botAvailability={botAvailability}
    >
      {children}
    </AppShell>
  );
}
