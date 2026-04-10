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

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function lastDayOfFebruary(y: number): string {
  return isLeapYear(y) ? `${y}-02-29` : `${y}-02-28`;
}

/**
 * Meteorological seasons (Northern Hemisphere). Winter is Dec–Feb and labeled
 * by the calendar year of Jan/Feb (e.g. Dec 2025–Feb 2026 is "Winter 2026").
 */
function seasonWindowForDate(yyyyMmDd: string): {
  start: string;
  end: string;
  label: string;
} {
  const [ys, ms] = yyyyMmDd.split("-");
  const y = parseInt(ys, 10);
  const m = parseInt(ms, 10);

  if (m >= 3 && m <= 5) {
    return { start: `${y}-03-01`, end: `${y}-05-31`, label: `Spring ${y}` };
  }
  if (m >= 6 && m <= 8) {
    return { start: `${y}-06-01`, end: `${y}-08-31`, label: `Summer ${y}` };
  }
  if (m >= 9 && m <= 11) {
    return { start: `${y}-09-01`, end: `${y}-11-30`, label: `Fall ${y}` };
  }
  if (m === 12) {
    return {
      start: `${y}-12-01`,
      end: lastDayOfFebruary(y + 1),
      label: `Winter ${y + 1}`,
    };
  }
  return {
    start: `${y - 1}-12-01`,
    end: lastDayOfFebruary(y),
    label: `Winter ${y}`,
  };
}

export const getRecentActivity = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const viewerUserId = await getConvexUserId(ctx);
    const targetUserId = args.userId ?? viewerUserId;
    if (!targetUserId) return null;

    const today = new Date().toISOString().slice(0, 10);
    const { start, end, label: seasonLabel } = seasonWindowForDate(today);

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
      .collect();

    const seasonVisits = visits.filter(
      (v: any) => v.date >= start && v.date <= end
    );
    const seasonShowIds = new Set(seasonVisits.map((v: any) => v.showId));

    const allUsers = await ctx.db.query("users").collect();
    const allVisitCounts = await Promise.all(
      allUsers.map(async (user: any) => {
        const userVisits = await ctx.db
          .query("visits")
          .withIndex("by_user", (q: any) => q.eq("userId", user._id))
          .collect();
        return userVisits.filter(
          (v: any) => v.date >= start && v.date <= end
        ).length;
      })
    );

    const targetCount = seasonVisits.length;
    const usersLessThan = allVisitCounts.filter((c: number) => c < targetCount).length;
    const percentile =
      allVisitCounts.length > 0
        ? Math.round((usersLessThan / allVisitCounts.length) * 100)
        : 0;

    return {
      visitCount: seasonVisits.length,
      showCount: seasonShowIds.size,
      percentile,
      seasonLabel,
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
