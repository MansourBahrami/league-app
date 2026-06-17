"use client";

import Header from "./Header";
import BottomNav from "./BottomNav";
import WelcomeSlides from "@/components/onboarding/WelcomeSlides";
import PushRegister from "@/components/push/PushRegister";

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
  showWelcome?: boolean;
}

export default function AppShell({ user, children, showWelcome = false }: AppShellProps) {
  // مقادیر مستقیم از prop سرور؛ با router.refresh() (بعد از خرید/پایان جلسه) به‌روز می‌شوند
  return (
    <div className="relative min-h-screen flex flex-col items-center overflow-x-hidden pb-24 md:pb-8">
      <PushRegister />
      {showWelcome && <WelcomeSlides />}
      {/* Cyber grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: "linear-gradient(to right, #4648d4 1px, transparent 1px), linear-gradient(to bottom, #4648d4 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <Header user={user} xp={user.xp} coins={user.coins} />

      <main className="w-full max-w-[600px] mt-20 mb-6 relative z-10">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
