import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getConvexUserId, requireConvexUserId } from "./auth";

function getISOWeek(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + (3 - ((date.getUTCDay() + 6) % 7)));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${thursday.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function nextWeek(isoWeek: string): string {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  monday.setUTCDate(monday.getUTCDate() + 7);
  return getISOWeek(monday.toISOString().slice(0, 10));
}

export const recomputeUserScore = mutation({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const targetUserId = args.userId ?? (await requireConvexUserId(ctx));

    const [rankings, visits, userShows, followers] = await Promise.all([
      ctx.db
        .query("userRankings")
        .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
        .first(),
      ctx.db
        .query("visits")
        .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
        .collect(),
      ctx.db
        .query("userShows")
        .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
        .collect(),
      ctx.db
        .query("follows")
        .withIndex("by_following", (q: any) => q.eq("followingUserId", targetUserId))
        .collect(),
    ]);

    const uniqueShows = rankings?.showIds?.length ?? 0;
    const totalVisits = visits.length;
    const visitsWithNotes = visits.filter((v: any) => v.notes?.trim()).length;
    const visitsWithTags = visits.filter(
      (v: any) => v.taggedUserIds && v.taggedUserIds.length > 0
    ).length;
    const followerCount = followers.length;

    let baseScore =
      uniqueShows * 10 +
      totalVisits * 5 +
      visitsWithNotes * 3 +
      visitsWithTags * 2 +
      followerCount * 1;

    const existingStats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
      .first();

    let currentStreakWeeks = existingStats?.currentStreakWeeks ?? 0;
    let longestStreakWeeks = existingStats?.longestStreakWeeks ?? 0;
    let lastActiveWeek = existingStats?.lastActiveWeek ?? "";

    if (visits.length > 0) {
      const sortedVisits = [...visits].sort(
        (a: any, b: any) => b.date.localeCompare(a.date)
      );
      const mostRecentDate = sortedVisits[0].date;
      const currentWeek = getISOWeek(mostRecentDate);

      if (lastActiveWeek === "") {
        currentStreakWeeks = 1;
        lastActiveWeek = currentWeek;
      } else if (currentWeek !== lastActiveWeek) {
        const expectedNext = nextWeek(lastActiveWeek);
        if (currentWeek === expectedNext) {
          currentStreakWeeks += 1;
        } else if (currentWeek > expectedNext) {
          currentStreakWeeks = 1;
        }
        lastActiveWeek = currentWeek;
      }

      if (currentStreakWeeks > longestStreakWeeks) {
        longestStreakWeeks = currentStreakWeeks;
      }
    }

    const streakMultiplier = 1 + Math.min(currentStreakWeeks * 0.05, 0.5);
    const theatreScore = Math.round(baseScore * streakMultiplier);

    if (existingStats) {
      await ctx.db.patch(existingStats._id, {
        theatreScore,
        currentStreakWeeks,
        longestStreakWeeks,
        lastActiveWeek,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userStats", {
        userId: targetUserId,
        theatreScore,
        currentStreakWeeks,
        longestStreakWeeks,
        lastActiveWeek,
        updatedAt: Date.now(),
      });
    }

    return { theatreScore, currentStreakWeeks, longestStreakWeeks };
  },
});

export const recomputeAllRanks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allStats = await ctx.db.query("userStats").collect();
    const sorted = allStats.sort((a, b) => b.theatreScore - a.theatreScore);

    for (let i = 0; i < sorted.length; i++) {
      await ctx.db.patch(sorted[i]._id, { theatreRank: i + 1 });
    }
  },
});

export const getUserStats = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const viewerUserId = await getConvexUserId(ctx);
    const targetUserId = args.userId ?? viewerUserId;
    if (!targetUserId) return null;

    return ctx.db
      .query("userStats")
      .withIndex("by_user", (q: any) => q.eq("userId", targetUserId))
      .first();
  },
});
