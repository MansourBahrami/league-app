import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { runRuleManually } from "@/lib/notification-engine";
import { recordAdminAudit } from "@/lib/admin-audit";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * اجرای دستی یک قانون.
 *  - بدنه‌ی { test: true } → «تست برای من»: فقط برای خودِ ادمین و با نادیده‌گرفتن
 *    cooldown/quiet (برای دیدن نمونه‌ی واقعی پیام).
 *  - بدون test → اجرای واقعی روی همه‌ی کاربرانِ منطبق با احترام به ایمنی.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const isTest = body && typeof body === "object" && (body as { test?: boolean }).test === true;

  const result = await runRuleManually(id, isTest ? admin.userId : undefined);
  await recordAdminAudit({ adminUserId: admin.userId, action: isTest ? "notification_rule.test" : "notification_rule.run", request: req, targetType: "notification_rule", targetId: id, metadata: { matched: result.matched, sent: result.sent } });
  return NextResponse.json({ ok: true, ...result, test: Boolean(isTest) });
}
