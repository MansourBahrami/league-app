-- حذف ایندکس قدیمی
DROP INDEX IF EXISTS "Video_category_grade_idx";

-- حذف ستون‌های category، subject، grade
ALTER TABLE "Video" DROP COLUMN IF EXISTS "category";
ALTER TABLE "Video" DROP COLUMN IF EXISTS "subject";
ALTER TABLE "Video" DROP COLUMN IF EXISTS "grade";

-- افزودن ستون چندپایه‌ای grades
ALTER TABLE "Video" ADD COLUMN "grades" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ایندکس جدید روی day
CREATE INDEX "Video_day_idx" ON "Video"("day");
