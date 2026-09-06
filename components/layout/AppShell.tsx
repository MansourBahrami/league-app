"use client";

import { Suspense } from "react";
import BottomNav from "./BottomNav";
import BottomNavFallback from "./BottomNavFallback";
import PushRegister from "@/components/push/PushRegister";
import ProgressiveOnboarding from "@/components/onboarding/ProgressiveOnboarding";
import TehranDayBoundaryRefresh from "./TehranDayBoundaryRefresh";

interface AppShellProps {
  personalizedHeader: React.ReactNode;
  children: React.ReactNode;
}

export default function AppShell({ personalizedHeader, children }: AppShellProps) {
  return (
    <ProgressiveOnboarding>
      <div className="relative min-h-screen flex flex-col items-center overflow-x-hidden pb-28 md:pb-12">
        <TehranDayBoundaryRefresh />
        <PushRegister />
        {/* Cyber grid background */}
        <div className="app-grid-background pointer-events-none fixed inset-0 z-0 opacity-[0.03]" />

        {personalizedHeader}

        <main className="w-full max-w-[600px] mt-24 mb-6 relative z-10">
          {children}
        </main>

        <Suspense fallback={<BottomNavFallback />}>
          <BottomNav />
        </Suspense>
      </div>
    </ProgressiveOnboarding>
  );
}
