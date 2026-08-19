import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { botDeepLink, createBotLinkToken, type Messenger } from "@/lib/bot-link";
import { prisma } from "@/lib/db";

async function currentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, phone: true, telegramId: true, baleId: true },
  });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    telegram: !!user.telegramId,
    bale: !!user.baleId,
    available: {
      telegram: !!process.env.TELEGRAM_BOT_USERNAME,
      bale: !!process.env.BALE_BOT_USERNAME,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.phone) {
    return NextResponse.json({ error: "ابتدا با شماره موبایل وارد شوید" }, { status: 409 });
  }

  const { messenger } = await req.json().catch(() => ({}));
  if (messenger !== "telegram" && messenger !== "bale") {
    return NextResponse.json({ error: "پیام‌رسان نامعتبر است" }, { status: 400 });
  }

  const token = await createBotLinkToken(user.id, messenger as Messenger);
  const url = botDeepLink(messenger as Messenger, token);
  if (!url) {
    return NextResponse.json({ error: "ربات این پیام‌رسان هنوز پیکربندی نشده است" }, { status: 503 });
  }
  return NextResponse.json({ url, expiresIn: 15 * 60 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { dismiss } = await req.json().catch(() => ({}));
  if (dismiss !== true) return NextResponse.json({ error: "ورودی نامعتبر" }, { status: 400 });
  await prisma.user.update({
    where: { id: session.userId },
    data: { messengerPromptDismissedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
