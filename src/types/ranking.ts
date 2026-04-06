export type RankingTier = "loved" | "liked" | "okay" | "disliked" | "unranked";
export type RankedTier = Exclude<RankingTier, "unranked">;

export const TIER_ORDER: RankedTier[] = ["loved", "liked", "okay", "disliked"];

export function getTierRank(tier: RankedTier) {
  return TIER_ORDER.indexOf(tier);
}

/** Normalizes to the full tier set — passes "unranked" through. */
export function normalizeTier(value: string | undefined): RankingTier {
  if (
    value === "loved" ||
    value === "liked" ||
    value === "okay" ||
    value === "disliked" ||
    value === "unranked"
  ) {
    return value;
  }
  return "liked";
}

/** Normalizes to a ranked tier only — "unranked" or unknown becomes "liked". */
export function normalizeRankedTier(value: string | undefined): RankedTier {
  if (value === "loved" || value === "liked" || value === "okay" || value === "disliked") {
    return value;
  }
  return "liked";
}
