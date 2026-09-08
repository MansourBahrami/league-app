-- ترتیب نمایش ویدیو را از روز بازشدن جدا می‌کند.
ALTER TABLE "Video" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- ترتیب فعلی کاربران حفظ می‌شود: روز کمتر اول، و در روز برابر ویدیوی جدیدتر اول.
WITH ordered_videos AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      ORDER BY "day" ASC, "createdAt" DESC, "id" ASC
    ) AS position
  FROM "Video"
)
UPDATE "Video" AS video
SET "sortOrder" = ordered_videos.position
FROM ordered_videos
WHERE video."id" = ordered_videos."id";

CREATE INDEX "Video_isActive_sortOrder_idx" ON "Video"("isActive", "sortOrder");
