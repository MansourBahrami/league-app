import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  const { name, value, options } = clearSessionCookie();
  const response = NextResponse.json({ message: "خروج موفق" });
  response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  return response;
}
