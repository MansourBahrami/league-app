import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.profilePublic !== "boolean" || typeof body.activityPublic !== "boolean") {
    return NextResponse.json({ error: "تنظیمات نامعتبر است" }, { status: 400 });
  }
  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { profilePublic: body.profilePublic, activityPublic: body.activityPublic },
    select: { profilePublic: true, activityPublic: true },
  });
  return NextResponse.json(user);
}
