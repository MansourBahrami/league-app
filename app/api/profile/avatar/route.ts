import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// حداکثر حجم عکس آپلودی پس از فشرده‌سازیِ کلاینت. کلاینت به ~۲۵۶px مربع و WebP/JPEG
// کاهش می‌دهد (چند ده KB)؛ این سقف فقط محافظ سمت سرور است.
const MAX_BYTES = 512 * 1024; // 512KB
const ALLOWED = new Set(["image/webp", "image/jpeg", "image/png"]);

// POST /api/profile/avatar — بدنه‌ی درخواست خودِ بایت‌های تصویر است،
// و Content-Type نوع آن را مشخص می‌کند (بدون multipart).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json({ error: "فرمت تصویر پشتیبانی نمی‌شود" }, { status: 415 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ error: "تصویری دریافت نشد" }, { status: 400 });
  }
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "حجم تصویر زیاد است" }, { status: 413 });
  }

  await prisma.avatarImage.upsert({
    where: { userId: session.userId },
    update: { data: buf, contentType },
    create: { userId: session.userId, data: buf, contentType },
  });

  // avatarUrl به مسیر سروِ تصویر با نسخه (cache-busting) اشاره می‌کند تا تصویر جدید
  // فوراً در همه‌جا (فید، لیدربورد، پروفایل) دیده شود.
  const avatarUrl = `/api/avatar/${session.userId}?v=${Date.now()}`;
  await prisma.user.update({
    where: { id: session.userId },
    data: { avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}

// DELETE /api/profile/avatar — حذف عکس آپلودی و بازگشت به حالت بدون عکس
// (پلیس‌هولدر حرف اول نام؛ کاربر می‌تواند دوباره آواتار آماده انتخاب کند).
export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // deleteMany تا اگر ردیفی نبود خطا ندهد (مثلاً وقتی آواتار فعلی یک SVG آماده است)
  await prisma.avatarImage.deleteMany({ where: { userId: session.userId } });
  await prisma.user.update({
    where: { id: session.userId },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ avatarUrl: null });
}
