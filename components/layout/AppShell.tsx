"use client";

import { useRouter } from "next/navigation";
import Header from "./Header";
import BottomNav from "./BottomNav";
import LeadCaptureModal from "@/components/onboarding/LeadCaptureModal";
import PushRegister from "@/components/push/PushRegister";
import BotConnectModal from "@/components/onboarding/BotConnectModal";
import ProgressiveOnboarding from "@/components/onboarding/ProgressiveOnboarding";

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
  /** قفل اپ تا تکمیل لید (نام/پایه/رشته + موبایلِ تأییدشده) */
  needsLead?: boolean;
  hasPhone?: boolean;
  unreadCount?: number;
  showBotConnect?: boolean;
  botAvailability?: { telegram: boolean; bale: boolean };
}

export default function AppShell({ user, children, onboardingHints = [], hasCompletedSession = false, needsLead = false, hasPhone = false, unreadCount = 0, showBotConnect = false, botAvailability = { telegram: false, bale: false } }: AppShellProps) {
  const router = useRouter();
  // مقادیر مستقیم از prop سرور؛ با router.refresh() (بعد از خرید/پایان جلسه) به‌روز می‌شوند
  return (
    <ProgressiveOnboarding
      initialHints={onboardingHints}
      hasCompletedSession={hasCompletedSession}
      allowSetupPrompt={!needsLead && !showBotConnect}
    >
      <div className="relative min-h-screen flex flex-col items-center overflow-x-hidden pb-28 md:pb-12">
        <PushRegister />
        {/* قفل اجباری لید بعد از روز اول — تا تکمیل نشود کل اپ مسدود است */}
        {needsLead && (
          <LeadCaptureModal hasPhone={hasPhone} onComplete={() => router.refresh()} />
        )}
        {showBotConnect && !needsLead && (
          <BotConnectModal
            available={botAvailability}
            onComplete={() => router.refresh()}
            onDismiss={() => router.refresh()}
          />
        )}
        {/* Cyber grid background */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
          style={{
            backgroundImage: "linear-gradient(to right, var(--color-primary) 1px, transparent 1px), linear-gradient(to bottom, var(--color-primary) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <Header user={user} xp={user.xp} coins={user.coins} unreadCount={unreadCount} />

        <main className="w-full max-w-[600px] mt-24 mb-6 relative z-10">
          {children}
        </main>

        <BottomNav />
      </div>
    </ProgressiveOnboarding>
  );
}
