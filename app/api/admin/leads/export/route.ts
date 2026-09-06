import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { isHotLead } from "@/lib/leads";
import { recordAdminAudit } from "@/lib/admin-audit";


/** خروجی CSV از همه لیدها (کاربرانی که حداقل نام یا پروفایل دارند). فقط ادمین. */
export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hotOnly = req.nextUrl.searchParams.get("hot") === "1";

  const users = await prisma.user.findMany({
    where: { isLeadComplete: true },
    select: { id: true, name: true, phone: true, grade: true, field: true, xp: true, level: true, onboardingDay: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const studyByUser = hotOnly
    ? await prisma.studySession.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((user) => user.id) } },
        _sum: { durationMin: true },
      })
    : [];
  const studyMap = new Map(
    studyByUser.map((row) => [row.userId, row._sum.durationMin ?? 0]),
  );
  const filteredUsers = hotOnly
    ? users.filter((user) => isHotLead({
        onboardingDay: user.onboardingDay,
        totalStudyMinutes: studyMap.get(user.id) ?? 0,
      }))
    : users;

  const header = ["نام", "موبایل", "پایه", "رشته", "XP", "سطح", "روز آنبوردینگ", "تاریخ ثبت‌نام"];
  const rows = filteredUsers.map((u) => [
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
  const esc = (v: string) => {
    // جلوگیری از CSV/Formula injection هنگام بازشدن فایل در Excel/Sheets.
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  // BOM برای نمایش درست فارسی در Excel
  const body = "﻿" + csv;

  await recordAdminAudit({
    adminUserId: admin.userId,
    action: "leads.export_csv",
    request: req,
    targetType: "lead",
    metadata: { hotOnly, rowCount: filteredUsers.length },
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${hotOnly ? "hot-" : ""}${Date.now()}.csv"`,
    },
  });
}
