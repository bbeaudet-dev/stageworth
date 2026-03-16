import type { RankedShow } from "@/components/show-row-accordion";

import type { RankedTier, RankingTier } from "@/features/my-shows/types";

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

export function inferTierAtRankPosition(
  rankedShows: RankedShow[],
  insertAt: number
): RankedTier {
  const prev = insertAt > 0 ? normalizeTier(rankedShows[insertAt - 1]?.tier) : null;
  if (prev && prev !== "unranked") return prev;

  const next =
    insertAt < rankedShows.length ? normalizeTier(rankedShows[insertAt]?.tier) : null;
  if (next && next !== "unranked") return next;

  return "liked";
}
