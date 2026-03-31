import { v } from "convex/values";
import { query } from "./_generated/server";
import { getConvexUserId } from "./auth";

const TIER_SCORE_RANGES: Record<string, [number, number]> = {
  loved: [8.0, 10.0],
  liked: [6.0, 7.9],
  okay: [4.0, 5.9],
  disliked: [2.0, 3.9],
};

function deriveScore(
  tier: string,
  positionInTier: number,
  tierSize: number
): number {
  const range = TIER_SCORE_RANGES[tier];
  if (!range) return 0;
  const [min, max] = range;
  if (tierSize <= 1) return (min + max) / 2;
  const fraction = (tierSize - 1 - positionInTier) / (tierSize - 1);
  return Math.round((min + fraction * (max - min)) * 10) / 10;
}

export const getRecentActivity = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const viewerUserId = await getConvexUserId(ctx);
    const targetUserId = args.userId ?? viewerUserId;
    if (!targetUserId) return null;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().slice(0, 10);

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
      .collect();

    const recentVisits = visits.filter((v: any) => v.date >= cutoffDate);
    const recentShowIds = new Set(recentVisits.map((v: any) => v.showId));

    const showTypes = new Set<string>();
    for (const showId of recentShowIds) {
      const show = await ctx.db.get(showId);
      if (show) showTypes.add(show.type);
    }

    const allUsers = await ctx.db.query("users").collect();
    const allVisitCounts = await Promise.all(
      allUsers.map(async (user: any) => {
        const userVisits = await ctx.db
          .query("visits")
          .withIndex("by_user", (q: any) => q.eq("userId", user._id))
          .collect();
        return userVisits.filter((v: any) => v.date >= cutoffDate).length;
      })
    );

    const targetCount = recentVisits.length;
    const usersLessThan = allVisitCounts.filter((c: number) => c < targetCount).length;
    const percentile =
      allVisitCounts.length > 0
        ? Math.round((usersLessThan / allVisitCounts.length) * 100)
        : 0;

    const targetUser = await ctx.db.get(targetUserId);
    const locationLabel = targetUser?.location ?? null;

    return {
      visitCount: recentVisits.length,
      showCount: recentShowIds.size,
      typeCount: showTypes.size,
      percentile,
      locationLabel,
    };
  },
});

export const getAggregatedStats = query({
  args: {
    userId: v.optional(v.id("users")),
    category: v.union(v.literal("type"), v.literal("city"), v.literal("district")),
    sortBy: v.union(v.literal("count"), v.literal("score")),
  },
  handler: async (ctx, args) => {
    const viewerUserId = await getConvexUserId(ctx);
    const targetUserId = args.userId ?? viewerUserId;
    if (!targetUserId) return [];

    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
      .first();

    const userShows = await ctx.db
      .query("userShows")
      .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
      .collect();

    const tierByShowId = new Map(
      userShows.map((us: any) => [us.showId, us.tier])
    );

    const tierPositions = new Map<string, Map<string, number>>();
    const tierSizes = new Map<string, number>();

    if (rankings) {
      const showsByTier = new Map<string, string[]>();
      for (const showId of rankings.showIds) {
        const tier = tierByShowId.get(showId) ?? "unranked";
        if (tier === "unranked") continue;
        if (!showsByTier.has(tier)) showsByTier.set(tier, []);
        showsByTier.get(tier)!.push(showId);
      }
      for (const [tier, showIds] of showsByTier) {
        tierSizes.set(tier, showIds.length);
        const positions = new Map<string, number>();
        showIds.forEach((id, idx) => positions.set(id, idx));
        tierPositions.set(tier, positions);
      }
    }

    function getShowScore(showId: string): number | null {
      const tier = tierByShowId.get(showId);
      if (!tier || tier === "unranked") return null;
      const positions = tierPositions.get(tier);
      if (!positions) return null;
      const pos = positions.get(showId) ?? 0;
      const size = tierSizes.get(tier) ?? 1;
      return deriveScore(tier, pos, size);
    }

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
      .collect();

    const grouped = new Map<
      string,
      { count: number; scores: number[] }
    >();

    for (const visit of visits) {
      let groupKey: string | undefined;

      if (args.category === "type") {
        const show = await ctx.db.get(visit.showId);
        groupKey = show?.type;
      } else if (args.category === "city") {
        groupKey = visit.city ?? undefined;
      } else {
        groupKey = visit.district ?? undefined;
      }

      if (!groupKey) continue;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, { count: 0, scores: [] });
      }
      const group = grouped.get(groupKey)!;
      group.count += 1;

      const score = getShowScore(visit.showId);
      if (score !== null) {
        group.scores.push(score);
      }
    }

    const results = Array.from(grouped.entries()).map(([key, data]) => {
      const avgScore =
        data.scores.length > 0
          ? Math.round(
              (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) *
                10
            ) / 10
          : null;
      return { category: key, count: data.count, averageScore: avgScore };
    });

    if (args.sortBy === "score") {
      results.sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0));
    } else {
      results.sort((a, b) => b.count - a.count);
    }

    return results;
  },
});
