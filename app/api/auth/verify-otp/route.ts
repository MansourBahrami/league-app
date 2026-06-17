import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { signToken, setSessionCookie } from "@/lib/auth";
import { normalizePhone, normalizeDigits } from "@/lib/phone";

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return NextResponse.json({ error: "شماره و کد الزامی است" }, { status: 400 });
    }

    const normalized = normalizePhone(String(phone));
    // کد ممکن است با ارقام فارسی وارد شده باشد
    const normalizedCode = normalizeDigits(String(code)).trim();
    const storedOtp = await redis.get(`otp:${normalized}`);

    if (!storedOtp || storedOtp !== normalizedCode) {
      return NextResponse.json({ error: "کد تأیید اشتباه یا منقضی شده است" }, { status: 401 });
    }

    await redis.del(`otp:${normalized}`);
    await prisma.otpToken.deleteMany({ where: { phone: normalized } });

    const user = await prisma.user.upsert({
      where: { phone: normalized },
      update: {},
      create: { phone: normalized },
    });

    const token = await signToken({ userId: user.id, phone: user.phone ?? "" });
    const { name, value, options } = setSessionCookie(token);
    const response = NextResponse.json({
      message: "ورود موفق",
      user: { id: user.id, phone: user.phone, name: user.name, isLeadComplete: user.isLeadComplete, onboardingDay: user.onboardingDay },
    });
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
