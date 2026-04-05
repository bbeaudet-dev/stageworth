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
