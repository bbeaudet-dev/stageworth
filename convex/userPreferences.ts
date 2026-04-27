import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getConvexUserId, requireConvexUserId } from "./auth";

export const THEATRE_ELEMENTS = [
  "Story & Writing",
  "Music & Score",
  "Vocal Performances",
  "Dance & Choreography",
  "Production Design",
  "Spectacle & Wow Moments",
  "Emotional Resonance",
  "Star Power",
] as const;

export const getUserPreferences = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const userId = args.userId ?? (await getConvexUserId(ctx));
    if (!userId) return null;

    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const updateUserPreferences = mutation({
  args: {
    elementRatings: v.array(
      v.object({ element: v.string(), rating: v.number() })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        elementRatings: args.elementRatings,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        elementRatings: args.elementRatings,
        updatedAt: Date.now(),
      });
    }
  },
});

export const updateNotificationSettings = mutation({
  args: {
    follows: v.boolean(),
    visitTags: v.boolean(),
    tripInvites: v.boolean(),
    tripReminders: v.optional(v.boolean()),
    closingSoon: v.boolean(),
    showAnnounced: v.boolean(),
    showOpenings: v.optional(v.boolean()),
    previewsStarted: v.optional(v.boolean()),
    postLikes: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const notificationSettings = {
      follows: args.follows,
      visitTags: args.visitTags,
      tripInvites: args.tripInvites,
      tripReminders: args.tripReminders ?? true,
      closingSoon: args.closingSoon,
      showAnnounced: args.showAnnounced,
      showOpenings: args.showOpenings ?? true,
      previewsStarted: args.previewsStarted ?? true,
      postLikes: args.postLikes,
    };

    if (existing) {
      await ctx.db.patch(existing._id, { notificationSettings, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        elementRatings: [],
        notificationSettings,
        updatedAt: Date.now(),
      });
    }
  },
});
