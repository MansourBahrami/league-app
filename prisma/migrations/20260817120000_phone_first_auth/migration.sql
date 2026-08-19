-- OTP فقط به‌صورت هش‌شده و کوتاه‌عمر در Redis نگهداری می‌شود.
DROP TABLE IF EXISTS "OtpToken";

-- امکان ابطال همه JWTهای قبلی کاربر در logout.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- کاربر می‌تواند پیشنهاد اتصال ربات را فعلاً کنار بگذارد.
ALTER TABLE "User" ADD COLUMN "messengerPromptDismissedAt" TIMESTAMP(3);
