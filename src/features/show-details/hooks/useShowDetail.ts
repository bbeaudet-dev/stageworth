import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSession } from "@/lib/auth-client";

export function useShowDetail(showId: Id<"shows"> | "") {
  const { data: session, isPending } = useSession();

  const show = useQuery(api.shows.getById, showId ? { id: showId as Id<"shows"> } : "skip");
  const visits = useQuery(api.visits.listByShow, showId ? { showId: showId as Id<"shows"> } : "skip");
  const productions = useQuery(api.productions.listByShowWithImages, showId ? { showId: showId as Id<"shows"> } : "skip");
  const myLists = useQuery(
    api.lists.getProfileLists,
    !isPending && session && showId ? { showId: showId as Id<"shows"> } : "skip"
  );
  const myTrips = useQuery(
    api.trips.trips.getMyTrips,
    !isPending && session
      ? showId
        ? { showId: showId as Id<"shows"> }
        : {}
      : "skip"
  );

  const addShowToList = useMutation(api.lists.addShowToList);
  const addShowToTrip = useMutation(api.trips.trips.addShowToTrip);
  const removeShowFromTrip = useMutation(api.trips.trips.removeShowFromTrip);
  const enrichShowScore = useAction(api.admin.showScore.enrichShowWithShowScore);
  const getRecommendation = useAction(api.recommendations.getShowRecommendation);

  // Lazily enrich ShowScore data when stale or missing
  const enrichAttempted = useRef(false);
  useEffect(() => {
    if (!showId || !show || enrichAttempted.current) return;
    const staleMs = 7 * 24 * 60 * 60 * 1000;
    const isFresh = show.showScoreUpdatedAt && Date.now() - show.showScoreUpdatedAt < staleMs;
    if (isFresh) return;
    enrichAttempted.current = true;
    enrichShowScore({ showId: showId as Id<"shows"> }).catch(() => {});
  }, [showId, show, enrichShowScore]);

  const allLists = useMemo(() => {
    if (!myLists) return [];
    return [...(myLists.systemLists ?? []), ...(myLists.customLists ?? [])];
  }, [myLists]);

  const activeTrips = useMemo(() => {
    if (!myTrips) return [];
    return myTrips.upcoming ?? [];
  }, [myTrips]);

  const broadwayShowtimes = useMemo(() => {
    if (!productions) return null;
    const prod = productions.find((p) => p.district === "broadway" && p.weeklySchedule != null);
    return prod?.weeklySchedule ?? null;
  }, [productions]);

  return {
    session,
    show,
    visits,
    productions,
    allLists,
    activeTrips,
    broadwayShowtimes,
    addShowToList,
    addShowToTrip,
    removeShowFromTrip,
    getRecommendation,
  };
}
