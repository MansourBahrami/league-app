import { NextRequest, NextResponse } from "next/server";
import { handleBotUpdate } from "@/lib/bot-handler";
import { isBotWebhookAuthorized } from "@/lib/bot-webhook";

export const dynamic = "force-dynamic";

/** Webhook تلگرام؛ secret_token ثبت‌شده را از header رسمی بررسی می‌کند. */
export async function POST(req: NextRequest) {
  if (!isBotWebhookAuthorized(req)) {
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
