const LEADING_ARTICLE_RE = /^(the|a|an)\s+/;
const MULTI_SPACE_RE = /\s+/g;
const COMBINING_MARKS_RE = /[\u0300-\u036f]/g;
const STRIP_PUNCTUATION_RE = /[^a-z0-9\s]/g;

export type ShowType = "musical" | "play" | "opera" | "dance" | "other";

export function normalizeShowName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_MARKS_RE, "")
    .replace(/&/g, " and ")
    .replace(STRIP_PUNCTUATION_RE, " ")
    .replace(LEADING_ARTICLE_RE, "")
    .replace(MULTI_SPACE_RE, " ")
    .trim();
}

export function isLikelyLowQualityShowName(name: string): boolean {
  const normalized = normalizeShowName(name);
  if (!normalized) return true;
  if (normalized.length < 2) return true;

  // Allow numerals/titles like "1776" while filtering obvious placeholders.
  return ["unknown", "untitled", "tbd", "n a", "na"].includes(normalized);
}

export function mapExternalTypeToShowType(rawType: string): ShowType | null {
  const normalizedType = rawType.trim().toLowerCase();

  if (
    normalizedType.includes("musical") ||
    normalizedType.includes("operetta")
  ) {
    return "musical";
  }
  if (normalizedType.includes("play") || normalizedType.includes("drama")) {
    return "play";
  }
  if (normalizedType.includes("opera")) {
    return "opera";
  }
  if (normalizedType.includes("dance") || normalizedType.includes("ballet")) {
    return "dance";
  }
  if (normalizedType) return "other";
  return null;
}
