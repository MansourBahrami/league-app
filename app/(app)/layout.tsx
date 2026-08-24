import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUnreadCount } from "@/lib/inbox";
import { hasOnboardingHint, ONBOARDING_HINTS } from "@/lib/onboarding-hints";
import { isMessengerPromptSnoozed } from "@/lib/messenger-prompt";
import { isSetupPromptSnoozed } from "@/lib/setup-prompt";
import AppShell from "@/components/layout/AppShell";
import AnalyticsIdentity from "@/components/analytics/AnalyticsIdentity";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, completedSession, unreadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, xp: true, coins: true, level: true, stars: true, avatarUrl: true, isLeadComplete: true, onboardingDay: true, onboardingHints: true, phone: true, telegramId: true, baleId: true, setupPromptSnoozedAt: true, messengerPromptDismissedAt: true },
    }),
    prisma.studySession.findFirst({
      where: { userId: session.userId, endTime: { not: null }, durationMin: { gte: 15 } },
      select: { id: true },
    }),
    getUnreadCount(session.userId),
  ]);

  if (!user) redirect("/login");

  const hasMessenger = !!(user.telegramId || user.baleId);
  const botAvailability = {
    telegram: !!process.env.TELEGRAM_BOT_USERNAME,
    bale: !!process.env.BALE_BOT_USERNAME,
  };
  const hasAvailableBot = botAvailability.telegram || botAvailability.bale;
  const setupHandled = hasOnboardingHint(user.onboardingHints, ONBOARDING_HINTS.PUSH_PROMPTED)
    && hasOnboardingHint(user.onboardingHints, ONBOARDING_HINTS.INSTALL_PROMPTED);

  const showBotConnect = setupHandled
    && hasAvailableBot
    && completedSession !== null
    && !hasMessenger
    && !isMessengerPromptSnoozed(user.messengerPromptDismissedAt);

  const needsLead = user.onboardingDay >= 1 && !user.isLeadComplete;

  return (
    <>
      <AnalyticsIdentity userId={user.id} />
      <AppShell
        user={user}
        onboardingHints={user.onboardingHints}
        hasCompletedSession={completedSession !== null}
        setupPromptSnoozed={isSetupPromptSnoozed(user.setupPromptSnoozedAt)}
        needsLead={needsLead}
        hasPhone={!!user.phone}
        unreadCount={unreadCount}
        showBotConnect={showBotConnect}
        botAvailability={botAvailability}
      >
        {children}
      </AppShell>
    </>
  );
}
