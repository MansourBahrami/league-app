import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await getSession();
  if (session) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { sessionVersion: { increment: 1 } },
    });
  }
  const { name, value, options } = clearSessionCookie();
  const response = NextResponse.json({ message: "خروج موفق" });
  response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  return response;
}
