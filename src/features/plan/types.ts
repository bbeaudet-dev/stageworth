import type { Id } from "@/convex/_generated/dataModel";
import type { TripShowLabel } from "@/features/plan/tripShowLabelMeta";

/** A show row on a trip, enriched with production info and label data. */
export interface TripShowItem {
  _id: Id<"tripShows">;
  tripId: Id<"trips">;
  userId: Id<"users">;
  showId: Id<"shows">;
  dayDate?: string | null;
  order?: number;
  createdAt: number;
  closingDate: string | null;
  isOpenRun: boolean | null;
  tripProductionStatus: string | null;
  previewDate: string | null;
  openingDate: string | null;
  show: {
    _id: Id<"shows">;
    name: string;
    images: (string | null)[];
  } | null;
  myLabel: TripShowLabel | null;
  labelSummary: {
    label: TripShowLabel;
    users: {
      userId: Id<"users">;
      name?: string | null;
      username: string;
      avatarUrl: string | null;
    }[];
  }[];
}

export interface TripDayNote {
  _id: Id<"tripDayNotes">;
  tripId: Id<"trips">;
  userId: Id<"users">;
  dayDate: string;
  text: string;
  time?: string;
  createdAt: number;
}

export interface TripDay {
  date: string;
  shows: TripShowItem[];
  notes: TripDayNote[];
}

export interface TripMemberUser {
  _id: Id<"users">;
  name?: string;
  username?: string;
  avatarUrl: string | null;
}

export interface TripMember {
  _id: Id<"tripMembers">;
  tripId: Id<"trips">;
  userId: Id<"users">;
  invitedBy: Id<"users">;
  role: "edit" | "view";
  status: "pending" | "accepted" | "declined";
  createdAt: number;
  user: TripMemberUser;
}

export interface TripOwner {
  _id: Id<"users">;
  name?: string;
  username?: string;
  avatarUrl: string | null;
}

/** Full trip detail as returned by `getTripById`. */
export interface TripDetail {
  _id: Id<"trips">;
  userId: Id<"users">;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
  isOwner: boolean;
  canEdit: boolean;
  myMembershipStatus: string | null;
  owner: TripOwner | null;
  unassigned: TripShowItem[];
  days: TripDay[];
  members: TripMember[];
}

/** A "closing soon" suggestion from `getClosingSoonForTrip`. */
export interface ClosingSoonItem {
  production: {
    _id: Id<"productions">;
    posterUrl?: string;
  };
  show: {
    _id: Id<"shows">;
    name: string;
    images: (string | null)[];
  };
  closingDate: string;
  windowEnd: string;
}

/** A trip summary row from `getMyTrips` (upcoming/past). */
export interface TripSummary {
  _id: Id<"trips">;
  name: string;
  startDate: string;
  endDate: string;
  showCount: number;
  isOwner: boolean;
}

/** A pending trip invitation from `getMyTrips`. */
export interface TripInvitation {
  _id: Id<"trips">;
  name: string;
  startDate: string;
  endDate: string;
  showCount: number;
  membershipId: Id<"tripMembers">;
  inviterName: string | null;
  inviterUsername: string;
}

export interface FollowingUser {
  _id: Id<"users">;
  username: string;
  name?: string;
  avatarUrl: string | null;
  followedAt: number;
}

export interface SearchUser {
  _id: Id<"users">;
  username: string;
  name?: string;
  avatarUrl: string | null;
  viewerFollows: boolean;
}
