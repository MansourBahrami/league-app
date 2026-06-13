import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { parseRuleBody, validateRule } from "@/lib/notification-admin";

// فهرست همه‌ی قانون‌ها (جدیدترین اول)
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rules = await prisma.notificationRule.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rules);
}

// ساخت قانون جدید
export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = parseRuleBody(await req.json());
  const err = validateRule(data);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const rule = await prisma.notificationRule.create({ data });
  return NextResponse.json(rule, { status: 201 });
}
