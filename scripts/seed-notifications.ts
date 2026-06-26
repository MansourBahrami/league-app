/**
 * درج قانون‌های نوتیفیکیشن (idempotent، بر اساس name).
 * اجرا: npx tsx scripts/seed-notifications.ts
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedNotificationRules } from "../lib/notification-seed";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const created = await seedNotificationRules(prisma as never);
  console.log(`✅ ${created} قانون جدید درج شد.`);
  const all = await prisma.notificationRule.findMany({
    select: { name: true, triggerType: true, enabled: true },
    orderBy: { createdAt: "asc" },
  });
  console.table(all);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
