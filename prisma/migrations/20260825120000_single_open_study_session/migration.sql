-- قبل از افزودن invariant، اگر دادهٔ قدیمی session باز تکراری دارد فقط جدیدترین
-- session باز نگه داشته می‌شود و بقیه بدون پاداش تازه بسته می‌شوند.
WITH ranked_open_sessions AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "startTime" DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "StudySession"
  WHERE "endTime" IS NULL
)
UPDATE "StudySession" AS session
SET
  "endTime" = GREATEST(session."startTime", CURRENT_TIMESTAMP),
  "pausedAt" = NULL
FROM ranked_open_sessions AS ranked
WHERE session."id" = ranked."id"
  AND ranked.row_number > 1;

-- Prisma schema فعلاً partial index را مدل نمی‌کند؛ این migration منبع حقیقت
-- invariant «حداکثر یک session باز برای هر کاربر» است.
CREATE UNIQUE INDEX "StudySession_one_open_per_user_key"
ON "StudySession"("userId")
WHERE "endTime" IS NULL;
