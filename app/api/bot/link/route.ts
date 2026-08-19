import { NextRequest, NextResponse } from "next/server";
import { linkMessengerIdentity, type Messenger } from "@/lib/bot-link";

/** endpoint داخلی برای سرویس long-polling مجزای ربات. */
export async function POST(req: NextRequest) {
  const secret = process.env.BOT_API_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messenger, messengerUserId, token } = await req.json().catch(() => ({}));
  if ((messenger !== "telegram" && messenger !== "bale") || !messengerUserId || !token) {
    return NextResponse.json({ error: "ورودی نامعتبر" }, { status: 400 });
  }

  const result = await linkMessengerIdentity(messenger as Messenger, String(messengerUserId), String(token));
  const status = result === "linked" ? 200 : result === "conflict" ? 409 : 400;
  return NextResponse.json({ ok: result === "linked", result }, { status });
}
