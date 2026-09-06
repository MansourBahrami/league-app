import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAppUserSnapshot } from "@/lib/app-user";
import { hasOnboardingHint, ONBOARDING_HINTS } from "@/lib/onboarding-hints";
import { isMessengerPromptSnoozed } from "@/lib/messenger-prompt";
import { isSetupPromptSnoozed } from "@/lib/setup-prompt";
import AppShell from "@/components/layout/AppShell";
import AnalyticsIdentity from "@/components/analytics/AnalyticsIdentity";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getAppUserSnapshot(session.userId);

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
    && user.hasCompletedStudySession
    && !hasMessenger
    && !isMessengerPromptSnoozed(user.messengerPromptDismissedAt);

  const needsLead = user.onboardingDay >= 1 && !user.isLeadComplete;

  return (
    <>
      <AnalyticsIdentity userId={user.id} />
      <AppShell
        user={{
          id: user.id,
          name: user.name,
          xp: user.xp,
          coins: user.coins,
          level: user.level,
          stars: user.stars,
          avatarUrl: user.avatarUrl,
          isLeadComplete: user.isLeadComplete,
          onboardingDay: user.onboardingDay,
        }}
        onboardingHints={user.onboardingHints}
        hasCompletedSession={user.hasCompletedStudySession}
        setupPromptSnoozed={isSetupPromptSnoozed(user.setupPromptSnoozedAt)}
        needsLead={needsLead}
        hasPhone={!!user.phone}
        unreadCount={user.unreadInboxCount}
        showBotConnect={showBotConnect}
        botAvailability={botAvailability}
      >
        {children}
      </AppShell>
    </>
  );
}
