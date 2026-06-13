import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDay1MissionHours } from "@/lib/gamification";

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
  const { name, grade, field, nextStudyTarget, hasSeenIntro, pastAvgStudyHours } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (grade !== undefined) updateData.grade = grade;
  if (field !== undefined) updateData.field = field;
  if (nextStudyTarget !== undefined) updateData.nextStudyTarget = nextStudyTarget ? new Date(nextStudyTarget) : null;
  if (hasSeenIntro !== undefined) updateData.hasSeenIntro = hasSeenIntro;
  if (pastAvgStudyHours !== undefined) {
    updateData.pastAvgStudyHours = pastAvgStudyHours;
    // snapshot هدف روز اول بر اساس ساعت ورود (قانون ۱۷/۲۱) تا در طول روز ثابت بماند
    const hourOfDay = new Date().getHours();
    updateData.day1GoalMinutes = getDay1MissionHours(pastAvgStudyHours, hourOfDay) * 60;
  }

  // Mark lead as complete if name + grade + field all present
  const current = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, grade: true, field: true, isLeadComplete: true },
  });
  const mergedName = name ?? current?.name;
  const mergedGrade = grade ?? current?.grade;
  const mergedField = field ?? current?.field;
  if (mergedName && mergedGrade && mergedField) updateData.isLeadComplete = true;

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: updateData,
    select: { id: true, name: true, grade: true, field: true, isLeadComplete: true, nextStudyTarget: true },
  });

  return NextResponse.json(user);
}
