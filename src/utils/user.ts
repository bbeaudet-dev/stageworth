export function getInitials(name?: string | null, username?: string) {
  const source = name?.trim() || username || "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function getDisplayName(name?: string | null, fallback?: string) {
  const trimmed = name?.trim();
  if (!trimmed) return fallback ?? "";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
  return parts[0] || fallback || "";
}
