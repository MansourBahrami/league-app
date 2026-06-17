/** تبدیل ارقام فارسی (۰-۹) و عربی (٠-٩) به ارقام انگلیسی (0-9) */
export function normalizeDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const code = ch.charCodeAt(0);
    // ۰..۹ فارسی: U+06F0..U+06F9 — ٠..٩ عربی: U+0660..U+0669
    if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
    return String(code - 0x0660);
  });
}

/** نرمال‌سازی شماره موبایل ایران به فرم 09xxxxxxxxx (ارقام فارسی/عربی هم پشتیبانی می‌شوند) */
export function normalizePhone(phone: string): string {
  const digits = normalizeDigits(phone).replace(/\D/g, "");
  if (digits.startsWith("98")) return "0" + digits.slice(2);
  if (digits.startsWith("9") && digits.length === 10) return "0" + digits;
  return digits;
}
