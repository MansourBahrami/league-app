import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureReferralCode, addFriendByCode, getFriendIds } from "@/lib/referral";
import { prisma } from "@/lib/db";

/** کد دعوت من + فهرست دوستانم */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = await ensureReferralCode(session.userId);
  const friendIds = await getFriendIds(session.userId);
  const friends = await prisma.user.findMany({
    where: { id: { in: friendIds } },
    select: { id: true, name: true, avatarUrl: true, level: true },
  });

  return NextResponse.json({ referralCode: code, friends });
}

/** افزودن دوست با کد دعوت */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "کد دعوت لازم است" }, { status: 400 });
  }

  const result = await addFriendByCode(session.userId, code);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true, friendName: result.friendName });
}
