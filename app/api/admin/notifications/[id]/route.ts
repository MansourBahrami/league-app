import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { parseRuleBody, validateRule } from "@/lib/notification-admin";

interface Params {
  params: Promise<{ id: string }>;
}

// ویرایش قانون (یا فقط toggle فعال/غیرفعال با ارسال { enabled })
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const raw = await req.json();

  // toggle سریع: فقط enabled
  if (raw && typeof raw === "object" && Object.keys(raw).length === 1 && "enabled" in raw) {
    const rule = await prisma.notificationRule.update({
      where: { id },
      data: { enabled: Boolean(raw.enabled) },
    });
    return NextResponse.json(rule);
  }

  const data = parseRuleBody(raw);
  const err = validateRule(data);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const rule = await prisma.notificationRule.update({ where: { id }, data });
  return NextResponse.json(rule);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.notificationRule.delete({ where: { id } });
  return NextResponse.json({ message: "حذف شد" });
}
