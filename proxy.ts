import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, signToken, shouldRefreshToken, setSessionCookie, COOKIE_NAME } from "@/lib/auth";
import { isCrossSiteMutation } from "@/lib/request-security";

const PUBLIC_PATHS = [
  "/login",
  "/sw.js",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/cron/",
  "/api/bot/", // webhook و API داخلی ربات‌ها با secret مستقل احراز می‌شوند
  "/api/avatar/", // سروِ عکس پروفایلِ آپلودی — عمومی مثل آواتارهای آماده (در فید/لیدربورد دیده می‌شود)
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  return PUBLIC_PATHS.some((path) =>
    path.endsWith("/") ? pathname.startsWith(path) : pathname === path
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && isCrossSiteMutation(request)) {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icon-") ||
    pathname.startsWith("/posters/") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".json")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // تمدید خودکار سشن (sliding): اگر به نیمه‌ی عمر رسیده، توکن تازه صادر کن تا
  // کاربر فعال هیچ‌وقت الکی خارج نشود.
  if (shouldRefreshToken(payload)) {
    const fresh = await signToken({ userId: payload.userId, sessionVersion: payload.sessionVersion });
    const { name, value, options } = setSessionCookie(fresh);
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
