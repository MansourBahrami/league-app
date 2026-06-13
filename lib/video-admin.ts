export const VALID_GRADES = ["دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل"];

/** پارس و پاکسازی بدنه‌ی فرم ویدیو (مشترک بین POST و PATCH ادمین). */
export function parseVideoBody(body: Record<string, unknown>) {
  const grades = Array.isArray(body.grades)
    ? (body.grades as unknown[]).map(String).filter((g) => VALID_GRADES.includes(g))
    : [];
  const ctaLabel = body.ctaLabel ? String(body.ctaLabel).trim() : "";
  const ctaUrl = body.ctaUrl ? String(body.ctaUrl).trim() : "";
  return {
    title: String(body.title ?? "").trim(),
    description: body.description ? String(body.description) : null,
    day: Number(body.day) || 0,
    durationMin: Number(body.durationMin) || 0,
    hlsUrl: String(body.hlsUrl ?? "").trim(),
    thumbnailUrl: body.thumbnailUrl ? String(body.thumbnailUrl) : null,
    grades,
    // CTA فقط وقتی ذخیره می‌شود که هم متن و هم لینک باشد
    ctaLabel: ctaLabel && ctaUrl ? ctaLabel : null,
    ctaUrl: ctaLabel && ctaUrl ? ctaUrl : null,
    isActive: body.isActive !== false,
  };
}
