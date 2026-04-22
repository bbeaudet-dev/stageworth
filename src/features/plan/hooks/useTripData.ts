import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSession } from "@/lib/auth-client";

export function useTripData() {
  const { data: session, isPending } = useSession();
  const trips = useQuery(api.trips.trips.getMyTrips, !isPending && session ? {} : "skip");
  const createTrip = useMutation(api.trips.trips.createTrip);
  const updateTrip = useMutation(api.trips.trips.updateTrip);
  const deleteTrip = useMutation(api.trips.trips.deleteTrip);
  const addShowToTrip = useMutation(api.trips.trips.addShowToTrip);
  const removeShowFromTrip = useMutation(api.trips.trips.removeShowFromTrip);
  const assignShowToDay = useMutation(api.trips.trips.assignShowToDay);
  const reorderTripDay = useMutation(api.trips.trips.reorderTripDay);
  const addTripMember = useMutation(api.trips.trips.addTripMember);
  const updateTripMemberRole = useMutation(api.trips.trips.updateTripMemberRole);
  const removeTripMember = useMutation(api.trips.trips.removeTripMember);
  const leaveTrip = useMutation(api.trips.trips.leaveTrip);
  const addTripDayNote = useMutation(api.trips.trips.addTripDayNote);
  const removeTripDayNote = useMutation(api.trips.trips.removeTripDayNote);
  const setTripShowLabel = useMutation(api.trips.tripLabels.setTripShowLabel);
  const clearTripShowLabel = useMutation(api.trips.tripLabels.clearTripShowLabel);
  const respondToTripInvitation = useMutation(api.trips.trips.respondToTripInvitation);

  return {
    trips,
    createTrip,
    updateTrip,
    deleteTrip,
    addShowToTrip,
    removeShowFromTrip,
    assignShowToDay,
    reorderTripDay,
    addTripMember,
    updateTripMemberRole,
    removeTripMember,
    leaveTrip,
    addTripDayNote,
    removeTripDayNote,
    setTripShowLabel,
    clearTripShowLabel,
    respondToTripInvitation,
  };
}

export function useTripById(tripId: Id<"trips">) {
  return useQuery(api.trips.trips.getTripById, { tripId });
}

export function useClosingSoonForTrip(tripId: Id<"trips">) {
  return useQuery(api.trips.trips.getClosingSoonForTrip, { tripId });
}
