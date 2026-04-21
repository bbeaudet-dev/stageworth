import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { getConvexUserId } from "./auth";

/**
 * Cap on how many loved/disliked shows we ship full descriptions for
 * (prompt weight). We intentionally exclude `liked` / `okay` descriptions:
 * they're the weakest signal per token and crowd the prompt.
 *
 * Forward-looking: once the Moods feature (#176) lands, per-show mood
 * distributions will replace most of this description-based thematic
 * context. At that point we can drop (or heavily trim) these blocks.
 */
const LOVED_DESCRIPTIONS_LIMIT = 5;
const DISLIKED_DESCRIPTIONS_LIMIT = 5;

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
    // Descriptions for loved + disliked shows — the two strongest thematic
    // signals. `liked` and `okay` are intentionally omitted: weak signal for
    // the tokens they cost.
    let lovedWithDescriptions: { name: string; description: string }[] = [];
    let dislikedWithDescriptions: { name: string; description: string }[] = [];

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

      async function descriptionsFor(
        ids: typeof lovedIds,
        limit: number
      ): Promise<{ name: string; description: string }[]> {
        const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
        return docs
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .filter(
            (s) =>
              typeof s.description === "string" &&
              s.description.trim().length > 0
          )
          .slice(0, limit)
          .map((s) => ({ name: s.name, description: s.description as string }));
      }

      lovedWithDescriptions = await descriptionsFor(
        lovedIds,
        LOVED_DESCRIPTIONS_LIMIT
      );
      dislikedWithDescriptions = await descriptionsFor(
        dislikedIds,
        DISLIKED_DESCRIPTIONS_LIMIT
      );
    }

    return {
      show: show
        ? {
            name: show.name,
            type: show.type,
            description:
              typeof show.description === "string" && show.description.trim().length > 0
                ? show.description
                : null,
          }
        : null,
      userId,
      preferences,
      ranked,
      lovedWithDescriptions,
      dislikedWithDescriptions,
    };
  },
});

/**
 * Lightweight show lookup for the `ensureShowDescription` hydrate step.
 * Returns only the fields needed to decide whether to try a fetch and, if
 * so, what identity to search with. Kept separate from
 * `gatherRecommendationContext` so the hydrate path doesn't pull the full
 * user tier graph for nothing.
 */
export const getShowForDescriptionHydrate = internalQuery({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) return null;
    return {
      name: show.name,
      type: show.type,
      description: show.description ?? null,
      descriptionSource: show.descriptionSource ?? null,
      descriptionCheckedAt: show.descriptionCheckedAt ?? null,
    };
  },
});

/**
 * Picks a description for a show from its most recent production (by opening
 * date, falling back to creation order). Returns null if no production has
 * a usable description. Used as the first fallback in `ensureShowDescription`
 * before we hit Wikipedia.
 */
export const getNewestProductionDescription = internalQuery({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const productions = await ctx.db
      .query("productions")
      .withIndex("by_show", (q) => q.eq("showId", args.showId))
      .collect();

    const withDescription = productions.filter(
      (p) => typeof p.description === "string" && p.description.trim().length > 0
    );
    if (withDescription.length === 0) return null;

    withDescription.sort((a, b) => {
      const aDate = a.openingDate ?? "";
      const bDate = b.openingDate ?? "";
      if (aDate !== bDate) return aDate < bDate ? 1 : -1;
      return b._creationTime - a._creationTime;
    });

    const chosen = withDescription[0];
    return {
      description: chosen.description as string,
      productionId: chosen._id,
    };
  },
});
