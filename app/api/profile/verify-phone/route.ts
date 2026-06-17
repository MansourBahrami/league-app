import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { getSession } from "@/lib/auth";
import { normalizePhone, normalizeDigits } from "@/lib/phone";

/**
 * اتصال و تأیید شماره موبایل به حسابِ کاربرِ واردشده (برای lead capture بعد از روز اول).
 * برخلاف verify-otp، سشن جدید نمی‌سازد؛ فقط phone را روی همین کاربر ست می‌کند.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone, code } = await req.json();
  if (!phone || !code) return NextResponse.json({ error: "شماره و کد الزامی است" }, { status: 400 });

  const normalized = normalizePhone(String(phone));
  if (!/^09[0-9]{9}$/.test(normalized)) {
    return NextResponse.json({ error: "شماره موبایل نامعتبر است" }, { status: 400 });
  }
  const normalizedCode = normalizeDigits(String(code)).trim();
  const storedOtp = await redis.get(`otp:${normalized}`);
  if (!storedOtp || storedOtp !== normalizedCode) {
    return NextResponse.json({ error: "کد تأیید اشتباه یا منقضی شده است" }, { status: 401 });
  }

  // شماره نباید متعلق به حساب دیگری باشد
  const owner = await prisma.user.findUnique({ where: { phone: normalized }, select: { id: true } });
  if (owner && owner.id !== session.userId) {
    return NextResponse.json({ error: "این شماره قبلاً با حساب دیگری ثبت شده است" }, { status: 409 });
  }

  await redis.del(`otp:${normalized}`);
  await prisma.otpToken.deleteMany({ where: { phone: normalized } });

  const cur = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, grade: true, field: true },
  });
  const leadComplete = !!(cur?.name && cur?.grade && cur?.field);

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { phone: normalized, ...(leadComplete ? { isLeadComplete: true } : {}) },
    select: { phone: true, isLeadComplete: true },
  });

  return NextResponse.json({ message: "شماره تأیید شد", ...user });
}
