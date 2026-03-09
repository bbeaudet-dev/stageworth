import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireConvexUserId } from "./auth";
import { resolveImageUrls } from "./helpers";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return rankings;
  },
});

export const getRankedShows = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!rankings) return [];

    const shows = await Promise.all(
      rankings.showIds.map(async (showId) => {
        const show = await ctx.db.get(showId);
        if (!show) return null;
        const [userShow, visits] = await Promise.all([
          ctx.db
            .query("userShows")
            .withIndex("by_user_show", (q) =>
              q.eq("userId", userId).eq("showId", showId)
            )
            .first(),
          ctx.db
            .query("visits")
            .withIndex("by_user_show", (q) =>
              q.eq("userId", userId).eq("showId", showId)
            )
            .collect(),
        ]);
        return {
          ...show,
          images: await resolveImageUrls(ctx, show.images),
          tier: userShow?.tier,
          visitCount: visits.length,
        };
      })
    );

    return shows.filter(
      (s): s is NonNullable<typeof s> => s !== null
    );
  },
});

const tierValidator = v.union(
  v.literal("liked"),
  v.literal("neutral"),
  v.literal("disliked")
);

export const addShow = mutation({
  args: {
    showId: v.id("shows"),
    tier: tierValidator,
    position: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!rankings) throw new Error("Rankings not found");

    if (rankings.showIds.includes(args.showId)) {
      throw new Error("Show already in rankings");
    }

    const newShowIds = [...rankings.showIds];
    const clampedPosition = Math.max(
      0,
      Math.min(args.position, newShowIds.length)
    );
    newShowIds.splice(clampedPosition, 0, args.showId);

    await ctx.db.patch(rankings._id, { showIds: newShowIds });

    await ctx.db.insert("userShows", {
      userId,
      showId: args.showId,
      tier: args.tier,
      addedAt: Date.now(),
    });

    return { rank: clampedPosition + 1 };
  },
});

export const removeShow = mutation({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!rankings) throw new Error("Rankings not found");

    const newShowIds = rankings.showIds.filter((id) => id !== args.showId);
    await ctx.db.patch(rankings._id, { showIds: newShowIds });

    const userShow = await ctx.db
      .query("userShows")
      .withIndex("by_user_show", (q) =>
        q.eq("userId", userId).eq("showId", args.showId)
      )
      .first();

    if (userShow) await ctx.db.delete(userShow._id);

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_user_show", (q) =>
        q.eq("userId", userId).eq("showId", args.showId)
      )
      .collect();

    await Promise.all(visits.map((v) => ctx.db.delete(v._id)));
  },
});

export const reorder = mutation({
  args: {
    showId: v.id("shows"),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!rankings) throw new Error("Rankings not found");

    const currentIndex = rankings.showIds.indexOf(args.showId);
    if (currentIndex === -1) throw new Error("Show not in rankings");

    const newShowIds = [...rankings.showIds];
    newShowIds.splice(currentIndex, 1);
    const clampedPosition = Math.max(
      0,
      Math.min(args.newPosition, newShowIds.length)
    );
    newShowIds.splice(clampedPosition, 0, args.showId);

    await ctx.db.patch(rankings._id, { showIds: newShowIds });

    return { rank: clampedPosition + 1 };
  },
});

export const updateTier = mutation({
  args: {
    showId: v.id("shows"),
    tier: tierValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const userShow = await ctx.db
      .query("userShows")
      .withIndex("by_user_show", (q) =>
        q.eq("userId", userId).eq("showId", args.showId)
      )
      .first();

    if (!userShow) throw new Error("Show not found in user's list");

    await ctx.db.patch(userShow._id, { tier: args.tier });
  },
});
