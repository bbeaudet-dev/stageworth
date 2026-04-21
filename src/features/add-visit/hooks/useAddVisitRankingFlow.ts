import { useMemo } from "react";

import {
  getBottomInsertionIndexForTier,
  normalizeRankedTier,
} from "@/features/add-visit/logic/ranking";
import type {
  RankedShowForRanking,
  RankedTier,
  ShowType,
} from "@/features/add-visit/types";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Chooses which existing show to surface in the next binary-halving comparison.
 *
 * Preferences, in order:
 *   1. Stay inside the current search window `[low, high)` so halving stays correct.
 *   2. Match the new show's type (musical↔musical, play↔play, …) when any
 *      same-type candidate exists in the window.
 *   3. Be as close as possible to the mathematical mid-point so we still halve
 *      the window aggressively.
 *   4. Respect the user's "Skip" choices for the current step.
 *
 * If every in-range index has been skipped we ignore the skip set as a safety
 * net — the user has effectively rejected every candidate so we'll re-show the
 * mid and let them answer.
 */
function pickComparisonIndex({
  tierShows,
  searchLow,
  searchHigh,
  preferredType,
  skippedIndices,
}: {
  tierShows: RankedShowForRanking[];
  searchLow: number;
  searchHigh: number;
  preferredType: ShowType | undefined;
  skippedIndices: number[];
}): number | null {
  if (searchLow >= searchHigh) return null;
  if (tierShows.length === 0) return null;

  const mid = Math.floor((searchLow + searchHigh) / 2);
  const skipped = new Set(skippedIndices);

  const inRange: number[] = [];
  for (let i = searchLow; i < searchHigh; i += 1) {
    if (i >= 0 && i < tierShows.length) inRange.push(i);
  }
  if (inRange.length === 0) return null;

  const unskipped = inRange.filter((i) => !skipped.has(i));
  // If the user skipped every possible candidate for this step we still have to
  // surface *something* — fall back to the full in-range pool rather than
  // returning null and stalling the flow.
  const pool = unskipped.length > 0 ? unskipped : inRange;

  const sameType =
    preferredType !== undefined
      ? pool.filter((i) => tierShows[i]?.type === preferredType)
      : [];
  const candidatePool = sameType.length > 0 ? sameType : pool;

  let best = candidatePool[0];
  let bestDistance = Math.abs(best - mid);
  for (let i = 1; i < candidatePool.length; i += 1) {
    const idx = candidatePool[i];
    const distance = Math.abs(idx - mid);
    if (distance < bestDistance || (distance === bestDistance && idx < best)) {
      best = idx;
      bestDistance = distance;
    }
  }
  return best;
}

export function useAddVisitRankingFlow({
  rankedShows,
  selectedShowId,
  selectedShowType,
  selectedTier,
  searchLow,
  searchHigh,
  rankingResultIndex,
  skippedComparisonIndices,
}: {
  rankedShows: RankedShowForRanking[] | undefined;
  selectedShowId: Id<"shows"> | null;
  selectedShowType: ShowType | undefined;
  selectedTier: RankedTier | null;
  searchLow: number;
  searchHigh: number;
  rankingResultIndex: number | null;
  skippedComparisonIndices: number[];
}) {
  const isRankingsLoading = rankedShows === undefined;

  const rankedShowsForRanking = useMemo<RankedShowForRanking[]>(() => {
    const base = ((rankedShows ?? []) as RankedShowForRanking[]).filter(
      (show) => !show.isUnranked && show.tier !== "unranked"
    );
    if (!selectedShowId) return base;
    return base.filter((show) => show._id !== selectedShowId);
  }, [rankedShows, selectedShowId]);

  const tierComparisonShows = useMemo(() => {
    if (!selectedTier) return [];
    return rankedShowsForRanking.filter((show) => normalizeRankedTier(show.tier) === selectedTier);
  }, [rankedShowsForRanking, selectedTier]);

  const tierAbsoluteIndices = useMemo(() => {
    if (!selectedTier) return [];
    return rankedShowsForRanking
      .map((show, index) => (normalizeRankedTier(show.tier) === selectedTier ? index : -1))
      .filter((index) => index >= 0);
  }, [rankedShowsForRanking, selectedTier]);

  const comparisonIndex = useMemo(() => {
    if (!selectedTier || rankingResultIndex !== null) return null;
    return pickComparisonIndex({
      tierShows: tierComparisonShows,
      searchLow,
      searchHigh,
      preferredType: selectedShowType,
      skippedIndices: skippedComparisonIndices,
    });
  }, [
    rankingResultIndex,
    searchHigh,
    searchLow,
    selectedShowType,
    selectedTier,
    skippedComparisonIndices,
    tierComparisonShows,
  ]);

  const comparisonTarget =
    comparisonIndex !== null ? tierComparisonShows[comparisonIndex] ?? null : null;

  // Are there any other in-range candidates we could swap to if the user skips?
  const canSkipComparison = useMemo(() => {
    if (comparisonIndex === null) return false;
    if (searchHigh - searchLow <= 1) return false;
    const skipped = new Set(skippedComparisonIndices);
    for (let i = searchLow; i < searchHigh; i += 1) {
      if (i === comparisonIndex) continue;
      if (skipped.has(i)) continue;
      if (i < 0 || i >= tierComparisonShows.length) continue;
      return true;
    }
    return false;
  }, [
    comparisonIndex,
    searchHigh,
    searchLow,
    skippedComparisonIndices,
    tierComparisonShows.length,
  ]);

  const predictedResultIndex = useMemo(() => {
    if (rankingResultIndex !== null) return rankingResultIndex;
    if (!selectedTier) return null;
    if (tierComparisonShows.length === 0) {
      return getBottomInsertionIndexForTier(rankedShowsForRanking, selectedTier);
    }
    if (searchLow >= searchHigh) {
      const relativeInsert = searchLow;
      if (tierAbsoluteIndices.length === 0) {
        return getBottomInsertionIndexForTier(rankedShowsForRanking, selectedTier);
      }
      if (relativeInsert >= tierAbsoluteIndices.length) {
        return tierAbsoluteIndices[tierAbsoluteIndices.length - 1] + 1;
      }
      return tierAbsoluteIndices[relativeInsert];
    }
    return null;
  }, [
    rankingResultIndex,
    rankedShowsForRanking,
    searchHigh,
    searchLow,
    selectedTier,
    tierAbsoluteIndices,
    tierComparisonShows.length,
  ]);

  const rankingPhase: "tier" | "comparison" | "result" = useMemo(() => {
    if (!selectedTier) return "tier";
    if (rankingResultIndex !== null) return "result";
    if (tierComparisonShows.length === 0) return "result";
    return searchLow >= searchHigh ? "result" : "comparison";
  }, [rankingResultIndex, searchHigh, searchLow, selectedTier, tierComparisonShows.length]);

  const getInsertionIndexForRelative = (tier: RankedTier, relativeInsertIndex: number) => {
    if (tierAbsoluteIndices.length === 0) {
      return getBottomInsertionIndexForTier(rankedShowsForRanking, tier);
    }
    if (relativeInsertIndex >= tierAbsoluteIndices.length) {
      return tierAbsoluteIndices[tierAbsoluteIndices.length - 1] + 1;
    }
    return tierAbsoluteIndices[relativeInsertIndex];
  };

  return {
    isRankingsLoading,
    rankedShowsForRanking,
    tierComparisonShows,
    comparisonIndex,
    comparisonTarget,
    canSkipComparison,
    predictedResultIndex,
    rankingPhase,
    getInsertionIndexForRelative,
  };
}
