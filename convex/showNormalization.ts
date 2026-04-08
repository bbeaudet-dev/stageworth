import { CITY_ALIASES } from "../data/city-aliases";

const LEADING_ARTICLE_RE = /^(the|a|an)\s+/;
const MULTI_SPACE_RE = /\s+/g;
const COMBINING_MARKS_RE = /[\u0300-\u036f]/g;
const STRIP_PUNCTUATION_RE = /[^a-z0-9\s]/g;

/**
 * Normalizes a user-supplied city string to the canonical form stored in the
 * venues table. Steps:
 *   1. Trim and strip a trailing state abbreviation (e.g. "New York, NY" → "New York")
 *   2. Check the alias map (case-insensitive) → return canonical form if matched
 *   3. Otherwise title-case the trimmed result
 */
export function normalizeCityName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  // Strip trailing ", XX" or " XX" state abbreviation (e.g. "Boston, MA" or "Boston MA")
  const withoutState = trimmed.replace(/[,\s]+[A-Z]{2}$/, "").trim();

  const key = withoutState.toLowerCase();
  if (CITY_ALIASES[key]) return CITY_ALIASES[key];

  // Title-case words: "new york" → "New York"
  return withoutState
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

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
