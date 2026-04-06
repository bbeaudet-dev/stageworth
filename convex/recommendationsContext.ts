import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { getConvexUserId } from "./auth";

/** Internal: loads show + user prefs + ranked tiers for the recommendation action. */
export const gatherRecommendationContext = internalQuery({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    const userId = await getConvexUserId(ctx);

    let preferences: { element: string; rating: number }[] = [];
    const ranked = {
      loved: [] as string[],
      liked: [] as string[],
      okay: [] as string[],
      disliked: [] as string[],
    };

    if (userId) {
      const prefs = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (prefs) {
        preferences = prefs.elementRatings;
      }

      const userShows = await ctx.db
        .query("userShows")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      const lovedIds: (typeof userShows)[number]["showId"][] = [];
      const likedIds: typeof lovedIds = [];
      const okayIds: typeof lovedIds = [];
      const dislikedIds: typeof lovedIds = [];

      for (const row of userShows) {
        if (row.tier === "unranked") continue;
        switch (row.tier) {
          case "loved":
            lovedIds.push(row.showId);
            break;
          case "liked":
            likedIds.push(row.showId);
            break;
          case "okay":
            okayIds.push(row.showId);
            break;
          case "disliked":
            dislikedIds.push(row.showId);
            break;
          default:
            break;
        }
      }

      async function namesFor(ids: typeof lovedIds): Promise<string[]> {
        const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
        return docs
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .map((s) => s.name)
          .sort((a, b) => a.localeCompare(b));
      }

      ranked.loved = await namesFor(lovedIds);
      ranked.liked = await namesFor(likedIds);
      ranked.okay = await namesFor(okayIds);
      ranked.disliked = await namesFor(dislikedIds);
    }

    return {
      show: show ? { name: show.name, type: show.type } : null,
      preferences,
      ranked,
    };
  },
});
