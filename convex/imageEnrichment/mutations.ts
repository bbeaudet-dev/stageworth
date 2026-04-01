import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Set a hotlink image URL on a show record.
 * Enforces the enrichment upgrade rule: Ticketmaster may overwrite Wikipedia,
 * but Wikipedia must not overwrite an existing Ticketmaster URL.
 */
export const setShowHotlinkImage = internalMutation({
  args: {
    showId: v.id("shows"),
    hotlinkImageUrl: v.string(),
    hotlinkImageSource: v.union(
      v.literal("wikipedia"),
      v.literal("ticketmaster")
    ),
    wikipediaTitle: v.optional(v.string()),
    ticketmasterAttractionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) return;

    // Don't let Wikipedia overwrite an existing Ticketmaster image.
    if (
      args.hotlinkImageSource === "wikipedia" &&
      show.hotlinkImageSource === "ticketmaster" &&
      show.hotlinkImageUrl
    ) {
      // Still store the Wikipedia title for reference.
      if (args.wikipediaTitle && !show.wikipediaTitle) {
        await ctx.db.patch(args.showId, {
          wikipediaTitle: args.wikipediaTitle,
        });
      }
      return;
    }

    const patch: Record<string, unknown> = {
      hotlinkImageUrl: args.hotlinkImageUrl,
      hotlinkImageSource: args.hotlinkImageSource,
    };
    if (args.wikipediaTitle) patch.wikipediaTitle = args.wikipediaTitle;
    if (args.ticketmasterAttractionId) {
      patch.ticketmasterAttractionId = args.ticketmasterAttractionId;
    }

    await ctx.db.patch(args.showId, patch);
  },
});

/**
 * Set a hotlink poster URL on a production record from Ticketmaster.
 */
export const setProductionHotlinkImage = internalMutation({
  args: {
    productionId: v.id("productions"),
    hotlinkPosterUrl: v.string(),
    ticketmasterEventId: v.string(),
    ticketmasterEventUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const production = await ctx.db.get(args.productionId);
    if (!production) return;

    await ctx.db.patch(args.productionId, {
      hotlinkPosterUrl: args.hotlinkPosterUrl,
      ticketmasterEventId: args.ticketmasterEventId,
      ticketmasterEventUrl: args.ticketmasterEventUrl,
    });
  },
});
