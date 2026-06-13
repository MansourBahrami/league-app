import { NextRequest, NextResponse } from "next/server";
import { handleBotUpdate } from "@/lib/bot-handler";

export const dynamic = "force-dynamic";

/** Webhook بله. URL: /api/bot/bale?secret=<BOT_WEBHOOK_SECRET> */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.BOT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const update = await req.json();
    await handleBotUpdate("bale", update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/bale]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
