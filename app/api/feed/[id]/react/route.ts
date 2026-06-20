import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { toggleReaction } from "@/lib/reaction";

/** افزودن/تغییر/برداشتن واکنش روی یک آیتم فید */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { emoji } = await req.json().catch(() => ({}));
  if (!emoji || typeof emoji !== "string") {
    return NextResponse.json({ error: "emoji لازم است" }, { status: 400 });
  }

  const result = await toggleReaction(session.userId, id, emoji);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json(result);
}
