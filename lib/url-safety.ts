export function isSafeWebUrl(value: string, allowRelative = true): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (allowRelative && trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function safeWebUrl(value: string | null | undefined, allowRelative = true): string | null {
  if (!value) return null;
  return isSafeWebUrl(value, allowRelative) ? value.trim() : null;
}
