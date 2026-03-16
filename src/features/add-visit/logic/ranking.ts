import type { RankedShowForRanking, RankingTier } from "@/features/add-visit/types";

export const TIER_ORDER: RankingTier[] = ["loved", "liked", "okay", "disliked"];

export function getTierRank(tier: RankingTier) {
  return TIER_ORDER.indexOf(tier);
}

export function normalizeTier(value: string | undefined): RankingTier {
  if (value === "loved" || value === "liked" || value === "okay" || value === "disliked") {
    return value;
  }
  return "liked";
}

export function getBottomInsertionIndexForTier(
  rankedShows: RankedShowForRanking[],
  selectedTier: RankingTier
) {
  let lastSameTier = -1;
  for (let i = 0; i < rankedShows.length; i += 1) {
    const tier = normalizeTier(rankedShows[i].tier);
    if (tier === selectedTier) lastSameTier = i;
  }
  if (lastSameTier !== -1) return lastSameTier + 1;

  const selectedRank = getTierRank(selectedTier);
  for (let i = 0; i < rankedShows.length; i += 1) {
    const tier = normalizeTier(rankedShows[i].tier);
    if (getTierRank(tier) > selectedRank) return i;
  }
  return rankedShows.length;
}
