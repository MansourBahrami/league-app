import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { isHotLead } from "@/lib/leads";
import { recordAdminAudit } from "@/lib/admin-audit";
import {
  isHotVideoLead,
  normalizeCompletedVideoThreshold,
  summarizeVideoProgress,
} from "@/lib/video-leads";


/** خروجی CSV از همه لیدها (کاربرانی که حداقل نام یا پروفایل دارند). فقط ادمین. */
export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hotOnly = req.nextUrl.searchParams.get("hot") === "1";
  const videoHotOnly = req.nextUrl.searchParams.get("videoHot") === "1";
  const categoryId = req.nextUrl.searchParams.get("categoryId")?.trim() || null;
  const minCompleted = normalizeCompletedVideoThreshold(
    req.nextUrl.searchParams.get("minCompleted"),
  );

  const users = await prisma.user.findMany({
    where: videoHotOnly ? { phone: { not: null } } : { isLeadComplete: true },
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
  const progressRows = users.length > 0
    ? await prisma.videoProgress.findMany({
        where: {
          userId: { in: users.map((user) => user.id) },
          watchedSeconds: { gt: 0 },
          ...(categoryId ? { video: { categoryId } } : {}),
        },
        select: {
          userId: true,
          watchedSeconds: true,
          totalSeconds: true,
          completed: true,
          updatedAt: true,
          video: { select: { title: true, sortOrder: true } },
        },
      })
    : [];
  const progressByUser = new Map<string, typeof progressRows>();
  for (const row of progressRows) {
    const current = progressByUser.get(row.userId) ?? [];
    current.push(row);
    progressByUser.set(row.userId, current);
  }
  const videoSummaryMap = new Map(
    users.map((user) => [user.id, summarizeVideoProgress(progressByUser.get(user.id) ?? [])]),
  );

  const filteredUsers = users.filter((user) => {
    if (hotOnly && !isHotLead({
        onboardingDay: user.onboardingDay,
        totalStudyMinutes: studyMap.get(user.id) ?? 0,
      })) return false;
    if (videoHotOnly && !isHotVideoLead(videoSummaryMap.get(user.id)!, minCompleted)) return false;
    return true;
  });

  const header = [
    "نام", "موبایل", "پایه", "رشته", "XP", "سطح", "روز آنبوردینگ",
    "ویدیوهای شروع‌شده", "ویدیوهای تکمیل‌شده", "دقایق تماشا", "آخرین پیشروی",
    "جلسات تکمیل‌شده", "جزئیات پیشروی", "تاریخ ثبت‌نام",
  ];
  const rows = filteredUsers.map((u) => {
    const video = videoSummaryMap.get(u.id)!;
    return [
      u.name ?? "",
      u.phone ?? "",
      u.grade ?? "",
      u.field ?? "",
      String(u.xp),
      u.level,
      String(u.onboardingDay),
      String(video.startedVideos),
      String(video.completedVideos),
      String(video.watchedMinutes),
      video.lastProgressAt?.toISOString() ?? "",
      video.completedTitles.join(" | "),
      video.progressDetails.join(" | "),
      u.createdAt.toISOString().slice(0, 10),
    ];
  });

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
    metadata: { hotOnly, videoHotOnly, minCompleted, categoryId, rowCount: filteredUsers.length },
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${videoHotOnly ? "video-hot-" : hotOnly ? "study-hot-" : ""}${Date.now()}.csv"`,
    },
  });
}
