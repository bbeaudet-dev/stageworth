import type { RankedShowForRanking } from "@/features/add-visit/types";
import type { RankedTier } from "@/types/ranking";
import { getTierRank, normalizeRankedTier, TIER_ORDER } from "@/types/ranking";

export { getTierRank, normalizeRankedTier, TIER_ORDER };

export function getBottomInsertionIndexForTier(
  rankedShows: RankedShowForRanking[],
  selectedTier: RankedTier,
) {
  let lastSameTier = -1;
  for (let i = 0; i < rankedShows.length; i += 1) {
    const tier = normalizeRankedTier(rankedShows[i].tier);
    if (tier === selectedTier) lastSameTier = i;
  }
  if (lastSameTier !== -1) return lastSameTier + 1;

  const selectedRank = getTierRank(selectedTier);
  for (let i = 0; i < rankedShows.length; i += 1) {
    const tier = normalizeRankedTier(rankedShows[i].tier);
    if (getTierRank(tier) > selectedRank) return i;
  }
  return rankedShows.length;
}
