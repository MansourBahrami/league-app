import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const setupPromptSnoozedAt = new Date();
  await prisma.user.update({
    where: { id: session.userId },
    data: { setupPromptSnoozedAt },
  });

  return NextResponse.json({ setupPromptSnoozedAt });
}
