import { prisma } from "@/lib/db";
import { getActiveFocusSnapshot } from "@/lib/focus";

export interface MissionRoomMemberSnapshot {
  userId: string;
  name: string;
  avatarUrl: string | null;
  level: string;
  studiedMin: number;
  progress: number;
  completed: boolean;
  isStudying: boolean;
  activePlannedMin: number | null;
  rank: number;
  isCurrentUser: boolean;
}

export interface MissionRoomSnapshot {
  id: string;
  kind: "daily" | "weekly";
  targetHours: number;
  startsAt: string;
  endsAt: string;
  status: "pending" | "active" | "ended";
  memberCount: number;
  studyingCount: number;
  completedCount: number;
  myProgress: number;
  myStudiedMin: number;
  myRank: number;
  members: MissionRoomMemberSnapshot[];
}

/** اتاقی که تب اصلی باید باز کند: فعال قبل از pending و روزانه قبل از هفتگی. */
export function pickMissionRoomToOpen(rooms: MissionRoomSnapshot[]): MissionRoomSnapshot | null {
  return [...rooms].sort((a, b) => {
    const statusPriority = { active: 0, pending: 1, ended: 2 } as const;
    const statusDifference = statusPriority[a.status] - statusPriority[b.status];
    if (statusDifference !== 0) return statusDifference;
    const kindDifference = (a.kind === "daily" ? 0 : 1) - (b.kind === "daily" ? 0 : 1);
    if (kindDifference !== 0) return kindDifference;
    return Date.parse(a.endsAt) - Date.parse(b.endsAt);
  })[0] ?? null;
}

/**
 * برای ماموریت‌های قدیمی یا خریدهایی که پیش از اضافه‌شدن اتاق ساخته شده‌اند،
 * عضویت را به‌شکل idempotent می‌سازد. بازه اتاق دقیقاً بازه UserMission است.
 */
export async function ensureMissionRoomMembership(userMissionId: string): Promise<string | null> {
  const userMission = await prisma.userMission.findUnique({
    where: { id: userMissionId },
    include: { mission: true, roomMembership: true },
  });
  if (!userMission) return null;
  if (userMission.roomMembership) return userMission.roomMembership.roomId;

  const room = await prisma.missionRoom.upsert({
    where: {
      missionId_startsAt: {
        missionId: userMission.missionId,
        startsAt: userMission.activatesAt,
      },
    },
    create: {
      missionId: userMission.missionId,
      kind: userMission.mission.kind,
      targetHours: userMission.mission.targetHours,
      startsAt: userMission.activatesAt,
      endsAt: userMission.expiresAt,
    },
    update: { endsAt: userMission.expiresAt },
  });

  const membership = await prisma.missionRoomMember.upsert({
    where: { userMissionId },
    create: {
      roomId: room.id,
      userId: userMission.userId,
      userMissionId,
    },
    update: { roomId: room.id },
  });
  return membership.roomId;
}

export async function ensureUserMissionRooms(userId: string, now = new Date()): Promise<void> {
  const missions = await prisma.userMission.findMany({
    where: {
      userId,
      status: { in: ["pending", "active", "completed"] },
      expiresAt: { gt: now },
      roomMembership: null,
    },
    select: { id: true },
  });
  for (const mission of missions) await ensureMissionRoomMembership(mission.id);
}

function activeElapsedMinutes(
  startedAt: string,
  pausedSec: number,
  plannedMin: number,
  now: Date
): number {
  const elapsed = Math.floor((now.getTime() - Date.parse(startedAt)) / 60000 - pausedSec / 60);
  return Math.min(plannedMin, Math.max(0, elapsed));
}

export async function getMissionRoomSnapshot(
  roomId: string,
  viewerId: string,
  now = new Date()
): Promise<MissionRoomSnapshot | null> {
  const room = await prisma.missionRoom.findFirst({
    where: { id: roomId, members: { some: { userId: viewerId } } },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, level: true } },
          userMission: { select: { status: true } },
        },
      },
    },
  });
  if (!room) return null;

  const userIds = room.members.map((member) => member.userId);
  const [studiedRows, active] = await Promise.all([
    prisma.studySession.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        startTime: { gte: room.startsAt, lt: room.endsAt },
        endTime: { not: null },
      },
      _sum: { durationMin: true },
    }),
    getActiveFocusSnapshot(now),
  ]);

  const studiedMap = new Map(studiedRows.map((row) => [row.userId, row._sum.durationMin ?? 0]));
  const activeMap = new Map(
    active.users
      .filter((user) => userIds.includes(user.userId) && Date.parse(user.startedAt) >= room.startsAt.getTime())
      .map((user) => [user.userId, user])
  );
  const goalMin = room.targetHours * 60;

  const ranked = room.members
    .map((member) => {
      const activeSession = activeMap.get(member.userId);
      const studiedMin = (studiedMap.get(member.userId) ?? 0) + (activeSession
        ? activeElapsedMinutes(activeSession.startedAt, activeSession.pausedSec, activeSession.plannedMin, now)
        : 0);
      return {
        userId: member.userId,
        name: member.user.name ?? "دانش‌آموز G-camp",
        avatarUrl: member.user.avatarUrl,
        level: member.user.level,
        studiedMin,
        progress: goalMin > 0 ? Math.min(100, Math.round((studiedMin / goalMin) * 100)) : 100,
        completed: member.userMission.status === "completed" || studiedMin >= goalMin,
        isStudying: !!activeSession,
        activePlannedMin: activeSession?.plannedMin ?? null,
        isCurrentUser: member.userId === viewerId,
      };
    })
    .sort((a, b) => b.studiedMin - a.studiedMin || a.name.localeCompare(b.name, "fa"));

  const members = ranked.map((member, index) => ({ ...member, rank: index + 1 }));
  const me = members.find((member) => member.isCurrentUser);
  const status = now < room.startsAt ? "pending" : now >= room.endsAt ? "ended" : "active";

  return {
    id: room.id,
    kind: room.kind === "daily" ? "daily" : "weekly",
    targetHours: room.targetHours,
    startsAt: room.startsAt.toISOString(),
    endsAt: room.endsAt.toISOString(),
    status,
    memberCount: members.length,
    studyingCount: members.filter((member) => member.isStudying).length,
    completedCount: members.filter((member) => member.completed).length,
    myProgress: me?.progress ?? 0,
    myStudiedMin: me?.studiedMin ?? 0,
    myRank: me?.rank ?? members.length,
    members,
  };
}

export async function getCurrentMissionRoomSnapshots(userId: string): Promise<MissionRoomSnapshot[]> {
  const now = new Date();
  await ensureUserMissionRooms(userId, now);
  const memberships = await prisma.missionRoomMember.findMany({
    where: {
      userId,
      room: { endsAt: { gt: now } },
      userMission: { status: { in: ["pending", "active", "completed"] } },
    },
    orderBy: { room: { startsAt: "asc" } },
    select: { roomId: true },
  });
  const snapshots = await Promise.all(
    memberships.map((membership) => getMissionRoomSnapshot(membership.roomId, userId, now))
  );
  return snapshots.filter((snapshot): snapshot is MissionRoomSnapshot => snapshot !== null);
}
