-- افزودن شناسه‌های تلگرام و بله
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;
ALTER TABLE "User" ADD COLUMN "baleId" TEXT;

-- nullable کردن شماره (برای ثبت‌نام از تلگرام/بله قبل از گرفتن شماره)
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;

-- ایندکس‌های یکتا
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
CREATE UNIQUE INDEX "User_baleId_key" ON "User"("baleId");
