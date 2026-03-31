import { v } from "convex/values";
import { query } from "./_generated/server";
import { getConvexUserId } from "./auth";

const LEADERBOARD_LIMIT = 50;

async function enrichUser(ctx: any, userId: string) {
  const user = await ctx.db.get(userId);
  if (!user) return null;
  const avatarUrl = user.avatarImage
    ? await ctx.storage.getUrl(user.avatarImage)
    : null;
  return {
    _id: user._id,
    username: user.username,
    name: user.name,
    avatarUrl,
  };
}

export const getByShows = query({
  args: {
    scope: v.union(v.literal("all"), v.literal("friends")),
    showType: v.optional(
      v.union(
        v.literal("musical"),
        v.literal("play"),
        v.literal("opera"),
        v.literal("dance"),
        v.literal("other")
      )
    ),
  },
  handler: async (ctx, args) => {
    const viewerUserId = await getConvexUserId(ctx);
    let targetUserIds: string[] | null = null;

    if (args.scope === "friends" && viewerUserId) {
      const followRows = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q: any) => q.eq("followerUserId", viewerUserId))
        .collect();
      targetUserIds = [viewerUserId, ...followRows.map((r: any) => r.followingUserId)];
    }

    const allRankings = await ctx.db.query("userRankings").collect();
    const filtered = targetUserIds
      ? allRankings.filter((r: any) => targetUserIds!.includes(r.userId))
      : allRankings;

    const results: Array<{ userId: string; count: number }> = [];

    for (const ranking of filtered) {
      if (args.showType) {
        let typeCount = 0;
        for (const showId of ranking.showIds) {
          const show = await ctx.db.get(showId);
          if (show && show.type === args.showType) typeCount++;
        }
        results.push({ userId: ranking.userId, count: typeCount });
      } else {
        results.push({ userId: ranking.userId, count: ranking.showIds.length });
      }
    }

    results.sort((a, b) => b.count - a.count);
    const top = results.slice(0, LEADERBOARD_LIMIT);

    return Promise.all(
      top.map(async (entry, index) => {
        const user = await enrichUser(ctx, entry.userId);
        return user ? { rank: index + 1, user, count: entry.count } : null;
      })
    ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r !== null));
  },
});

export const getByVisits = query({
  args: {
    scope: v.union(v.literal("all"), v.literal("friends")),
    mode: v.optional(v.union(v.literal("total"), v.literal("per_show"))),
    showId: v.optional(v.id("shows")),
  },
  handler: async (ctx, args) => {
    const viewerUserId = await getConvexUserId(ctx);
    let targetUserIds: string[] | null = null;

    if (args.scope === "friends" && viewerUserId) {
      const followRows = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q: any) => q.eq("followerUserId", viewerUserId))
        .collect();
      targetUserIds = [viewerUserId, ...followRows.map((r: any) => r.followingUserId)];
    }

    const allVisits = await ctx.db.query("visits").collect();
    const filtered = targetUserIds
      ? allVisits.filter((v: any) => targetUserIds!.includes(v.userId))
      : allVisits;

    if (args.mode === "per_show" && args.showId) {
      const showVisits = filtered.filter((v: any) => v.showId === args.showId);
      const countByUser = new Map<string, number>();
      for (const visit of showVisits) {
        countByUser.set(visit.userId, (countByUser.get(visit.userId) ?? 0) + 1);
      }
      const sorted = Array.from(countByUser.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, LEADERBOARD_LIMIT);

      return Promise.all(
        sorted.map(async ([userId, count], index) => {
          const user = await enrichUser(ctx, userId);
          return user ? { rank: index + 1, user, count } : null;
        })
      ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r !== null));
    }

    const countByUser = new Map<string, number>();
    for (const visit of filtered) {
      countByUser.set(visit.userId, (countByUser.get(visit.userId) ?? 0) + 1);
    }
    const sorted = Array.from(countByUser.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, LEADERBOARD_LIMIT);

    return Promise.all(
      sorted.map(async ([userId, count], index) => {
        const user = await enrichUser(ctx, userId);
        return user ? { rank: index + 1, user, count } : null;
      })
    ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r !== null));
  },
});

export const getByTheatres = query({
  args: {
    scope: v.union(v.literal("all"), v.literal("friends")),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewerUserId = await getConvexUserId(ctx);
    let targetUserIds: string[] | null = null;

    if (args.scope === "friends" && viewerUserId) {
      const followRows = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q: any) => q.eq("followerUserId", viewerUserId))
        .collect();
      targetUserIds = [viewerUserId, ...followRows.map((r: any) => r.followingUserId)];
    }

    const allVisits = await ctx.db.query("visits").collect();
    let filtered = targetUserIds
      ? allVisits.filter((v: any) => targetUserIds!.includes(v.userId))
      : allVisits;

    if (args.city) {
      const cityLower = args.city.toLowerCase();
      filtered = filtered.filter(
        (v: any) => v.city && v.city.toLowerCase() === cityLower
      );
    }

    const theatresByUser = new Map<string, Set<string>>();
    for (const visit of filtered) {
      const theatre = visit.theatre?.trim();
      if (!theatre) continue;
      if (!theatresByUser.has(visit.userId)) {
        theatresByUser.set(visit.userId, new Set());
      }
      theatresByUser.get(visit.userId)!.add(theatre.toLowerCase());
    }

    const sorted = Array.from(theatresByUser.entries())
      .map(([userId, theatres]) => ({ userId, count: theatres.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, LEADERBOARD_LIMIT);

    return Promise.all(
      sorted.map(async (entry, index) => {
        const user = await enrichUser(ctx, entry.userId);
        return user ? { rank: index + 1, user, count: entry.count } : null;
      })
    ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r !== null));
  },
});
