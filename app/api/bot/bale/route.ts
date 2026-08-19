import { NextRequest, NextResponse } from "next/server";
import { handleBotUpdate } from "@/lib/bot-handler";
import { isBotWebhookAuthorized } from "@/lib/bot-webhook";

export const dynamic = "force-dynamic";

/** Webhook بله؛ secret_token ثبت‌شده را از header سازگار Bot API بررسی می‌کند. */
export async function POST(req: NextRequest) {
  if (!isBotWebhookAuthorized(req)) {
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
