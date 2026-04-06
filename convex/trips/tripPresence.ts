import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { requireConvexUserId } from "../auth";

const PRESENCE_TTL_MS = 60_000;

const activeTabValidator = v.optional(
  v.union(
    v.literal("shows"),
    v.literal("schedule"),
    v.literal("party"),
    v.literal("chat")
  )
);

async function getTripOrThrow(ctx: QueryCtx, tripId: Id<"trips">): Promise<Doc<"trips">> {
  const trip = await ctx.db.get(tripId);
  if (!trip) throw new Error("Trip not found");
  return trip;
}

async function assertCanViewTrip(ctx: QueryCtx, userId: Id<"users">, tripId: Id<"trips">): Promise<Doc<"trips">> {
  const trip = await getTripOrThrow(ctx, tripId);
  if (trip.userId === userId) return trip;

  const membership = await ctx.db
    .query("tripMembers")
    .withIndex("by_trip_user", (q) =>
      q.eq("tripId", tripId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new Error("Not authorized to view this trip");
  }
  return trip;
}

export const clearTripPresence = mutation({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const existing = await ctx.db
      .query("tripPresence")
      .withIndex("by_trip_user", (q) =>
        q.eq("tripId", args.tripId).eq("userId", userId)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const heartbeatTripPresence = mutation({
  args: { tripId: v.id("trips"), activeTab: activeTabValidator },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await assertCanViewTrip(ctx, userId, args.tripId);

    const existing = await ctx.db
      .query("tripPresence")
      .withIndex("by_trip_user", (q) =>
        q.eq("tripId", args.tripId).eq("userId", userId)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeenAt: now, activeTab: args.activeTab });
      return existing._id;
    }

    return await ctx.db.insert("tripPresence", {
      tripId: args.tripId,
      userId,
      lastSeenAt: now,
      activeTab: args.activeTab,
    });
  },
});

export const getTripPresence = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    try {
      await assertCanViewTrip(ctx, userId, args.tripId);
    } catch {
      return [];
    }

    const now = Date.now();
    const rows = await ctx.db
      .query("tripPresence")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();

    const fresh = rows.filter((r) => now - r.lastSeenAt <= PRESENCE_TTL_MS);

    const result = await Promise.all(
      fresh.map(async (r) => {
        if (r.userId === userId) return null;
        const user = await ctx.db.get(r.userId);
        if (!user) return null;
        const avatarUrl = user.avatarImage
          ? await ctx.storage.getUrl(user.avatarImage)
          : null;
        return {
          userId: user._id,
          name: user.name,
          username: user.username,
          avatarUrl,
          activeTab: r.activeTab ?? "shows",
          lastSeenAt: r.lastSeenAt,
        };
      })
    );

    return result.filter((x): x is NonNullable<typeof x> => x !== null);
  },
});
