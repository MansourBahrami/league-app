-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "coinReward" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'weekly';
