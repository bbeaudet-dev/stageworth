import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getConvexUserId, requireConvexUserId } from "./auth";
import { resolveShowImageUrls } from "./helpers";
import type { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    year: v.number(),
    targetCount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    if (args.targetCount < 1 || args.targetCount > 999) {
      throw new Error("Target must be between 1 and 999");
    }

    const existing = await ctx.db
      .query("theatreChallenges")
      .withIndex("by_user_year", (q) =>
        q.eq("userId", userId).eq("year", args.year)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        targetCount: args.targetCount,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Count unique shows visited in the target year (retroactive backfill).
    const allVisits = await ctx.db
      .query("visits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const uniqueShowsThisYear = new Set(
      allVisits
        .filter((v) => new Date(v.date + "T00:00:00Z").getUTCFullYear() === args.year)
        .map((v) => String(v.showId))
    );
    const retroactiveCount = uniqueShowsThisYear.size;

    const now = Date.now();
    const challengeId = await ctx.db.insert("theatreChallenges", {
      userId,
      year: args.year,
      targetCount: args.targetCount,
      currentCount: retroactiveCount,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("activityPosts", {
      actorUserId: userId,
      type: "challenge_started",
      challengeYear: args.year,
      challengeTarget: args.targetCount,
      challengeProgress: retroactiveCount,
      createdAt: now,
    });

    return challengeId;
  },
});

export const getMy = query({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    const userId = await getConvexUserId(ctx);
    if (!userId) return null;

    return ctx.db
      .query("theatreChallenges")
      .withIndex("by_user_year", (q) =>
        q.eq("userId", userId).eq("year", args.year)
      )
      .first();
  },
});

export const getForUser = query({
  args: { userId: v.id("users"), year: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("theatreChallenges")
      .withIndex("by_user_year", (q) =>
        q.eq("userId", args.userId).eq("year", args.year)
      )
      .first();
  },
});

export const incrementProgress = mutation({
  args: { userId: v.id("users"), year: v.number() },
  handler: async (ctx, args) => {
    const challenge = await ctx.db
      .query("theatreChallenges")
      .withIndex("by_user_year", (q) =>
        q.eq("userId", args.userId).eq("year", args.year)
      )
      .first();

    if (!challenge) return null;

    const newCount = challenge.currentCount + 1;
    await ctx.db.patch(challenge._id, {
      currentCount: newCount,
      updatedAt: Date.now(),
    });

    return { currentCount: newCount, targetCount: challenge.targetCount };
  },
});

async function hydrateChallenge(ctx: any, challenge: any, viewerUserId: string) {
  const user = await ctx.db.get(challenge.userId);
  if (!user) return null;

  const avatarUrl = user.avatarImage ? await ctx.storage.getUrl(user.avatarImage) : null;

  // Collect unique shows visited by this user in the challenge year.
  const allVisits = await ctx.db
    .query("visits")
    .withIndex("by_user", (q: any) => q.eq("userId", challenge.userId))
    .collect();
  const yearVisits = allVisits.filter((v: any) => {
    return new Date(v.date + "T00:00:00Z").getUTCFullYear() === challenge.year;
  });
  const seenShowIds = Array.from(new Set(yearVisits.map((v: any) => v.showId as Id<"shows">)));

  // Resolve images for up to 8 shows.
  const showPreviews: { showId: string; name: string; imageUrl: string | null }[] = [];
  for (const showId of seenShowIds.slice(0, 8)) {
    const show = await ctx.db.get(showId);
    if (!show) continue;
    const images = await resolveShowImageUrls(ctx, show);
    showPreviews.push({ showId: String(showId), name: show.name, imageUrl: (images[0] as string | undefined) ?? null });
  }

  const isViewer = challenge.userId === viewerUserId;

  return {
    _id: challenge._id,
    year: challenge.year,
    targetCount: challenge.targetCount,
    currentCount: challenge.currentCount,
    createdAt: challenge.createdAt,
    isViewer,
    user: {
      _id: user._id,
      username: user.username,
      name: user.name ?? null,
      avatarUrl,
    },
    showPreviews,
    totalShowCount: seenShowIds.length,
  };
}

export const getFriendsWithChallenges = query({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const followRows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerUserId", userId))
      .collect();
    const targetIds = [userId, ...followRows.map((r) => r.followingUserId)];

    const challenges = [];
    for (const targetId of targetIds) {
      const challenge = await ctx.db
        .query("theatreChallenges")
        .withIndex("by_user_year", (q) => q.eq("userId", targetId).eq("year", args.year))
        .first();
      if (challenge) challenges.push(challenge);
    }

    const hydrated = await Promise.all(challenges.map((c) => hydrateChallenge(ctx, c, userId)));
    return hydrated.filter((c): c is NonNullable<typeof c> => c !== null);
  },
});

export const getAllWithChallenges = query({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const challenges = await ctx.db
      .query("theatreChallenges")
      .filter((q) => q.eq(q.field("year"), args.year))
      .collect();

    const hydrated = await Promise.all(challenges.map((c) => hydrateChallenge(ctx, c, userId)));
    return hydrated.filter((c): c is NonNullable<typeof c> => c !== null);
  },
});

export const deleteChallenge = mutation({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const challenge = await ctx.db
      .query("theatreChallenges")
      .withIndex("by_user_year", (q) =>
        q.eq("userId", userId).eq("year", args.year)
      )
      .first();
    if (challenge) {
      await ctx.db.delete(challenge._id);
    }
  },
});
