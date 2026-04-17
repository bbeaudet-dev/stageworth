import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type Category = "shows" | "theatres" | "signups" | "streak" | "score";
export type Scope = "all" | "friends";
export type VisitsMode = "shows" | "visits" | "single_show" | "select_show";

interface UseLeaderboardDataArgs {
  category: Category;
  scope: Scope;
  visitsMode: VisitsMode;
  selectedShowId: Id<"shows"> | undefined;
  showSearchQuery: string;
}

export function useLeaderboardData({
  category,
  scope,
  visitsMode,
  selectedShowId,
  showSearchQuery,
}: UseLeaderboardDataArgs) {
  const showsData = useQuery(
    api.leaderboard.getByShows,
    category === "shows" && visitsMode === "shows" ? { scope } : "skip",
  );
  const visitsData = useQuery(
    api.leaderboard.getByVisits,
    category === "shows" && visitsMode === "visits" ? { scope, mode: "total" } : "skip",
  );
  const visitsSingleShowData = useQuery(
    api.leaderboard.getByVisits,
    category === "shows" && visitsMode === "single_show" ? { scope, mode: "single_show" } : "skip",
  );
  const visitsSelectShowData = useQuery(
    api.leaderboard.getByVisits,
    category === "shows" && visitsMode === "select_show" && selectedShowId
      ? { scope, mode: "per_show", showId: selectedShowId }
      : "skip",
  );
  const theatresData = useQuery(
    api.leaderboard.getByTheatres,
    category === "theatres" ? { scope } : "skip",
  );
  const signupsData = useQuery(
    api.leaderboard.getBySignups,
    category === "signups" ? { scope } : "skip",
  );
  const streakData = useQuery(
    api.leaderboard.getByStreak,
    category === "streak" ? { scope } : "skip",
  );
  const scoreData = useQuery(
    api.leaderboard.getByScore,
    category === "score" ? { scope } : "skip",
  );
  const showSearchResults = useQuery(
    api.shows.search,
    category === "shows" && visitsMode === "select_show" && showSearchQuery.length >= 1
      ? { q: showSearchQuery, limit: 8 }
      : "skip",
  );

  const showsCategoryData =
    visitsMode === "shows"
      ? showsData
      : visitsMode === "visits"
        ? visitsData
        : visitsMode === "single_show"
          ? visitsSingleShowData
          : visitsSelectShowData;

  const data =
    category === "shows"
      ? showsCategoryData
      : category === "theatres"
        ? theatresData
        : category === "signups"
          ? signupsData
          : category === "streak"
            ? streakData
            : scoreData;

  const countLabel =
    category === "shows"
      ? visitsMode === "shows"
        ? "shows"
        : visitsMode === "single_show"
          ? "best"
          : "visits"
      : category === "theatres"
        ? "theatres"
        : category === "signups"
          ? "signups"
          : category === "streak"
            ? "wk streak"
            : "pts";

  return { data, countLabel, showSearchResults };
}
