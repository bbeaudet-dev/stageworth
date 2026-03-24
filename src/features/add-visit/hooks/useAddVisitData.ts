import { useMutation, useQuery } from "convex/react";
import { useMemo } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ShowType, UserShowStatus } from "@/features/add-visit/types";

const MAX_RESULTS = 10;
const DEFAULT_SUGGESTION_RESULTS = 10;

export function useAddVisitData({
  query,
  selectedShowId,
}: {
  query: string;
  selectedShowId: Id<"shows"> | null;
}) {
  const allShows = useQuery(api.shows.list);
  const rankedShows = useQuery(api.rankings.getRankedShows);
  const visitHistory = useQuery(api.visits.listAllWithShows);
  const showContext = useQuery(api.visits.getAddVisitContext, {
    showId: selectedShowId ?? undefined,
  });
  const productions = useQuery(
    api.productions.listByShow,
    selectedShowId ? { showId: selectedShowId } : "skip"
  );
  const myFollowing = useQuery(api.social.listMyFollowing, {});
  const createVisitMutation = useMutation(api.visits.createVisit);

  const selectedShow = useMemo(
    () => allShows?.find((show) => show._id === selectedShowId) ?? null,
    [allShows, selectedShowId]
  );

  const productionOptions = productions ?? [];
  const userShowStatusById = useMemo(() => {
    const map = new Map<Id<"shows">, UserShowStatus>();
    for (const status of (rankedShows ?? []) as UserShowStatus[]) {
      map.set(status._id, status);
    }
    return map;
  }, [rankedShows]);

  const visitedShowIds = useMemo(() => {
    const ids = new Set<Id<"shows">>();
    for (const visit of (visitHistory ?? []).filter(
      (entry): entry is NonNullable<typeof entry> => entry !== null
    )) {
      ids.add(visit.showId as Id<"shows">);
    }
    return ids;
  }, [visitHistory]);

  const filteredShows = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || !allShows) return [];
    const lower = trimmed.toLowerCase();
    return allShows
      .filter((show) => show.name.toLowerCase().includes(lower))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(lower);
        const bStarts = b.name.toLowerCase().startsWith(lower);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, MAX_RESULTS);
  }, [allShows, query]);

  const suggestedShows = useMemo(() => {
    if (!allShows) return [];
    const rankedIds = new Set<Id<"shows">>();
    const rankedFirst: typeof allShows = [];
    const unseenPool: typeof allShows = [];

    for (const entry of (rankedShows ?? []) as UserShowStatus[]) {
      if (entry.isUnranked || entry.tier === "unranked") continue;
      rankedIds.add(entry._id);
    }

    for (const show of allShows) {
      if (rankedIds.has(show._id)) rankedFirst.push(show);
      else unseenPool.push(show);
    }

    unseenPool.sort((a, b) => a.name.localeCompare(b.name));
    return [...rankedFirst, ...unseenPool].slice(0, DEFAULT_SUGGESTION_RESULTS);
  }, [allShows, rankedShows]);

  const searchResults = query.trim().length > 0 ? filteredShows : suggestedShows;

  const hasExactMatch = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return lower.length > 0 && filteredShows.some((show) => show.name.toLowerCase() === lower);
  }, [filteredShows, query]);

  const exactMatches = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) return [];
    return filteredShows.filter((show) => show.name.toLowerCase() === lower);
  }, [filteredShows, query]);

  const hasOfficialProductions = productionOptions.length > 0;
  const shouldForceOtherLocation =
    selectedShowId !== null && productions !== undefined && !hasOfficialProductions;

  const createVisit = useMemo(
    () =>
      (args: Parameters<typeof createVisitMutation>[0]) =>
        createVisitMutation(args),
    [createVisitMutation]
  );

  return {
    allShows,
    rankedShows,
    showContext,
    productions,
    productionOptions,
    selectedShow,
    userShowStatusById,
    visitedShowIds,
    searchResults,
    hasExactMatch,
    exactMatches,
    hasOfficialProductions,
    shouldForceOtherLocation,
    myFollowing: myFollowing ?? [],
    createVisit,
  };
}

export const TYPE_LABELS: Record<ShowType, string> = {
  musical: "Musical",
  play: "Play",
  opera: "Opera",
  dance: "Dance",
  other: "Other",
};
