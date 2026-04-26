import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireConvexUserId } from "./auth";

const TIER_ORDER = ["loved", "liked", "okay", "disliked", "unranked"] as const;
type Tier = (typeof TIER_ORDER)[number];

export type RankingSnapshotSource =
  | "my_shows_save"
  | "add_visit"
  | "accept_visit"
  | "direct_ranking"
  | "migration";

type RankingSnapshotChangeSummary = {
  addedShowIds?: Id<"shows">[];
  removedShowIds?: Id<"shows">[];
  reorderedShowIds?: Id<"shows">[];
  addedCount?: number;
  removedCount?: number;
  reorderedCount?: number;
  removedVisitCount?: number;
};

function normalizeChangeSummary(summary?: RankingSnapshotChangeSummary) {
  const addedShowIds = summary?.addedShowIds ?? [];
  const removedShowIds = summary?.removedShowIds ?? [];
  const reorderedShowIds = summary?.reorderedShowIds ?? [];

  return {
    addedShowIds,
    removedShowIds,
    reorderedShowIds,
    addedCount: summary?.addedCount ?? addedShowIds.length,
    removedCount: summary?.removedCount ?? removedShowIds.length,
    reorderedCount: summary?.reorderedCount ?? reorderedShowIds.length,
    removedVisitCount: summary?.removedVisitCount ?? 0,
  };
}

export async function createRankingSnapshot(
  ctx: MutationCtx,
  {
    userId,
    source,
    changeSummary,
    capturedAt = Date.now(),
  }: {
    userId: Id<"users">;
    source: RankingSnapshotSource;
    changeSummary?: RankingSnapshotChangeSummary;
    capturedAt?: number;
  }
) {
  const rankings = await ctx.db
    .query("userRankings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!rankings) return null;

  const userShows = await ctx.db
    .query("userShows")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const snapshotId = await ctx.db.insert("userRankingSnapshots", {
    userId,
    capturedAt,
    source,
    showIds: rankings.showIds,
    tiers: userShows.map((userShow) => ({
      showId: userShow.showId,
      tier: userShow.tier as Tier,
    })),
    wouldSeeAgainLineIndex: rankings.wouldSeeAgainLineIndex,
    stayedHomeLineIndex: rankings.stayedHomeLineIndex,
    totalRanked: rankings.showIds.length,
    totalShows: userShows.length,
    changeSummary: normalizeChangeSummary(changeSummary),
  });

  return snapshotId;
}

async function getCurrentUserSnapshots(ctx: QueryCtx, limit: number) {
  const userId = await requireConvexUserId(ctx);
  return await ctx.db
    .query("userRankingSnapshots")
    .withIndex("by_user_capturedAt", (q) => q.eq("userId", userId))
    .order("desc")
    .take(limit);
}

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 30, 100));
    const snapshots = await getCurrentUserSnapshots(ctx, limit);
    return snapshots.map((snapshot) => ({
      _id: snapshot._id,
      capturedAt: snapshot.capturedAt,
      source: snapshot.source,
      totalRanked: snapshot.totalRanked,
      totalShows: snapshot.totalShows,
      changeSummary: snapshot.changeSummary,
    }));
  },
});

export const get = query({
  args: {
    snapshotId: v.id("userRankingSnapshots"),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const snapshot = await ctx.db.get(args.snapshotId);
    if (!snapshot || snapshot.userId !== userId) return null;
    return snapshot;
  },
});

export const getAt = query({
  args: {
    capturedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    return await ctx.db
      .query("userRankingSnapshots")
      .withIndex("by_user_capturedAt", (q) =>
        q.eq("userId", userId).lte("capturedAt", args.capturedAt)
      )
      .order("desc")
      .first();
  },
});

export const getShowHistory = query({
  args: {
    showId: v.id("shows"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 200, 500));
    const snapshots = await ctx.db
      .query("userRankingSnapshots")
      .withIndex("by_user_capturedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return snapshots
      .reverse()
      .map((snapshot) => {
        const rankIndex = snapshot.showIds.findIndex((showId) => showId === args.showId);
        const tier = snapshot.tiers.find((entry) => entry.showId === args.showId)?.tier ?? null;
        return {
          snapshotId: snapshot._id,
          capturedAt: snapshot.capturedAt,
          source: snapshot.source,
          rank: rankIndex === -1 ? null : rankIndex + 1,
          rankPercentile:
            rankIndex === -1 || snapshot.totalRanked === 0
              ? null
              : (rankIndex + 1) / snapshot.totalRanked,
          totalRanked: snapshot.totalRanked,
          tier,
          wasAdded: snapshot.changeSummary.addedShowIds.includes(args.showId),
          wasRemoved: snapshot.changeSummary.removedShowIds.includes(args.showId),
          wasReordered: snapshot.changeSummary.reorderedShowIds.includes(args.showId),
        };
      })
      .filter((point) => point.rank !== null || point.tier !== null || point.wasRemoved);
  },
});
