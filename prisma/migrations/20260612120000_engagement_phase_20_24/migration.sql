-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pausedSec" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "plannedMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tickCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "day1GoalMinutes" INTEGER,
ADD COLUMN     "lastStudyDate" TIMESTAMP(3),
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "streak" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "ctaLabel" TEXT,
ADD COLUMN     "ctaUrl" TEXT;

-- AlterTable
ALTER TABLE "VideoProgress" ADD COLUMN     "unlockedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Friendship_friendId_idx" ON "Friendship"("friendId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userId_friendId_key" ON "Friendship"("userId", "friendId");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

