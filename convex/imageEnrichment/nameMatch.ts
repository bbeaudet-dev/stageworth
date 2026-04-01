import { normalizeShowName } from "../showNormalization";

/**
 * Bigram-based similarity score (Dice coefficient) between two strings.
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
export function diceCoefficient(a: string, b: string): number {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.size === 0 && bigramsB.size === 0) return 1;
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;
  let intersection = 0;
  for (const gram of bigramsA) {
    if (bigramsB.has(gram)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

function bigrams(s: string): Set<string> {
  const normalized = s.toLowerCase().replace(/\s+/g, " ").trim();
  const set = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i++) {
    set.add(normalized.slice(i, i + 2));
  }
  return set;
}

const MATCH_THRESHOLD = 0.65;

/**
 * Score a candidate name against a target show name.
 * Both sides are normalized before comparison.
 * Returns the Dice coefficient; callers should reject scores below MATCH_THRESHOLD.
 */
export function scoreNameMatch(showName: string, candidateName: string): number {
  return diceCoefficient(
    normalizeShowName(showName),
    normalizeShowName(candidateName)
  );
}

export function isAcceptableMatch(score: number): boolean {
  return score >= MATCH_THRESHOLD;
}

// ─── Wikipedia title resolution ─────────────────────────────────────────────

type ShowType = "musical" | "play" | "opera" | "dance" | "other";

const TYPE_DISAMBIGUATORS: Record<ShowType, string[]> = {
  musical: ["(musical)"],
  play: ["(play)"],
  opera: ["(opera)"],
  dance: ["(musical)"],
  other: ["(musical)", "(play)"],
};

/**
 * Produce an ordered list of Wikipedia article titles to try for a given show.
 * The caller should try each in order, stopping at the first that returns a
 * valid summary with an image.
 */
export function wikipediaTitleCandidates(
  showName: string,
  showType: ShowType
): string[] {
  const base = showName.trim().replace(/\s+/g, " ");
  const candidates = [base];
  for (const suffix of TYPE_DISAMBIGUATORS[showType] ?? []) {
    candidates.push(`${base} ${suffix}`);
  }
  return candidates;
}

/**
 * Encode a show name for use in a Wikipedia API URL path segment.
 */
export function encodeWikipediaTitle(title: string): string {
  return encodeURIComponent(title.replace(/ /g, "_"));
}

// ─── Ticketmaster image selection ───────────────────────────────────────────

export type TicketmasterImage = {
  ratio?: string;
  url: string;
  width: number;
  height: number;
  fallback: boolean;
};

const PREFERRED_RATIOS = ["3_2", "4_3", "16_9"];

/**
 * Pick the best non-fallback image from a Ticketmaster image array.
 * Prefers portrait-ish ratios at the highest resolution.
 * Returns null if only fallback/placeholder images are available.
 */
export function pickBestTicketmasterImage(
  images: TicketmasterImage[]
): TicketmasterImage | null {
  const real = images.filter((img) => !img.fallback);
  if (real.length === 0) return null;

  for (const ratio of PREFERRED_RATIOS) {
    const candidates = real
      .filter((img) => img.ratio === ratio)
      .sort((a, b) => b.width - a.width);
    if (candidates.length > 0) return candidates[0];
  }
  // No preferred ratio matched — pick the largest non-fallback image.
  return real.sort((a, b) => b.width - a.width)[0] ?? null;
}
