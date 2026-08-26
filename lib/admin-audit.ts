import { prisma } from "@/lib/db";

export async function recordAdminAudit(params: {
  adminUserId: string;
  action: string;
  request?: Request;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: params.adminUserId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata,
      requestId: params.request?.headers.get("x-request-id") ?? null,
    },
  });
}
