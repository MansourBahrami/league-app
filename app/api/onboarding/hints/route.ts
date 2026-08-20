import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isOnboardingHint, ONBOARDING_HINTS } from "@/lib/onboarding-hints";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { hints?: unknown } | null;
  const requested = Array.isArray(body?.hints) ? body.hints.filter(isOnboardingHint) : [];
  const hints = [...new Set(requested)];
  if (hints.length === 0) {
    return NextResponse.json({ error: "No valid hints" }, { status: 400 });
  }

  const current = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { onboardingHints: true },
  });
  if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const onboardingHints = [...new Set([...current.onboardingHints, ...hints])];
  const completedSetupStep = hints.includes(ONBOARDING_HINTS.PUSH_PROMPTED)
    || hints.includes(ONBOARDING_HINTS.INSTALL_PROMPTED);
  await prisma.user.update({
    where: { id: session.userId },
    data: {
      onboardingHints,
      ...(completedSetupStep ? { setupPromptSnoozedAt: null } : {}),
    },
  });

  return NextResponse.json({ onboardingHints });
}
