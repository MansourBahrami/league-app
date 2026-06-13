import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consumeMagicToken } from "@/lib/magic";
import { signToken, setSessionCookie } from "@/lib/auth";

/**
 * مصرف Magic Link و ورود seamless.
 * کاربر روی لینک ربات کلیک می‌کند → توکن مصرف می‌شود → کوکی JWT ست و به داشبورد ریدایرکت می‌شود.
 */
export async function GET(req: NextRequest) {
  // پشت CDN/پروکسی، req.url میزبان داخلی (localhost:3000) را نشان می‌دهد؛
  // برای ریدایرکت باید از آدرس عمومی اپ استفاده شود.
  const baseUrl = process.env.APP_PUBLIC_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? req.url;

  const token = req.nextUrl.searchParams.get("token");
  const userId = await consumeMagicToken(token ?? "");

  const loginUrl = new URL("/login?error=magic", baseUrl);
  if (!userId) return NextResponse.redirect(loginUrl);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, phone: true } });
  if (!user) return NextResponse.redirect(loginUrl);

  const jwt = await signToken({ userId: user.id, phone: user.phone ?? "" });
  const { name, value, options } = setSessionCookie(jwt);
  const res = NextResponse.redirect(new URL("/dashboard", baseUrl));
  res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
  return res;
}
