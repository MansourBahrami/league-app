ALTER TABLE "User"
ADD COLUMN "hasCompletedStudySession" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" AS u
SET "hasCompletedStudySession" = true
WHERE EXISTS (
  SELECT 1
  FROM "StudySession" AS s
  WHERE s."userId" = u.id
    AND s."endTime" IS NOT NULL
    AND s."durationMin" >= 15
);
