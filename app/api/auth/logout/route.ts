import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function POST() {
  const session = await getSession();
  if (session) {
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });
    await redis.set(`gcamp:session-version:${session.userId}`, String(user.sessionVersion), "EX", 300);
  }
  const { name, value, options } = clearSessionCookie();
  const response = NextResponse.json({ message: "خروج موفق" });
  response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  return response;
}
