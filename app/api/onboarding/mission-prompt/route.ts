import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const missionPromptHandledAt = new Date();
  await prisma.user.update({
    where: { id: session.userId },
    data: { missionPromptHandledAt },
  });

  return NextResponse.json({ missionPromptHandledAt });
}
