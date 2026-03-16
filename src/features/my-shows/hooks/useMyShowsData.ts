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
  const reorder = useMutation(api.rankings.reorder);
  const removeShow = useMutation(api.rankings.removeShow);
  const rankUnrankedShow = useMutation(api.rankings.rankUnrankedShow);
  const unrankShow = useMutation(api.rankings.unrankShow);
  const updateSpecialLinePosition = useMutation(api.rankings.updateSpecialLinePosition);

  const [optimisticOrder, setOptimisticOrder] = useState<RankedShow[] | null>(null);
  const [optimisticTierByShowId, setOptimisticTierByShowId] = useState<Record<string, RankingTier>>(
    {}
  );
  const [pendingRemoveIds, setPendingRemoveIds] = useState<Set<Id<"shows">>>(() => new Set());
  const mutationQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    setOptimisticOrder(null);
    setOptimisticTierByShowId({});
  }, [rankedShows]);

  const displayShows = (optimisticOrder ?? rankedShows) as RankedShow[] | undefined;
  const showsForDisplay = useMemo(() => displayShows ?? [], [displayShows]);
  const showCount = displayShows?.length ?? 0;

  const wouldSeeAgainLineIndex = Math.max(
    0,
    Math.min(rankingsMeta?.wouldSeeAgainLineIndex ?? Math.floor(showCount * 0.45), showCount)
  );
  const stayedHomeLineIndex = Math.max(
    0,
    Math.min(rankingsMeta?.stayedHomeLineIndex ?? Math.floor(showCount * 0.85), showCount)
  );

  const getShowTier = useCallback(
    (show: RankedShow): RankingTier => optimisticTierByShowId[show._id] ?? normalizeTier(show.tier),
    [optimisticTierByShowId]
  );

  const handleDragEnd = useCallback(
    async ({
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

        const movedTier = getShowTier(movedItem.show);
        const rankedAfterDrag = showData.filter(
          (show) => getShowTier(show) !== "unranked" || show._id === movedItem.show._id
        );
        const rankPositionAfterDrag = rankedAfterDrag.findIndex((show) => show._id === movedItem.show._id);

        if (fromPosition !== -1 && newPosition !== fromPosition) {
          setOptimisticOrder(showData);
          if (movedTier === "unranked") {
            const rankedOnly = displayShows.filter((show) => getShowTier(show) !== "unranked");
            const nextTier = inferTierAtRankPosition(rankedOnly, rankPositionAfterDrag);
            setOptimisticTierByShowId((prev) => ({
              ...prev,
              [movedItem.show._id]: nextTier,
            }));
            mutationQueueRef.current = mutationQueueRef.current
              .then(() =>
                rankUnrankedShow({
                  showId: movedItem.show._id,
                  newPosition: rankPositionAfterDrag,
                  tier: nextTier,
                })
              )
              .then(() => undefined)
              .catch((error) => {
                console.error("Failed to rank unranked show:", error);
              });
          } else {
            const firstUnrankedIndex = showData.findIndex(
              (show) => show._id !== movedItem.show._id && getShowTier(show) === "unranked"
            );
            const droppedAfterUnranked = firstUnrankedIndex !== -1 && newPosition >= firstUnrankedIndex;

            if (droppedAfterUnranked) {
              setOptimisticTierByShowId((prev) => ({
                ...prev,
                [movedItem.show._id]: "unranked",
              }));
              mutationQueueRef.current = mutationQueueRef.current
                .then(() => unrankShow({ showId: movedItem.show._id }))
                .then(() => undefined)
                .catch((error) => {
                  console.error("Failed to unrank show:", error);
                });
            } else {
              mutationQueueRef.current = mutationQueueRef.current
                .then(() => reorder({ showId: movedItem.show._id, newPosition: rankPositionAfterDrag }))
                .then(() => undefined)
                .catch((error) => {
                  console.error("Failed to reorder show:", error);
                });
            }
          }
        }
        return;
      }

      if (movedItem.kind === "tier") return;

      const linePosition = data.slice(0, to + 1).filter((item) => item.kind === "show").length;
      mutationQueueRef.current = mutationQueueRef.current
        .then(() =>
          updateSpecialLinePosition({
            line: movedItem.line,
            position: linePosition,
          })
        )
        .then(() => undefined)
        .catch((error) => {
          console.error("Failed to update special line position:", error);
        });
    },
    [displayShows, getShowTier, rankUnrankedShow, reorder, unrankShow, updateSpecialLinePosition]
  );

  const handleRemoveShow = useCallback(
    (showId: Id<"shows">, onDone?: () => void) => {
      setPendingRemoveIds((prev) => new Set(prev).add(showId));
      removeShow({ showId }).finally(() => {
        setPendingRemoveIds((prev) => {
          const next = new Set(prev);
          next.delete(showId);
          return next;
        });
        onDone?.();
      });
    },
    [removeShow]
  );

  return useMemo(
    () => ({
      displayShows,
      showsForDisplay,
      pendingRemoveIds,
      wouldSeeAgainLineIndex,
      stayedHomeLineIndex,
      getShowTier,
      handleDragEnd,
      handleRemoveShow,
    }),
    [
      displayShows,
      getShowTier,
      handleDragEnd,
      handleRemoveShow,
      pendingRemoveIds,
      showsForDisplay,
      stayedHomeLineIndex,
      wouldSeeAgainLineIndex,
    ]
  );
}
