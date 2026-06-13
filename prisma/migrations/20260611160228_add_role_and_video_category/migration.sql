-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'onboarding',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "subject" TEXT,
ALTER COLUMN "day" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "Video_category_grade_idx" ON "Video"("category", "grade");
