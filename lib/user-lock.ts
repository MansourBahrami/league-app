import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";

export type UserTransaction = Prisma.TransactionClient;

const USER_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 15_000,
} as const;

/**
 * mutationهای حساس هر کاربر را میان همه processها و replicaها سریال می‌کند.
 * این قفل transaction-level است و با commit/rollback خودکار آزاد می‌شود.
 */
export async function withResourceLock<T>(
  lockKey: string,
  operation: (tx: UserTransaction) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // خروجی تابع PostgreSQL از نوع void است؛ cast برای PrismaPg لازم است.
    await tx.$queryRaw<Array<{ locked: string }>>`
      SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text AS locked
    `;
    return operation(tx);
  }, USER_TRANSACTION_OPTIONS);
}

export function withUserLock<T>(
  userId: string,
  operation: (tx: UserTransaction) => Promise<T>,
): Promise<T> {
  return withResourceLock(userId, operation);
}
