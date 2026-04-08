/**
 * Safe in-app path for redirecting back to the admin list (or another /admin page).
 * Rejects values that could act as an open redirect (protocol-relative URLs, etc.).
 */
export function sanitizeAdminReturnTo(raw: string | null): string | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (s === "/admin") return "/admin";
  if (!s.startsWith("/admin?")) return null;
  if (s.includes("//") || s.includes("\\") || s.includes("@")) return null;
  return s;
}
