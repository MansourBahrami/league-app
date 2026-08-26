import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDay1MissionHours } from "@/lib/gamification";
import {
  gradeRequiresField,
  isStudentGrade,
  isStudentProfileComplete,
  isStudyField,
} from "@/lib/student-profile";
import { after } from "next/server";
import { captureServerEvent } from "@/lib/analytics-server";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true, phone: true, name: true, grade: true, field: true,
      xp: true, coins: true, level: true, stars: true,
      onboardingDay: true, nextStudyTarget: true, isLeadComplete: true,
      createdAt: true,
      _count: { select: { sessions: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, grade, field, nextStudyTarget, hasSeenIntro, pastAvgStudyHours, avatarUrl } = body;

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return NextResponse.json({ error: "نام را وارد کن" }, { status: 400 });
  }
  if (grade !== undefined && !isStudentGrade(grade)) {
    return NextResponse.json({ error: "پایه تحصیلی معتبر نیست" }, { status: 400 });
  }
  if (field !== undefined && field !== null && !isStudyField(field)) {
    return NextResponse.json({ error: "رشته تحصیلی معتبر نیست" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (grade !== undefined) updateData.grade = grade;
  if (field !== undefined) updateData.field = field;
  if (grade !== undefined && !gradeRequiresField(grade)) updateData.field = null;
  // فقط آواتارهای آماده‌ی محلی پذیرفته می‌شوند (بدون آپلود)
  if (avatarUrl !== undefined && typeof avatarUrl === "string" && /^\/avatars\/[a-z0-9-]+\.svg$/.test(avatarUrl)) {
    updateData.avatarUrl = avatarUrl;
  }
  if (nextStudyTarget !== undefined) updateData.nextStudyTarget = nextStudyTarget ? new Date(nextStudyTarget) : null;
  if (hasSeenIntro !== undefined) updateData.hasSeenIntro = hasSeenIntro;
  if (pastAvgStudyHours !== undefined) {
    updateData.pastAvgStudyHours = pastAvgStudyHours;
    // snapshot هدف روز اول بر اساس ساعت ورود (قانون ۱۷/۲۱) تا در طول روز ثابت بماند
    const hourOfDay = new Date().getHours();
    updateData.day1GoalMinutes = getDay1MissionHours(pastAvgStudyHours, hourOfDay) * 60;
  }

  // شماره هنگام ورود تأیید شده؛ رشته فقط برای دهم تا پشت‌کنکور لازم است.
  const current = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { grade: true, field: true, phone: true, isLeadComplete: true },
  });
  const mergedGrade = grade ?? current?.grade;
  const mergedField = grade !== undefined && !gradeRequiresField(grade)
    ? null
    : (field !== undefined ? field : current?.field);
  updateData.isLeadComplete = isStudentProfileComplete({
    phone: current?.phone,
    grade: mergedGrade,
    field: mergedField,
  });

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: updateData,
    select: { id: true, name: true, grade: true, field: true, isLeadComplete: true, nextStudyTarget: true },
  });

  if (!current?.isLeadComplete && user.isLeadComplete) {
    after(() => captureServerEvent({
      distinctId: session.userId,
      event: "lead_completed",
      insertId: `lead-completed:${session.userId}`,
    }));
  }

  return NextResponse.json(user);
}
