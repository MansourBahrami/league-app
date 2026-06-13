import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

/**
 * یک کاربر را با شماره موبایل ادمین می‌کند.
 * استفاده: npx tsx scripts/make-admin.ts 09120001234
 */
async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error("شماره موبایل را وارد کن: npx tsx scripts/make-admin.ts 0912XXXXXXX");
    process.exit(1);
  }
  const user = await prisma.user.update({
    where: { phone },
    data: { role: "admin" },
    select: { id: true, phone: true, name: true, role: true },
  });
  console.log(`✅ کاربر ${user.phone} اکنون ادمین است.`);
}

main()
  .catch((e) => { console.error("خطا:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
