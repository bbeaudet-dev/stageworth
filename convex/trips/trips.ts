import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { isCatalogPublished } from "../catalogVisibility";
import { requireConvexUserId } from "../auth";
import type { ProductionStatus } from "../../src/utils/productions";
import { getProductionStatus } from "../../src/utils/productions";
import { resolveShowImageUrls } from "../helpers";
import {
  deleteTripShowLabelsForTripShow,
  enrichTripShowRowsWithLabels,
} from "./tripLabels";

const MAX_TRIP_NAME_LENGTH = 100;
const MAX_TRIP_DESCRIPTION_LENGTH = 500;


// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getTripOrThrow(ctx: any, tripId: any) {
  const trip = await ctx.db.get(tripId);
  if (!trip) throw new Error("Trip not found");
  return trip;
}

async function getTripOrNull(ctx: any, tripId: any) {
  return await ctx.db.get(tripId) ?? null;
}

async function assertCanEditTrip(ctx: any, userId: any, tripId: any) {
  const trip = await getTripOrThrow(ctx, tripId);
  if (trip.userId === userId) return trip;

  const membership = await ctx.db
    .query("tripMembers")
    .withIndex("by_trip_user", (q: any) =>
      q.eq("tripId", tripId).eq("userId", userId)
    )
    .first();

  if (!membership || membership.status !== "accepted" || membership.role !== "edit") {
    throw new Error("Not authorized to edit this trip");
  }
  return trip;
}

async function assertCanViewTrip(ctx: any, userId: any, tripId: any) {
  const trip = await getTripOrThrow(ctx, tripId);
  if (trip.userId === userId) return trip;

  const membership = await ctx.db
    .query("tripMembers")
    .withIndex("by_trip_user", (q: any) =>
      q.eq("tripId", tripId).eq("userId", userId)
    )
    .first();

  // Allow any membership status (pending / accepted / declined) to view
  if (!membership) {
    throw new Error("Not authorized to view this trip");
  }
  return trip;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

async function getInterestListShowIdSet(ctx: any, userId: Id<"users">): Promise<Set<string>> {
  const allUserLists = await ctx.db
    .query("userLists")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  const relevantLists = allUserLists.filter(
    (l: any) =>
      l.systemKey === "want_to_see" ||
      l.systemKey === "look_into" ||
      l.systemKey === "uncategorized"
  );
  return new Set<string>(relevantLists.flatMap((l: any) => l.showIds));
}


// Enumerate every date between startDate and endDate inclusive (YYYY-MM-DD).
function enumerateDays(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  const current = new Date(start);
  while (current <= end) {
    days.push(current.toISOString().split("T")[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

const TRIP_PRODUCTION_PRIORITY: Record<ProductionStatus, number> = {
  open_run: 0,
  open: 1,
  in_previews: 2,
  announced: 3,
  closed: 99,
};

/**
 * Pick one “current” production for trip UI (closing label, open run, etc.).
 * Uses all runs for the show (not catalog visibility) so trips reflect admin data
 * even when a run is still `needs_review`. Never falls back to a closed run.
 */
function pickTripProductionDisplay(
  productions: Array<{
    previewDate?: string;
    openingDate?: string;
    closingDate?: string;
    isOpenRun?: boolean | null;
  }>,
  today: string
): {
  closingDate: string | null;
  isOpenRun: boolean | null;
  tripProductionStatus: ProductionStatus | null;
} {
  if (productions.length === 0) {
    return { closingDate: null, isOpenRun: null, tripProductionStatus: null };
  }
  const active = productions.filter((p) => getProductionStatus(p, today) !== "closed");
  if (active.length === 0) {
    return { closingDate: null, isOpenRun: null, tripProductionStatus: null };
  }
  const sorted = [...active].sort((a, b) => {
    const sta = getProductionStatus(a, today);
    const stb = getProductionStatus(b, today);
    const pa = TRIP_PRODUCTION_PRIORITY[sta];
    const pb = TRIP_PRODUCTION_PRIORITY[stb];
    if (pa !== pb) return pa - pb;
    return (b.openingDate ?? "").localeCompare(a.openingDate ?? "");
  });
  const best = sorted[0];
  const tripProductionStatus = getProductionStatus(best, today);
  return {
    closingDate: best.closingDate ?? null,
    isOpenRun: best.isOpenRun ?? null,
    tripProductionStatus,
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getMyTrips = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);

    const ownedTrips = await ctx.db
      .query("trips")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const memberships = await ctx.db
      .query("tripMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const acceptedMemberTripIds = memberships
      .filter((m: any) => m.status === "accepted")
      .map((m: any) => m.tripId);

    const pendingMemberships = memberships.filter(
      (m: any) => m.status === "pending"
    );

    const memberTrips = (await Promise.all(
      acceptedMemberTripIds.map((id: any) => ctx.db.get(id))
    )) as any[];

    const allTrips: any[] = [
      ...ownedTrips,
      ...memberTrips.filter(
        (t: any) => t !== null && !ownedTrips.some((o: any) => o._id === t._id)
      ),
    ].sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));

    const t = todayStr();
    const upcoming = allTrips.filter((trip: any) => trip.endDate >= t);
    const past = allTrips.filter((trip: any) => trip.endDate < t);

    async function withShowCount(trip: any) {
      const tripShows = await ctx.db
        .query("tripShows")
        .withIndex("by_trip", (q: any) => q.eq("tripId", trip._id))
        .collect();
      const isOwner = trip.userId === userId;
      return { ...trip, showCount: tripShows.length, isOwner };
    }

    // Pending invitations: trips where this user has a "pending" membership
    const pendingInvitations = await Promise.all(
      pendingMemberships.map(async (m: any) => {
        const trip = (await ctx.db.get(m.tripId)) as any;
        if (!trip) return null;
        const tripShows = await ctx.db
          .query("tripShows")
          .withIndex("by_trip", (q: any) => q.eq("tripId", trip._id))
          .collect();
        const inviter = (await ctx.db.get(m.invitedBy)) as any;
        return {
          _id: trip._id as Id<"trips">,
          name: trip.name as string,
          startDate: trip.startDate as string,
          endDate: trip.endDate as string,
          showCount: tripShows.length,
          membershipId: m._id,
          inviterName: (inviter?.name ?? null) as string | null,
          inviterUsername: (inviter?.username ?? "someone") as string,
        };
      })
    );

    return {
      upcoming: await Promise.all(upcoming.map(withShowCount)),
      past: await Promise.all(past.map(withShowCount)),
      pendingInvitations: pendingInvitations.filter(
        (x): x is NonNullable<typeof x> => x !== null
      ),
    };
  },
});

export const getTripById = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const raw = await getTripOrNull(ctx, args.tripId);
    if (!raw) return null;
    // Verify viewer has access (owner or accepted member)
    try { await assertCanViewTrip(ctx, userId, args.tripId); } catch { return null; }
    const trip = raw;

    const tripShowRows = await ctx.db
      .query("tripShows")
      .withIndex("by_trip", (q: any) => q.eq("tripId", args.tripId))
      .collect();

    const today = todayStr();
    const resolvedShows = await Promise.all(
      tripShowRows.map(async (row: any) => {
        const show = (await ctx.db.get(row.showId)) as any;
        if (!show) return null;
        // Find the most relevant open/upcoming production to surface closingDate
        const productions = await ctx.db
          .query("productions")
          .withIndex("by_show", (q: any) => q.eq("showId", row.showId))
          .collect();
        const pick = pickTripProductionDisplay(productions, today);
        return {
          ...row,
          closingDate: pick.closingDate,
          isOpenRun: pick.isOpenRun,
          tripProductionStatus: pick.tripProductionStatus,
          show: {
            ...show,
            images: await resolveShowImageUrls(ctx, show),
          },
        };
      })
    );

    const validShows = resolvedShows.filter(
      (s): s is NonNullable<typeof s> => s !== null
    );

    const validShowsWithLabels = await enrichTripShowRowsWithLabels(
      ctx,
      args.tripId,
      userId,
      validShows
    );

    const unassigned = validShowsWithLabels
      .filter((s) => s.dayDate == null)
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

    const noteRows = await ctx.db
      .query("tripDayNotes")
      .withIndex("by_trip", (q: any) => q.eq("tripId", args.tripId))
      .collect();

    const days = enumerateDays(trip.startDate, trip.endDate).map((date) => {
      const assigned = validShowsWithLabels
        .filter((s) => s.dayDate === date)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const notes = noteRows
        .filter((n: any) => n.dayDate === date)
        .sort((a: any, b: any) => {
          if (a.time && b.time) return a.time.localeCompare(b.time);
          if (a.time) return -1;
          if (b.time) return 1;
          return a.createdAt - b.createdAt;
        });
      return { date, shows: assigned, notes };
    });

    const members = await ctx.db
      .query("tripMembers")
      .withIndex("by_trip", (q: any) => q.eq("tripId", args.tripId))
      .collect();

    const membersWithUsers = await Promise.all(
      members.map(async (m: any) => {
        const user = (await ctx.db.get(m.userId)) as any;
        if (!user) return null;
        const avatarUrl = user.avatarImage
          ? await ctx.storage.getUrl(user.avatarImage)
          : null;
        return { ...m, user: { ...user, avatarUrl } };
      })
    );

    const ownerUser = (await ctx.db.get(trip.userId)) as any;
    const ownerAvatarUrl =
      ownerUser?.avatarImage
        ? await ctx.storage.getUrl(ownerUser.avatarImage)
        : null;

    const memberMe = members.find((m: any) => m.userId === userId);
    const canEdit =
      trip.userId === userId ||
      (memberMe?.status === "accepted" && memberMe?.role === "edit");

    return {
      ...trip,
      isOwner: trip.userId === userId,
      canEdit,
      myMembershipStatus: trip.userId === userId ? null : (memberMe?.status ?? null),
      owner: ownerUser ? { ...ownerUser, avatarUrl: ownerAvatarUrl } : null,
      unassigned,
      days,
      members: membersWithUsers.filter(
        (m): m is NonNullable<typeof m> => m !== null
      ),
    };
  },
});

/**
 * Suggestions while viewing a trip: productions whose closing date is between
 * **today** and a **trip-specific window end** — whichever is earlier of (a) the
 * start date of your next trip, if the next trip begins within 30 days of this
 * trip’s end, or (b) this trip’s end date + 30 days (or +30d after end if there
 * is no overlapping “next trip” in that sense).
 *
 * Only includes shows that appear in **Want to See**, **Look Into**, or
 * **Uncategorized**, and excludes shows already on this trip’s list.
 *
 * (Separate from create-time auto-fill, which uses a fixed ~90-day horizon from
 * “today” when the trip is created — see `createTrip`.)
 */
export const getClosingSoonForTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const raw = await getTripOrNull(ctx, args.tripId);
    if (!raw) return [];
    try { await assertCanViewTrip(ctx, userId, args.tripId); } catch { return []; }

    const t = todayStr();
    const windowEnd = addDaysToDateStr(t, 60);

    // Collect shows already on this trip
    const existingTripShows = await ctx.db
      .query("tripShows")
      .withIndex("by_trip", (q: any) => q.eq("tripId", args.tripId))
      .collect();
    const alreadyOnTripShowIds = new Set(existingTripShows.map((s: any) => s.showId));

    const listShowIds = await getInterestListShowIdSet(ctx, userId);

    // Find productions closing within the window
    const allProductions = await ctx.db.query("productions").collect();
    const closingSoon = allProductions.filter(
      (p) =>
        isCatalogPublished(p.dataStatus) &&
        p.closingDate !== undefined &&
        p.closingDate >= t &&
        p.closingDate <= windowEnd
    );

    // Filter to productions whose show is in a relevant list and not already on trip
    const results = await Promise.all(
      closingSoon.map(async (production) => {
        const showId = production.showId;
        if (!listShowIds.has(showId)) return null;
        if (alreadyOnTripShowIds.has(showId)) return null;

        const show = await ctx.db.get(showId);
        if (!show || !isCatalogPublished(show.dataStatus)) return null;

        return {
          production,
          show: {
            ...show,
            images: await resolveShowImageUrls(ctx, show),
          },
          closingDate: production.closingDate!,
          windowEnd,
        };
      })
    );

    return results
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.closingDate.localeCompare(b.closingDate));
  },
});

// ─── Trip CRUD ────────────────────────────────────────────────────────────────

export const createTrip = mutation({
  args: {
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const name = args.name.trim();
    if (!name) throw new Error("Trip name is required");
    if (name.length > MAX_TRIP_NAME_LENGTH) throw new Error("Trip name is too long");
    if (args.startDate > args.endDate) throw new Error("Start date must be before end date");

    const description = args.description?.trim();
    if (description && description.length > MAX_TRIP_DESCRIPTION_LENGTH) {
      throw new Error("Description is too long");
    }

    const now = Date.now();
    const tripId = await ctx.db.insert("trips", {
      userId,
      name,
      startDate: args.startDate,
      endDate: args.endDate,
      description: description || undefined,
      isPublic: args.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return tripId;
  },
});

export const updateTrip = mutation({
  args: {
    tripId: v.id("trips"),
    name: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const trip = await assertCanEditTrip(ctx, userId, args.tripId);

    const patch: Record<string, any> = { updatedAt: Date.now() };

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Trip name is required");
      if (name.length > MAX_TRIP_NAME_LENGTH) throw new Error("Trip name is too long");
      patch.name = name;
    }

    const startDate = args.startDate ?? trip.startDate;
    const endDate = args.endDate ?? trip.endDate;
    if (startDate > endDate) throw new Error("Start date must be before end date");
    if (args.startDate !== undefined) patch.startDate = args.startDate;
    if (args.endDate !== undefined) patch.endDate = args.endDate;

    if (args.description !== undefined) {
      const description = args.description.trim();
      if (description.length > MAX_TRIP_DESCRIPTION_LENGTH) {
        throw new Error("Description is too long");
      }
      patch.description = description || undefined;
    }

    if (args.isPublic !== undefined) patch.isPublic = args.isPublic;

    await ctx.db.patch(args.tripId, patch);
  },
});

export const deleteTrip = mutation({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const trip = await getTripOrThrow(ctx, args.tripId);
    if (trip.userId !== userId) throw new Error("Only the trip owner can delete a trip");

    const labelRows = await ctx.db
      .query("tripShowLabels")
      .withIndex("by_trip", (q: any) => q.eq("tripId", args.tripId))
      .collect();
    await Promise.all(labelRows.map((r: any) => ctx.db.delete(r._id)));

    const presenceRows = await ctx.db
      .query("tripPresence")
      .withIndex("by_trip", (q: any) => q.eq("tripId", args.tripId))
      .collect();
    await Promise.all(presenceRows.map((r: any) => ctx.db.delete(r._id)));

    // Cascade delete tripShows and tripMembers
    const tripShows = await ctx.db
      .query("tripShows")
      .withIndex("by_trip", (q: any) => q.eq("tripId", args.tripId))
      .collect();
    await Promise.all(tripShows.map((s: any) => ctx.db.delete(s._id)));

    const members = await ctx.db
      .query("tripMembers")
      .withIndex("by_trip", (q: any) => q.eq("tripId", args.tripId))
      .collect();
    await Promise.all(members.map((m: any) => ctx.db.delete(m._id)));

    await ctx.db.delete(args.tripId);
  },
});

// ─── Trip Shows ───────────────────────────────────────────────────────────────

export const addShowToTrip = mutation({
  args: {
    tripId: v.id("trips"),
    showId: v.id("shows"),
    dayDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await assertCanEditTrip(ctx, userId, args.tripId);

    const existing = await ctx.db
      .query("tripShows")
      .withIndex("by_trip_show", (q: any) =>
        q.eq("tripId", args.tripId).eq("showId", args.showId)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("tripShows", {
      tripId: args.tripId,
      userId,
      showId: args.showId,
      dayDate: args.dayDate,
      createdAt: Date.now(),
    });
  },
});

export const removeShowFromTrip = mutation({
  args: {
    tripId: v.id("trips"),
    showId: v.id("shows"),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await assertCanEditTrip(ctx, userId, args.tripId);

    const row = await ctx.db
      .query("tripShows")
      .withIndex("by_trip_show", (q: any) =>
        q.eq("tripId", args.tripId).eq("showId", args.showId)
      )
      .first();

    if (row) {
      await deleteTripShowLabelsForTripShow(ctx, args.tripId, row._id);
      await ctx.db.delete(row._id);
    }
  },
});

export const assignShowToDay = mutation({
  args: {
    tripId: v.id("trips"),
    showId: v.id("shows"),
    dayDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await assertCanEditTrip(ctx, userId, args.tripId);

    const row = await ctx.db
      .query("tripShows")
      .withIndex("by_trip_show", (q: any) =>
        q.eq("tripId", args.tripId).eq("showId", args.showId)
      )
      .first();

    if (!row) throw new Error("Show is not on this trip");
    await ctx.db.patch(row._id, { dayDate: args.dayDate });
  },
});

export const reorderTripDay = mutation({
  args: {
    tripId: v.id("trips"),
    dayDate: v.optional(v.string()),
    showIds: v.array(v.id("shows")),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await assertCanEditTrip(ctx, userId, args.tripId);

    await Promise.all(
      args.showIds.map(async (showId, index) => {
        const row = await ctx.db
          .query("tripShows")
          .withIndex("by_trip_show", (q: any) =>
            q.eq("tripId", args.tripId).eq("showId", showId)
          )
          .first();
        if (row) await ctx.db.patch(row._id, { order: index });
      })
    );
  },
});

// ─── Trip Members ─────────────────────────────────────────────────────────────

export const addTripMember = mutation({
  args: {
    tripId: v.id("trips"),
    userId: v.optional(v.id("users")),
    username: v.optional(v.string()),
    role: v.union(v.literal("view"), v.literal("edit")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await requireConvexUserId(ctx);
    await assertCanEditTrip(ctx, currentUserId, args.tripId);

    let targetUser: any;
    if (args.userId) {
      targetUser = await ctx.db.get(args.userId);
    } else if (args.username) {
      targetUser = await ctx.db
        .query("users")
        .withIndex("by_username", (q: any) => q.eq("username", args.username))
        .first();
    }

    if (!targetUser) throw new Error("User not found");
    if (targetUser._id === currentUserId) throw new Error("You cannot add yourself as a member");

    const userId = currentUserId;

    const existing = await ctx.db
      .query("tripMembers")
      .withIndex("by_trip_user", (q: any) =>
        q.eq("tripId", args.tripId).eq("userId", targetUser._id)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role, status: "pending", invitedBy: userId });
    } else {
      await ctx.db.insert("tripMembers", {
        tripId: args.tripId,
        userId: targetUser._id,
        invitedBy: userId,
        role: args.role,
        status: "pending",
        createdAt: Date.now(),
      });
    }

    // Send a notification to the invited user
    const trip = await getTripOrThrow(ctx, args.tripId);
    await ctx.db.insert("notifications", {
      recipientUserId: targetUser._id,
      actorKind: "user",
      actorUserId: userId as Id<"users">,
      type: "trip_invite",
      tripId: args.tripId,
      isRead: false,
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      recipientUserId: targetUser._id,
      title: "Trip invitation",
      body: `You've been invited to join "${trip.name}"`,
      data: { type: "trip_invite", tripId: args.tripId },
    });

    return existing?._id ?? null;
  },
});

export const updateTripMemberRole = mutation({
  args: {
    tripId: v.id("trips"),
    memberId: v.id("tripMembers"),
    role: v.union(v.literal("view"), v.literal("edit")),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await assertCanEditTrip(ctx, userId, args.tripId);
    const member = await ctx.db.get(args.memberId);
    if (!member || member.tripId !== args.tripId) throw new Error("Member not found");
    await ctx.db.patch(args.memberId, { role: args.role });
  },
});

export const removeTripMember = mutation({
  args: {
    tripId: v.id("trips"),
    memberId: v.id("tripMembers"),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const member = await ctx.db.get(args.memberId);
    if (!member || member.tripId !== args.tripId) throw new Error("Member not found");

    // Owner can remove anyone; members can remove themselves
    const trip = await getTripOrThrow(ctx, args.tripId);
    if (trip.userId !== userId && member.userId !== userId) {
      throw new Error("Not authorized");
    }
    await ctx.db.delete(args.memberId);
  },
});

export const respondToTripInvitation = mutation({
  args: {
    tripId: v.id("trips"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const membership = await ctx.db
      .query("tripMembers")
      .withIndex("by_trip_user", (q: any) =>
        q.eq("tripId", args.tripId).eq("userId", userId)
      )
      .first();

    if (!membership) throw new Error("No invitation found");
    if (membership.status !== "pending") throw new Error("Invitation already responded to");

    const newStatus = args.accept ? "accepted" : "declined";
    await ctx.db.patch(membership._id, { status: newStatus });

    // Notify the trip organizer
    const trip = await getTripOrThrow(ctx, args.tripId);
    const responder = await ctx.db.get(userId as Id<"users">);
    const responderName = responder?.name ?? responder?.username ?? "Someone";

    await ctx.db.insert("notifications", {
      recipientUserId: trip.userId,
      actorKind: "user",
      actorUserId: userId as Id<"users">,
      type: args.accept ? "trip_invite_accepted" : "trip_invite_declined",
      tripId: args.tripId,
      isRead: false,
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      recipientUserId: trip.userId,
      title: args.accept ? "Invitation accepted" : "Invitation declined",
      body: args.accept
        ? `${responderName} joined "${trip.name}"`
        : `${responderName} declined to join "${trip.name}"`,
      data: { type: args.accept ? "trip_invite_accepted" : "trip_invite_declined", tripId: args.tripId },
    });
  },
});

// ─── Trip Day Notes ───────────────────────────────────────────────────────────

export const addTripDayNote = mutation({
  args: {
    tripId: v.id("trips"),
    dayDate: v.string(),
    text: v.string(),
    time: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await assertCanEditTrip(ctx, userId, args.tripId);
    const text = args.text.trim();
    if (!text) throw new Error("Note text is required");
    return ctx.db.insert("tripDayNotes", {
      tripId: args.tripId,
      userId,
      dayDate: args.dayDate,
      text,
      time: args.time,
      createdAt: Date.now(),
    });
  },
});

export const removeTripDayNote = mutation({
  args: { noteId: v.id("tripDayNotes") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");
    await assertCanEditTrip(ctx, userId, note.tripId);
    await ctx.db.delete(args.noteId);
  },
});
