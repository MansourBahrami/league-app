import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureReferralCode } from "@/lib/referral";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const referralCode = await ensureReferralCode(session.userId);
  return NextResponse.json({ referralCode });
}
