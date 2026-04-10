import { v } from "convex/values";
import { query } from "./_generated/server";
import { getConvexUserId } from "./auth";
import type { Id } from "./_generated/dataModel";
import { resolveShowImageUrls } from "./helpers";

async function getFriendIds(ctx: any, viewerUserId: string | null): Promise<string[] | null> {
  if (!viewerUserId) return null;
  const followRows = await ctx.db
    .query("follows")
    .withIndex("by_follower", (q: any) => q.eq("followerUserId", viewerUserId))
    .collect();
  return [viewerUserId, ...followRows.map((r: any) => r.followingUserId)];
}

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
    mode: v.optional(v.union(v.literal("total"), v.literal("per_show"), v.literal("single_show"))),
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

    // Per-show leaderboard: rank users by visits to a specific show
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
          return user ? { rank: index + 1, user, count, showId: null, showImages: null } : null;
        })
      ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r !== null));
    }

    // Single-show leaderboard: rank users by their best single-show visit count
    if (args.mode === "single_show") {
      // Build a map of (userId -> Map<showId -> count>)
      const countByUserShow = new Map<string, Map<string, number>>();
      for (const visit of filtered) {
        if (!countByUserShow.has(visit.userId)) {
          countByUserShow.set(visit.userId, new Map());
        }
        const showMap = countByUserShow.get(visit.userId)!;
        showMap.set(visit.showId, (showMap.get(visit.showId) ?? 0) + 1);
      }

      // For each user, find their best show
      const bestByUser: Array<{ userId: string; count: number; showId: Id<"shows"> }> = [];
      for (const [userId, showMap] of countByUserShow.entries()) {
        let bestShowId: Id<"shows"> | "" = "";
        let bestCount = 0;
        for (const [showId, count] of showMap.entries()) {
          if (count > bestCount) {
            bestCount = count;
            bestShowId = showId as Id<"shows">;
          }
        }
        if (bestCount > 0 && bestShowId !== "") {
          bestByUser.push({ userId, count: bestCount, showId: bestShowId });
        }
      }

      bestByUser.sort((a, b) => b.count - a.count);
      const top = bestByUser.slice(0, LEADERBOARD_LIMIT);

      return Promise.all(
        top.map(async (entry, index) => {
          const user = await enrichUser(ctx, entry.userId);
          if (!user) return null;
          const show = await ctx.db.get(entry.showId);
          const showImages = show ? await resolveShowImageUrls(ctx, show) : null;
          return {
            rank: index + 1,
            user,
            count: entry.count,
            showId: entry.showId,
            showImages,
          };
        })
      ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r !== null));
    }

    // Default: total visit count per user
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
        return user ? { rank: index + 1, user, count, showId: null, showImages: null } : null;
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

export const getBySignups = query({
  args: {
    scope: v.union(v.literal("all"), v.literal("friends")),
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

    const claimedLinks = await ctx.db
      .query("inviteLinks")
      .collect()
      .then((links) => links.filter((l) => !!l.claimedByUserId));

    const countByCreator = new Map<string, number>();
    for (const link of claimedLinks) {
      const creatorId = link.createdByUserId as string;
      if (targetUserIds && !targetUserIds.includes(creatorId)) continue;
      countByCreator.set(creatorId, (countByCreator.get(creatorId) ?? 0) + 1);
    }

    const sorted = Array.from(countByCreator.entries())
      .map(([userId, count]) => ({ userId, count }))
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

/** Ranks users by their current weekly streak (longest active streak first). */
export const getByStreak = query({
  args: {
    scope: v.union(v.literal("all"), v.literal("friends")),
  },
  handler: async (ctx, args) => {
    const viewerUserId = await getConvexUserId(ctx);
    const targetUserIds =
      args.scope === "friends" && viewerUserId
        ? await getFriendIds(ctx, viewerUserId)
        : null;

    const allStats = await ctx.db.query("userStats").collect();
    const filtered = targetUserIds
      ? allStats.filter((s: any) => targetUserIds.includes(s.userId))
      : allStats;

    const withStreak = filtered
      .filter((s: any) => (s.currentStreakWeeks ?? 0) > 0)
      .sort((a: any, b: any) => (b.currentStreakWeeks ?? 0) - (a.currentStreakWeeks ?? 0))
      .slice(0, LEADERBOARD_LIMIT);

    return Promise.all(
      withStreak.map(async (stats: any, index: number) => {
        const user = await enrichUser(ctx, stats.userId);
        return user
          ? { rank: index + 1, user, count: stats.currentStreakWeeks as number }
          : null;
      })
    ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r !== null));
  },
});

/** Ranks users by their overall theatre score. */
export const getByScore = query({
  args: {
    scope: v.union(v.literal("all"), v.literal("friends")),
  },
  handler: async (ctx, args) => {
    const viewerUserId = await getConvexUserId(ctx);
    const targetUserIds =
      args.scope === "friends" && viewerUserId
        ? await getFriendIds(ctx, viewerUserId)
        : null;

    let statsRows;
    if (targetUserIds) {
      const allStats = await ctx.db.query("userStats").collect();
      statsRows = allStats
        .filter((s: any) => targetUserIds.includes(s.userId))
        .sort((a: any, b: any) => b.theatreScore - a.theatreScore)
        .slice(0, LEADERBOARD_LIMIT);
    } else {
      statsRows = await ctx.db
        .query("userStats")
        .withIndex("by_theatreScore")
        .order("desc")
        .take(LEADERBOARD_LIMIT);
    }

    return Promise.all(
      statsRows.map(async (stats: any, index: number) => {
        const user = await enrichUser(ctx, stats.userId);
        return user
          ? { rank: index + 1, user, count: stats.theatreScore as number }
          : null;
      })
    ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r !== null));
  },
});
