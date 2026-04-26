import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { RankedShow } from "@/components/show-row-accordion";
import { inferTierAtRankPosition, normalizeTier } from "@/features/my-shows/logic/ranking";
import type { ListItem, RankingTier } from "@/features/my-shows/types";

export function useMyShowsData() {
  const rankedShows = useQuery(api.rankings.getRankedShows);
  const rankingsMeta = useQuery(api.rankings.get);
  const saveRankingSnapshot = useMutation(api.rankings.saveSnapshot);

  const [draftOrder, setDraftOrder] = useState<RankedShow[] | null>(null);
  const [draftTierByShowId, setDraftTierByShowId] = useState<Record<string, RankingTier>>(
    {}
  );
  const [draftLineIndices, setDraftLineIndices] = useState<{
    wouldSeeAgainLineIndex: number;
    stayedHomeLineIndex: number;
  } | null>(null);
  const [draftRemovedIds, setDraftRemovedIds] = useState<Set<Id<"shows">>>(() => new Set());
  const [isSavingRankingChanges, setIsSavingRankingChanges] = useState(false);
  const hasUnsavedRankingChangesRef = useRef(false);
  const pendingRemoveIds = useMemo(() => new Set<Id<"shows">>(), []);

  useEffect(() => {
    if (hasUnsavedRankingChangesRef.current) return;
    setDraftOrder(null);
    setDraftTierByShowId({});
    setDraftLineIndices(null);
    setDraftRemovedIds(new Set());
  }, [rankedShows]);

  const displayShows = (draftOrder ?? rankedShows) as RankedShow[] | undefined;
  const showsForDisplay = useMemo(() => displayShows ?? [], [displayShows]);
  const showCount = displayShows?.length ?? 0;

  const baseWouldSeeAgainLineIndex =
    rankingsMeta?.wouldSeeAgainLineIndex ?? Math.floor(showCount * 0.45);
  const baseStayedHomeLineIndex =
    rankingsMeta?.stayedHomeLineIndex ?? Math.floor(showCount * 0.85);
  const wouldSeeAgainLineIndex = Math.max(
    0,
    Math.min(draftLineIndices?.wouldSeeAgainLineIndex ?? baseWouldSeeAgainLineIndex, showCount)
  );
  const stayedHomeLineIndex = Math.max(
    0,
    Math.min(draftLineIndices?.stayedHomeLineIndex ?? baseStayedHomeLineIndex, showCount)
  );

  const getShowTier = useCallback(
    (show: RankedShow): RankingTier => draftTierByShowId[show._id] ?? normalizeTier(show.tier),
    [draftTierByShowId]
  );

  const baseSignature = useMemo(() => {
    if (!rankedShows) return null;
    const showParts = rankedShows.map((show) => `${show._id}:${normalizeTier(show.tier)}`);
    return JSON.stringify({
      shows: showParts,
      removedShowIds: [],
      wouldSeeAgainLineIndex: Math.max(
        0,
        Math.min(baseWouldSeeAgainLineIndex, rankedShows.length)
      ),
      stayedHomeLineIndex: Math.max(
        0,
        Math.min(baseStayedHomeLineIndex, rankedShows.length)
      ),
    });
  }, [baseStayedHomeLineIndex, baseWouldSeeAgainLineIndex, rankedShows]);

  const draftSignature = useMemo(() => {
    if (!displayShows) return null;
    const showParts = displayShows.map((show) => `${show._id}:${getShowTier(show)}`);
    return JSON.stringify({
      shows: showParts,
      removedShowIds: Array.from(draftRemovedIds).sort(),
      wouldSeeAgainLineIndex,
      stayedHomeLineIndex,
    });
  }, [displayShows, draftRemovedIds, getShowTier, stayedHomeLineIndex, wouldSeeAgainLineIndex]);

  const hasUnsavedRankingChanges = Boolean(
    baseSignature && draftSignature && baseSignature !== draftSignature
  );
  hasUnsavedRankingChangesRef.current = hasUnsavedRankingChanges;

  const rankChangeLabelByShowId = useMemo(() => {
    const changes: Record<string, string> = {};
    if (!rankedShows || !displayShows || !hasUnsavedRankingChanges) return changes;

    const originalTierByShowId = new Map(
      rankedShows.map((show) => [show._id, normalizeTier(show.tier)])
    );
    const originalRankByShowId = new Map<string, number>();
    rankedShows
      .filter((show) => !draftRemovedIds.has(show._id) && normalizeTier(show.tier) !== "unranked")
      .forEach((show, index) => originalRankByShowId.set(show._id, index + 1));

    const currentRankByShowId = new Map<string, number>();
    displayShows
      .filter((show) => !draftRemovedIds.has(show._id) && getShowTier(show) !== "unranked")
      .forEach((show, index) => currentRankByShowId.set(show._id, index + 1));

    for (const show of displayShows) {
      if (draftRemovedIds.has(show._id)) continue;
      const originalTier = originalTierByShowId.get(show._id);
      const currentTier = getShowTier(show);
      const originalRank = originalRankByShowId.get(show._id) ?? null;
      const currentRank = currentRankByShowId.get(show._id) ?? null;
      if (originalTier === currentTier && originalRank === currentRank) continue;
      changes[show._id] = originalRank ? `Was #${originalRank}` : "Was unranked";
    }

    return changes;
  }, [displayShows, draftRemovedIds, getShowTier, hasUnsavedRankingChanges, rankedShows]);

  const rankingChangeSummary = useMemo(() => {
    if (!rankedShows || !displayShows || !hasUnsavedRankingChanges) {
      return { removedShows: 0, removedVisits: 0, reorderedShows: 0 };
    }

    const originalTierByShowId = new Map(
      rankedShows.map((show) => [show._id, normalizeTier(show.tier)])
    );
    const originalRankByShowId = new Map<string, number>();
    rankedShows
      .filter((show) => !draftRemovedIds.has(show._id) && normalizeTier(show.tier) !== "unranked")
      .forEach((show, index) => originalRankByShowId.set(show._id, index + 1));

    const currentRankByShowId = new Map<string, number>();
    displayShows
      .filter((show) => !draftRemovedIds.has(show._id) && getShowTier(show) !== "unranked")
      .forEach((show, index) => currentRankByShowId.set(show._id, index + 1));

    let reorderedShows = 0;
    for (const show of displayShows) {
      if (draftRemovedIds.has(show._id)) continue;
      const originalTier = originalTierByShowId.get(show._id);
      const currentTier = getShowTier(show);
      const originalRank = originalRankByShowId.get(show._id) ?? null;
      const currentRank = currentRankByShowId.get(show._id) ?? null;
      if (originalTier !== currentTier || originalRank !== currentRank) {
        reorderedShows += 1;
      }
    }

    const removedVisits = displayShows
      .filter((show) => draftRemovedIds.has(show._id))
      .reduce((total, show) => total + show.visitCount, 0);

    return { removedShows: draftRemovedIds.size, removedVisits, reorderedShows };
  }, [displayShows, draftRemovedIds, getShowTier, hasUnsavedRankingChanges, rankedShows]);

  const handleDragEnd = useCallback(
    ({
      data,
      from,
      to,
      listItems,
    }: {
      data: ListItem[];
      from: number;
      to: number;
      listItems: ListItem[] | undefined;
    }) => {
      if (!listItems || !displayShows) return;
      const movedItem = listItems[from];
      if (!movedItem) return;

      if (movedItem.kind === "show") {
        const fromPosition = displayShows.findIndex((show) => show._id === movedItem.show._id);
        const showData = data
          .filter((item): item is { key: string; kind: "show"; show: RankedShow } => item.kind === "show")
          .map((item) => item.show);
        const newPosition = showData.findIndex((show) => show._id === movedItem.show._id);
        if (newPosition === -1) return;

        if (fromPosition !== -1 && newPosition !== fromPosition) {
          const firstUnrankedIndex = showData.findIndex(
            (show) => show._id !== movedItem.show._id && getShowTier(show) === "unranked"
          );
          const droppedInUnranked =
            firstUnrankedIndex !== -1 && newPosition >= firstUnrankedIndex;
          const rankedWithoutMoved = showData.filter(
            (show) => show._id !== movedItem.show._id && getShowTier(show) !== "unranked"
          );
          const rankPositionAfterDrag = showData
            .slice(0, newPosition)
            .filter((show) => getShowTier(show) !== "unranked").length;
          const nextTier = droppedInUnranked
            ? "unranked"
            : inferTierAtRankPosition(rankedWithoutMoved, rankPositionAfterDrag);

          setDraftOrder(showData);
          setDraftTierByShowId((prev) => ({
            ...prev,
            [movedItem.show._id]: nextTier,
          }));
        }
        return;
      }

      if (movedItem.kind === "tier") return;

      const linePosition = data.slice(0, to + 1).filter((item) => item.kind === "show").length;
      setDraftLineIndices((prev) => ({
        wouldSeeAgainLineIndex:
          movedItem.line === "wouldSeeAgain"
            ? linePosition
            : (prev?.wouldSeeAgainLineIndex ?? wouldSeeAgainLineIndex),
        stayedHomeLineIndex:
          movedItem.line === "stayedHome"
            ? linePosition
            : (prev?.stayedHomeLineIndex ?? stayedHomeLineIndex),
      }));
    },
    [displayShows, getShowTier, stayedHomeLineIndex, wouldSeeAgainLineIndex]
  );

  const saveRankingChanges = useCallback(async () => {
    if (!displayShows || isSavingRankingChanges || !hasUnsavedRankingChanges) return;
    setIsSavingRankingChanges(true);
    try {
      const tiers = displayShows.map((show) => ({
        showId: show._id,
        tier: getShowTier(show),
      })).filter((entry) => !draftRemovedIds.has(entry.showId));
      await saveRankingSnapshot({
        rankedShowIds: tiers
          .filter((entry) => entry.tier !== "unranked")
          .map((entry) => entry.showId),
        tiers,
        removedShowIds: Array.from(draftRemovedIds),
        wouldSeeAgainLineIndex,
        stayedHomeLineIndex,
      });
      setDraftOrder(null);
      setDraftTierByShowId({});
      setDraftLineIndices(null);
      setDraftRemovedIds(new Set());
    } finally {
      setIsSavingRankingChanges(false);
    }
  }, [
    displayShows,
    draftRemovedIds,
    getShowTier,
    hasUnsavedRankingChanges,
    isSavingRankingChanges,
    saveRankingSnapshot,
    stayedHomeLineIndex,
    wouldSeeAgainLineIndex,
  ]);

  const discardRankingChanges = useCallback(() => {
    setDraftOrder(null);
    setDraftTierByShowId({});
    setDraftLineIndices(null);
    setDraftRemovedIds(new Set());
  }, []);

  const getRankChangeLabel = useCallback(
    (show: RankedShow) => rankChangeLabelByShowId[show._id],
    [rankChangeLabelByShowId]
  );

  const handleRemoveShow = useCallback(
    (showId: Id<"shows">) => {
      setDraftRemovedIds((prev) => {
        const next = new Set(prev);
        if (next.has(showId)) next.delete(showId);
        else next.add(showId);
        return next;
      });
    },
    []
  );

  const isShowMarkedForRemoval = useCallback(
    (showId: Id<"shows">) => draftRemovedIds.has(showId),
    [draftRemovedIds]
  );

  return useMemo(
    () => ({
      displayShows,
      showsForDisplay,
      pendingRemoveIds,
      wouldSeeAgainLineIndex,
      stayedHomeLineIndex,
      getShowTier,
      getRankChangeLabel,
      isShowMarkedForRemoval,
      rankingChangeSummary,
      handleDragEnd,
      handleRemoveShow,
      saveRankingChanges,
      discardRankingChanges,
      hasUnsavedRankingChanges,
      isSavingRankingChanges,
    }),
    [
      discardRankingChanges,
      displayShows,
      getShowTier,
      getRankChangeLabel,
      isShowMarkedForRemoval,
      handleDragEnd,
      handleRemoveShow,
      hasUnsavedRankingChanges,
      isSavingRankingChanges,
      pendingRemoveIds,
      rankingChangeSummary,
      saveRankingChanges,
      showsForDisplay,
      stayedHomeLineIndex,
      wouldSeeAgainLineIndex,
    ]
  );
}
