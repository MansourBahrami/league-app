-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasSeenIntro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pastAvgStudyHours" DOUBLE PRECISION;
