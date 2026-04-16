import { useQuery } from "convex/react";
import { useMemo } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const MIN_SEARCH_LENGTH = 2;

export function useSearchBrowse(query: string) {
  const trimmed = query.trim();
  const isSearchActive = trimmed.length >= MIN_SEARCH_LENGTH;

  // Search queries (active when query is long enough)
  const showResults = useQuery(api.shows.search, isSearchActive ? { q: trimmed, limit: 24 } : "skip");
  const userResults = useQuery(api.social.profiles.searchUsers, isSearchActive ? { q: trimmed } : "skip");
  const venueResults = useQuery(api.venues.search, isSearchActive ? { query: trimmed } : "skip");

  // Browse queries (always loaded)
  const currentShows = useQuery(api.productions.listCurrent, {});
  const upcomingShows = useQuery(api.productions.listUpcoming, { days: 60 });
  const closingSoon = useQuery(api.productions.listClosingSoon, { days: 70 });

  // User discovery rails (browse state only)
  const recentUsers = useQuery(api.social.profiles.searchUsers, !isSearchActive ? { q: "" } : "skip");
  const topTheatregoers = useQuery(api.userStats.getTopTheatregoers, !isSearchActive ? { limit: 12 } : "skip");

  // Collect visible showIds to batch-fetch list statuses
  const browseShowIds = useMemo<Id<"shows">[]>(() => {
    const seen = new Set<string>();
    const ids: Id<"shows">[] = [];
    const addShows = (prods?: { show: { _id: string } }[] | null) => {
      if (!prods) return;
      for (const p of prods) {
        if (!seen.has(p.show._id)) {
          seen.add(p.show._id);
          ids.push(p.show._id as Id<"shows">);
        }
      }
    };
    addShows(currentShows);
    addShows(closingSoon);
    addShows(upcomingShows);
    return ids;
  }, [currentShows, closingSoon, upcomingShows]);

  const searchShowIds = useMemo<Id<"shows">[]>(() => {
    if (!showResults?.length) return [];
    return showResults.map((s) => s._id as Id<"shows">);
  }, [showResults]);

  const allVisibleShowIds = useMemo<Id<"shows">[]>(() => {
    if (isSearchActive) return searchShowIds;
    return browseShowIds;
  }, [isSearchActive, searchShowIds, browseShowIds]);

  const listStatuses = useQuery(
    api.lists.getShowListStatuses,
    allVisibleShowIds.length > 0 ? { showIds: allVisibleShowIds } : "skip"
  );

  const getListStatus = (showId: string) => {
    if (!listStatuses) return undefined;
    const key = listStatuses[showId];
    return (key as "want_to_see" | "look_into" | "not_interested" | "uncategorized" | undefined) ?? "none";
  };

  return {
    trimmed,
    isSearchActive,
    showResults,
    userResults,
    venueResults,
    currentShows,
    upcomingShows,
    closingSoon,
    recentUsers,
    topTheatregoers,
    listStatuses,
    getListStatus,
  };
}
