"use client";

import { usePathname, useRouter } from "next/navigation";
import AnalyticsIdentity from "@/components/analytics/AnalyticsIdentity";
import LeadCaptureModal from "@/components/onboarding/LeadCaptureModal";
import BotConnectModal from "@/components/onboarding/BotConnectModal";
import { ProgressiveOnboardingHydrator } from "@/components/onboarding/ProgressiveOnboarding";

interface Props {
  userId: string;
  onboardingHints: string[];
  hasCompletedSession: boolean;
  setupPromptSnoozed: boolean;
  needsLead: boolean;
  hasPhone: boolean;
  showBotConnect: boolean;
  botAvailability: { telegram: boolean; bale: boolean };
}

export default function AppPersonalization({
  userId,
  onboardingHints,
  hasCompletedSession,
  setupPromptSnoozed,
  needsLead,
  hasPhone,
  showBotConnect,
  botAvailability,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const botConnectVisible = showBotConnect && pathname === "/dashboard";

  return (
    <>
      <AnalyticsIdentity userId={userId} />
      <ProgressiveOnboardingHydrator
        initialHints={onboardingHints}
        hasCompletedSession={hasCompletedSession}
        initialSetupSnoozed={setupPromptSnoozed}
        allowSetupPrompt={!needsLead}
      />
      {needsLead && (
        <LeadCaptureModal hasPhone={hasPhone} onComplete={() => router.refresh()} />
      )}
      {botConnectVisible && !needsLead && (
        <BotConnectModal
          available={botAvailability}
          onComplete={() => router.refresh()}
          onDismiss={() => router.refresh()}
        />
      )}
    </>
  );
}
