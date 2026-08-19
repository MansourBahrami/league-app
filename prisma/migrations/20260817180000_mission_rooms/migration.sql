-- Mission rooms add a social cohort around an individual UserMission.
CREATE TABLE "MissionRoom" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetHours" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MissionRoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userMissionId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionRoomMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionRoom_missionId_startsAt_key" ON "MissionRoom"("missionId", "startsAt");
CREATE INDEX "MissionRoom_kind_startsAt_endsAt_idx" ON "MissionRoom"("kind", "startsAt", "endsAt");
CREATE UNIQUE INDEX "MissionRoomMember_userMissionId_key" ON "MissionRoomMember"("userMissionId");
CREATE UNIQUE INDEX "MissionRoomMember_roomId_userId_key" ON "MissionRoomMember"("roomId", "userId");
CREATE INDEX "MissionRoomMember_userId_idx" ON "MissionRoomMember"("userId");
CREATE INDEX "MissionRoomMember_roomId_joinedAt_idx" ON "MissionRoomMember"("roomId", "joinedAt");

ALTER TABLE "MissionRoom"
ADD CONSTRAINT "MissionRoom_missionId_fkey"
FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MissionRoomMember"
ADD CONSTRAINT "MissionRoomMember_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "MissionRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MissionRoomMember"
ADD CONSTRAINT "MissionRoomMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MissionRoomMember"
ADD CONSTRAINT "MissionRoomMember_userMissionId_fkey"
FOREIGN KEY ("userMissionId") REFERENCES "UserMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
