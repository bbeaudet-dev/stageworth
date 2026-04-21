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

/**
 * Maps a tier-relative insertion index (0-based, inclusive of the bottom
 * slot) to an absolute index in the overall ranked list. Unlike the version
 * exposed on `useAddVisitRankingFlow`, this works for ANY tier, not just the
 * currently-selected one — needed when the Suggested Ranking engine wants to
 * slot into a tier the user hasn't opened yet.
 */
export function getInsertionIndexForTierAndRelative(
  rankedShows: RankedShowForRanking[],
  tier: RankedTier,
  relativeInsertIndex: number,
) {
  const absoluteIndicesInTier: number[] = [];
  for (let i = 0; i < rankedShows.length; i += 1) {
    if (normalizeRankedTier(rankedShows[i].tier) === tier) {
      absoluteIndicesInTier.push(i);
    }
  }
  if (absoluteIndicesInTier.length === 0) {
    return getBottomInsertionIndexForTier(rankedShows, tier);
  }
  if (relativeInsertIndex >= absoluteIndicesInTier.length) {
    return absoluteIndicesInTier[absoluteIndicesInTier.length - 1] + 1;
  }
  if (relativeInsertIndex <= 0) {
    return absoluteIndicesInTier[0];
  }
  return absoluteIndicesInTier[relativeInsertIndex];
}
