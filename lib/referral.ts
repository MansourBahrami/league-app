import { prisma } from "@/lib/db";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بدون حروف مبهم

function randomCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

/** کد دعوت یکتای کاربر را برمی‌گرداند و اگر نداشت می‌سازد. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (user?.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // برخورد یکتایی — دوباره تلاش کن
    }
  }
  throw new Error("could not generate referral code");
}

/**
 * دوستی دوطرفه بین کاربر و صاحب کد دعوت را برقرار می‌کند.
 * خوداضافه‌کردن و تکرار را رد می‌کند. برای جلوگیری از رکورد دوتایی، دوستی را
 * با کلید مرتب‌شده (a,b) ذخیره می‌کنیم.
 */
export async function addFriendByCode(
  userId: string,
  code: string
): Promise<{ ok: boolean; reason?: string; friendName?: string | null }> {
  const owner = await prisma.user.findUnique({
    where: { referralCode: code.trim().toUpperCase() },
    select: { id: true, name: true },
  });
  if (!owner) return { ok: false, reason: "کد دعوت معتبر نیست" };
  if (owner.id === userId) return { ok: false, reason: "نمی‌تونی خودت رو دعوت کنی" };

  const [a, b] = [userId, owner.id].sort();
  const existing = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: a, friendId: b } },
  });
  if (existing) return { ok: false, reason: "از قبل دوست هستید", friendName: owner.name };

  await prisma.friendship.create({ data: { userId: a, friendId: b } });
  return { ok: true, friendName: owner.name };
}

/** شناسه‌ی همه دوستان یک کاربر (هر دو جهت رابطه) */
export async function getFriendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ userId }, { friendId: userId }] },
    select: { userId: true, friendId: true },
  });
  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.userId === userId ? r.friendId : r.userId);
  }
  return Array.from(ids);
}
