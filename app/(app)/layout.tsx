import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureVariant } from "@/lib/ab";
import { getUnreadCount } from "@/lib/inbox";
import AppShell from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, xp: true, coins: true, level: true, stars: true, avatarUrl: true, isLeadComplete: true, onboardingDay: true, hasSeenIntro: true, videoAccess: true, phone: true },
  });

  if (!user) redirect("/login");

  // تخصیص گروه A/B در اولین ورود (idempotent)
  if (!user.videoAccess) {
    await ensureVariant(user.id, user.videoAccess);
  }

  // قفل اپ تا تکمیل لید (بعد از روز اول، اطلاعات + موبایلِ تأییدشده اجباری است)
  const needsLead = user.onboardingDay >= 1 && !user.isLeadComplete;

  const unreadCount = await getUnreadCount(user.id);

  return (
    <AppShell user={user} showWelcome={!user.hasSeenIntro} needsLead={needsLead} hasPhone={!!user.phone} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
