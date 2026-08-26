import { prisma } from "@/lib/db";

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return rows.map((row) => row.blockerId === userId ? row.blockedId : row.blockerId);
}

export async function isBlockedBetween(firstUserId: string, secondUserId: string) {
  return Boolean(await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: firstUserId, blockedId: secondUserId },
        { blockerId: secondUserId, blockedId: firstUserId },
      ],
    },
    select: { id: true },
  }));
}
