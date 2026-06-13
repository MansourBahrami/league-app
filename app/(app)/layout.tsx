import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AppShell from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, xp: true, coins: true, level: true, stars: true, avatarUrl: true, isLeadComplete: true, onboardingDay: true, hasSeenIntro: true },
  });

  if (!user) redirect("/login");

  return (
    <AppShell user={user} showWelcome={!user.hasSeenIntro}>
      {children}
    </AppShell>
  );
}
