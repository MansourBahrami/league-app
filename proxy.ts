import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, signToken, shouldRefreshToken, setSessionCookie, COOKIE_NAME } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/miniapp", // احراز مینی‌اپ تلگرام/بله (با initData امضاشده اعتبارسنجی می‌شود)
  "/api/auth/magic", // مصرف Magic Link ربات (توکن یکبارمصرف Redis)
  "/api/cron/",
  "/api/bot/", // webhook و API ربات‌ها (با توکن خودشان احراز می‌شوند)
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icon-") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-phone", payload.phone);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // تمدید خودکار سشن (sliding): اگر به نیمه‌ی عمر رسیده، توکن تازه صادر کن تا
  // کاربر فعال هیچ‌وقت الکی خارج نشود.
  if (shouldRefreshToken(payload)) {
    const fresh = await signToken({ userId: payload.userId, phone: payload.phone });
    const { name, value, options } = setSessionCookie(fresh);
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
