import { NextRequest, NextResponse } from "next/server";
import { handleBotUpdate } from "@/lib/bot-handler";

export const dynamic = "force-dynamic";

/** Webhook تلگرام. URL: /api/bot/telegram?secret=<BOT_WEBHOOK_SECRET> */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.BOT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const update = await req.json();
    await handleBotUpdate("telegram", update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/telegram]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
