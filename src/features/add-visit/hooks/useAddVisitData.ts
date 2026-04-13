import { useMutation, useQuery } from "convex/react";
import { useMemo } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ShowType, UserShowStatus } from "@/features/add-visit/types";
import { SHOW_TYPE_COLORS } from "@/constants/showTypeColors";

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
  const wantToSeeShowIds = useQuery(api.lists.getWantToSeeShowIds);
  const myFollowing = useQuery(api.social.social.listMyFollowing, {});
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

    // 1. Shows explicitly on the user's "Want to See" list — most actionable suggestions
    const wantToSeeSet = new Set(wantToSeeShowIds ?? []);
    const wantToSeeShows = allShows.filter((s) => wantToSeeSet.has(String(s._id)));

    // 2. Fill remaining slots with unvisited shows that have poster art (proxy for being active/popular).
    //    Exclude already-visited and already-in-want-to-see shows.
    const remaining = DEFAULT_SUGGESTION_RESULTS - wantToSeeShows.length;
    let filler: typeof allShows = [];
    if (remaining > 0) {
      filler = allShows
        .filter(
          (s) =>
            !wantToSeeSet.has(String(s._id)) &&
            !visitedShowIds.has(s._id) &&
            s.images != null &&
            s.images.length > 0
        )
        .slice(0, remaining);
    }

    return [...wantToSeeShows, ...filler];
  }, [allShows, wantToSeeShowIds, visitedShowIds]);

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

export const TYPE_LABELS: Record<ShowType, string> = Object.fromEntries(
  (Object.entries(SHOW_TYPE_COLORS) as [ShowType, { label: string }][]).map(
    ([k, v]) => [k, v.label]
  )
) as Record<ShowType, string>;
