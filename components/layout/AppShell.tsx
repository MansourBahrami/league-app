"use client";

import { usePathname, useRouter } from "next/navigation";
import Header from "./Header";
import BottomNav from "./BottomNav";
import LeadCaptureModal from "@/components/onboarding/LeadCaptureModal";
import PushRegister from "@/components/push/PushRegister";
import BotConnectModal from "@/components/onboarding/BotConnectModal";
import ProgressiveOnboarding from "@/components/onboarding/ProgressiveOnboarding";
import TehranDayBoundaryRefresh from "./TehranDayBoundaryRefresh";

interface User {
  id: string;
  name: string | null;
  xp: number;
  coins: number;
  level: string;
  stars: number;
  avatarUrl: string | null;
  isLeadComplete: boolean;
  onboardingDay: number;
}

interface AppShellProps {
  user: User;
  children: React.ReactNode;
  onboardingHints?: string[];
  hasCompletedSession?: boolean;
  setupPromptSnoozed?: boolean;
  /** قفل اپ تا تکمیل لید (نام/پایه/رشته + موبایلِ تأییدشده) */
  needsLead?: boolean;
  hasPhone?: boolean;
  unreadCount?: number;
  showBotConnect?: boolean;
  botAvailability?: { telegram: boolean; bale: boolean };
}

export default function AppShell({ user, children, onboardingHints = [], hasCompletedSession = false, setupPromptSnoozed = false, needsLead = false, hasPhone = false, unreadCount = 0, showBotConnect = false, botAvailability = { telegram: false, bale: false } }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const botConnectVisible = showBotConnect && pathname === "/dashboard";
  // مقادیر مستقیم از prop سرور؛ با router.refresh() (بعد از خرید/پایان جلسه) به‌روز می‌شوند
  return (
    <ProgressiveOnboarding
      initialHints={onboardingHints}
      hasCompletedSession={hasCompletedSession}
      initialSetupSnoozed={setupPromptSnoozed}
      allowSetupPrompt={!needsLead}
    >
      <div className="relative min-h-screen flex flex-col items-center overflow-x-hidden pb-28 md:pb-12">
        <TehranDayBoundaryRefresh />
        <PushRegister />
        {/* قفل اجباری لید بعد از روز اول — تا تکمیل نشود کل اپ مسدود است */}
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
        {/* Cyber grid background */}
        <div className="app-grid-background pointer-events-none fixed inset-0 z-0 opacity-[0.03]" />

        <Header user={user} xp={user.xp} coins={user.coins} unreadCount={unreadCount} />

        <main className="w-full max-w-[600px] mt-24 mb-6 relative z-10">
          {children}
        </main>

        <BottomNav />
      </div>
    </ProgressiveOnboarding>
  );
}
