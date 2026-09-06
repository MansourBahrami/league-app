DROP INDEX IF EXISTS "UserMission_userId_status_idx";

CREATE INDEX "UserMission_userId_status_expiresAt_activatesAt_idx"
ON "UserMission"("userId", "status", "expiresAt", "activatesAt");
