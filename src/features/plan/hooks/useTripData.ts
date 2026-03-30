import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useTripData() {
  const trips = useQuery(api.trips.getMyTrips);
  const createTrip = useMutation(api.trips.createTrip);
  const updateTrip = useMutation(api.trips.updateTrip);
  const deleteTrip = useMutation(api.trips.deleteTrip);
  const addShowToTrip = useMutation(api.trips.addShowToTrip);
  const removeShowFromTrip = useMutation(api.trips.removeShowFromTrip);
  const assignShowToDay = useMutation(api.trips.assignShowToDay);
  const reorderTripDay = useMutation(api.trips.reorderTripDay);
  const addTripMember = useMutation(api.trips.addTripMember);
  const updateTripMemberRole = useMutation(api.trips.updateTripMemberRole);
  const removeTripMember = useMutation(api.trips.removeTripMember);
  const addTripDayNote = useMutation(api.trips.addTripDayNote);
  const removeTripDayNote = useMutation(api.trips.removeTripDayNote);
  const setTripShowLabel = useMutation(api.tripLabels.setTripShowLabel);
  const clearTripShowLabel = useMutation(api.tripLabels.clearTripShowLabel);
  const respondToTripInvitation = useMutation(api.trips.respondToTripInvitation);

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
    addTripDayNote,
    removeTripDayNote,
    setTripShowLabel,
    clearTripShowLabel,
    respondToTripInvitation,
  };
}

export function useTripById(tripId: Id<"trips">) {
  return useQuery(api.trips.getTripById, { tripId });
}

export function useClosingSoonForTrip(tripId: Id<"trips">) {
  return useQuery(api.trips.getClosingSoonForTrip, { tripId });
}
