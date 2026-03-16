import { useMemo } from "react";

import {
  getBottomInsertionIndexForTier,
  normalizeTier,
} from "@/features/add-visit/logic/ranking";
import type { RankedShowForRanking, RankingTier } from "@/features/add-visit/types";
import type { Id } from "@/convex/_generated/dataModel";

export function useAddVisitRankingFlow({
  rankedShows,
  selectedShowId,
  selectedTier,
  searchLow,
  searchHigh,
  rankingResultIndex,
}: {
  rankedShows: RankedShowForRanking[] | undefined;
  selectedShowId: Id<"shows"> | null;
  selectedTier: RankingTier | null;
  searchLow: number;
  searchHigh: number;
  rankingResultIndex: number | null;
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
    return rankedShowsForRanking.filter((show) => normalizeTier(show.tier) === selectedTier);
  }, [rankedShowsForRanking, selectedTier]);

  const tierAbsoluteIndices = useMemo(() => {
    if (!selectedTier) return [];
    return rankedShowsForRanking
      .map((show, index) => (normalizeTier(show.tier) === selectedTier ? index : -1))
      .filter((index) => index >= 0);
  }, [rankedShowsForRanking, selectedTier]);

  const comparisonMidIndex = useMemo(() => {
    if (!selectedTier || rankingResultIndex !== null) return null;
    if (searchLow >= searchHigh) return null;
    return Math.floor((searchLow + searchHigh) / 2);
  }, [rankingResultIndex, searchHigh, searchLow, selectedTier]);

  const comparisonTarget =
    comparisonMidIndex !== null ? tierComparisonShows[comparisonMidIndex] : null;

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

  const getInsertionIndexForRelative = (tier: RankingTier, relativeInsertIndex: number) => {
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
    comparisonMidIndex,
    comparisonTarget,
    predictedResultIndex,
    rankingPhase,
    getInsertionIndexForRelative,
  };
}
