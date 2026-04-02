import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireConvexUserId } from "../auth";

export const tripShowLabelValue = v.union(
  v.literal("must_see"),
  v.literal("want_see"),
  v.literal("indifferent"),
  v.literal("dont_know"),
  v.literal("dont_want")
);

const LABEL_ORDER = [
  "must_see",
  "want_see",
  "indifferent",
  "dont_know",
  "dont_want",
] as const;

async function getTripOrThrow(ctx: any, tripId: Id<"trips">) {
  const trip = await ctx.db.get(tripId);
  if (!trip) throw new Error("Trip not found");
  return trip;
}

async function assertCanViewTrip(ctx: any, userId: Id<"users">, tripId: Id<"trips">) {
  const trip = await getTripOrThrow(ctx, tripId);
  if (trip.userId === userId) return trip;

  const membership = await ctx.db
    .query("tripMembers")
    .withIndex("by_trip_user", (q: any) =>
      q.eq("tripId", tripId).eq("userId", userId)
    )
    .first();

  if (!membership || membership.status !== "accepted") {
    throw new Error("Not authorized to view this trip");
  }
  return trip;
}

/** Attach myLabel + labelSummary to each trip show row (same shape as getTripById). */
export async function enrichTripShowRowsWithLabels(
  ctx: any,
  tripId: Id<"trips">,
  viewerUserId: Id<"users">,
  rows: any[]
) {
  const labelRows = await ctx.db
    .query("tripShowLabels")
    .withIndex("by_trip", (q: any) => q.eq("tripId", tripId))
    .collect();

  const userIds = [...new Set(labelRows.map((l: any) => l.userId))] as Id<"users">[];
  const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
  const userById = new Map(
    users.filter(Boolean).map((u: any) => [u._id as Id<"users">, u])
  );

  const avatarUrlByUserId = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (id) => {
      const u = userById.get(id);
      if (!u) return;
      const url = u.avatarImage ? await ctx.storage.getUrl(u.avatarImage) : null;
      avatarUrlByUserId.set(String(id), url);
    })
  );

  const labelsByTripShowId = new Map<string, any[]>();
  for (const l of labelRows) {
    const key = String(l.tripShowId);
    const arr = labelsByTripShowId.get(key) ?? [];
    arr.push(l);
    labelsByTripShowId.set(key, arr);
  }

  return rows.map((row) => {
    const forShow = labelsByTripShowId.get(String(row._id)) ?? [];
    const myRow = forShow.find((l: any) => l.userId === viewerUserId);
    const grouped = new Map<
      string,
      { userId: Id<"users">; name: string | undefined; username: string; avatarUrl: string | null }[]
    >();

    for (const l of forShow) {
      const u = userById.get(l.userId);
      if (!u) continue;
      const list = grouped.get(l.label) ?? [];
      list.push({
        userId: u._id,
        name: u.name,
        username: u.username,
        avatarUrl: avatarUrlByUserId.get(String(u._id)) ?? null,
      });
      grouped.set(l.label, list);
    }

    const labelSummary = LABEL_ORDER.filter((key) => grouped.has(key)).map((label) => ({
      label,
      users: grouped.get(label)!,
    }));

    return {
      ...row,
      myLabel: myRow?.label ?? null,
      labelSummary,
    };
  });
}

export async function deleteTripShowLabelsForTripShow(
  ctx: any,
  tripId: Id<"trips">,
  tripShowId: Id<"tripShows">
) {
  const rows = await ctx.db
    .query("tripShowLabels")
    .withIndex("by_trip", (q: any) => q.eq("tripId", tripId))
    .collect();
  await Promise.all(
    rows
      .filter((r: any) => r.tripShowId === tripShowId)
      .map((r: any) => ctx.db.delete(r._id))
  );
}

export const setTripShowLabel = mutation({
  args: {
    tripId: v.id("trips"),
    tripShowId: v.id("tripShows"),
    label: tripShowLabelValue,
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await assertCanViewTrip(ctx, userId, args.tripId);

    const tripShow = await ctx.db.get(args.tripShowId);
    if (!tripShow || tripShow.tripId !== args.tripId) {
      throw new Error("Show is not on this trip");
    }

    const existing = await ctx.db
      .query("tripShowLabels")
      .withIndex("by_trip_show_user", (q: any) =>
        q.eq("tripId", args.tripId).eq("tripShowId", args.tripShowId).eq("userId", userId)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { label: args.label, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("tripShowLabels", {
      tripId: args.tripId,
      tripShowId: args.tripShowId,
      userId,
      label: args.label,
      updatedAt: now,
    });
  },
});

export const clearTripShowLabel = mutation({
  args: {
    tripId: v.id("trips"),
    tripShowId: v.id("tripShows"),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await assertCanViewTrip(ctx, userId, args.tripId);

    const existing = await ctx.db
      .query("tripShowLabels")
      .withIndex("by_trip_show_user", (q: any) =>
        q.eq("tripId", args.tripId).eq("tripShowId", args.tripShowId).eq("userId", userId)
      )
      .first();

    if (existing) await ctx.db.delete(existing._id);
  },
});
