import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getConvexUserId, requireConvexUserId } from "./auth";

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

    return ctx.db.insert("theatreChallenges", {
      userId,
      year: args.year,
      targetCount: args.targetCount,
      currentCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
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
