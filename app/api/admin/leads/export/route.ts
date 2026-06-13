import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** خروجی CSV از همه لیدها (کاربرانی که حداقل نام یا پروفایل دارند). فقط ادمین. */
export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hotOnly = req.nextUrl.searchParams.get("hot") === "1";

  const users = await prisma.user.findMany({
    where: { isLeadComplete: true, ...(hotOnly ? { onboardingDay: { gte: 3 } } : {}) },
    select: { name: true, phone: true, grade: true, field: true, xp: true, level: true, onboardingDay: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const header = ["نام", "موبایل", "پایه", "رشته", "XP", "سطح", "روز آنبوردینگ", "تاریخ ثبت‌نام"];
  const rows = users.map((u) => [
    u.name ?? "",
    u.phone ?? "",
    u.grade ?? "",
    u.field ?? "",
    String(u.xp),
    u.level,
    String(u.onboardingDay),
    u.createdAt.toISOString().slice(0, 10),
  ]);

  // فرار دادن مقادیر CSV
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  // BOM برای نمایش درست فارسی در Excel
  const body = "﻿" + csv;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${hotOnly ? "hot-" : ""}${Date.now()}.csv"`,
    },
  });
}
