import { redirect } from "next/navigation";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { getSession } from "@/lib/auth";
import { getAppUserSnapshot } from "@/lib/app-user";
import { hasOnboardingHint, ONBOARDING_HINTS } from "@/lib/onboarding-hints";
import { isMessengerPromptSnoozed } from "@/lib/messenger-prompt";
import { isSetupPromptSnoozed } from "@/lib/setup-prompt";
import AppShell from "@/components/layout/AppShell";
import AppPersonalization from "@/components/layout/AppPersonalization";
import Header from "@/components/layout/Header";
import HeaderFallback from "@/components/layout/HeaderFallback";
import RouteLoading from "@/components/layout/RouteLoading";

async function PersonalizedHeader() {
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
      <AppPersonalization
        userId={user.id}
        onboardingHints={user.onboardingHints}
        hasCompletedSession={user.hasCompletedStudySession}
        setupPromptSnoozed={isSetupPromptSnoozed(user.setupPromptSnoozedAt)}
        needsLead={needsLead}
        hasPhone={!!user.phone}
        showBotConnect={showBotConnect}
        botAvailability={botAvailability}
      />
      <Header
        user={{
          name: user.name,
          xp: user.xp,
          coins: user.coins,
          level: user.level,
          stars: user.stars,
          avatarUrl: user.avatarUrl,
        }}
        xp={user.xp}
        coins={user.coins}
        unreadCount={user.unreadInboxCount}
      />
    </>
  );
}

async function CachedAppFrame({
  personalizedHeader,
  children,
}: {
  personalizedHeader: React.ReactNode;
  children: React.ReactNode;
}) {
  "use cache";
  cacheLife("max");

  return <AppShell personalizedHeader={personalizedHeader}>{children}</AppShell>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CachedAppFrame
      personalizedHeader={(
        <Suspense fallback={<HeaderFallback />}>
          <PersonalizedHeader />
        </Suspense>
      )}
    >
      <Suspense fallback={<RouteLoading titleWidth="w-28" primaryHeight="h-56" rows={2} />}>
        {children}
      </Suspense>
    </CachedAppFrame>
  );
}
