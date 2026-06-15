-- A/B تست مدل دسترسی به ویدیو: variant روی User + ثبت خرید روی VideoProgress

ALTER TABLE "User" ADD COLUMN "videoAccess" TEXT;
ALTER TABLE "VideoProgress" ADD COLUMN "purchasedAt" TIMESTAMP(3);

-- تخصیص تصادفی ۵۰/۵۰ به کاربران موجود
UPDATE "User"
SET "videoAccess" = CASE WHEN random() < 0.5 THEN 'free' ELSE 'paid' END
WHERE "videoAccess" IS NULL;

-- کاربران گروه paid حداقل سکه‌ی اولیه (۱۰) را داشته باشند تا بتوانند خرید را تست کنند
UPDATE "User"
SET "coins" = GREATEST("coins", 10)
WHERE "videoAccess" = 'paid';
