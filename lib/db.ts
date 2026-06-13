import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  // Connection pooling: محدود کردن کانکشن‌های همزمان تا سرور Self-hosted در ترافیک
  // بالا (مثل پایان شب) از کانکشن خارج نشود. (طبق PRD، جایگزین سبک PgBouncer)
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: parseInt(process.env.DB_POOL_MAX ?? "10"),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
