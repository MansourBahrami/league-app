-- CreateTable
CREATE TABLE "ProfileUnlock" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileUnlock_viewerId_idx" ON "ProfileUnlock"("viewerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileUnlock_viewerId_targetUserId_key" ON "ProfileUnlock"("viewerId", "targetUserId");

-- AddForeignKey
ALTER TABLE "ProfileUnlock" ADD CONSTRAINT "ProfileUnlock_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileUnlock" ADD CONSTRAINT "ProfileUnlock_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
