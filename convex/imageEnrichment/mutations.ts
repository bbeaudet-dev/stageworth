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

    // Don't overwrite an existing image from a different source.
    // Wikipedia is preferred at the show level (portrait poster art);
    // TM should only fill in when there's nothing at all.
    if (show.hotlinkImageUrl) {
      // Still store metadata for reference.
      const metaPatch: Record<string, unknown> = {};
      if (args.wikipediaTitle && !show.wikipediaTitle)
        metaPatch.wikipediaTitle = args.wikipediaTitle;
      if (args.ticketmasterAttractionId && !show.ticketmasterAttractionId)
        metaPatch.ticketmasterAttractionId = args.ticketmasterAttractionId;
      if (Object.keys(metaPatch).length > 0)
        await ctx.db.patch(args.showId, metaPatch);
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

    // Create a review queue entry for the new image.
    const existingEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_entity_field", (q) =>
        q
          .eq("entityType", "show")
          .eq("entityId", args.showId)
          .eq("field", "hotlinkImageUrl")
      )
      .collect();
    if (!existingEntries.some((e) => e.status === "pending")) {
      await ctx.db.insert("reviewQueue", {
        entityType: "show",
        entityId: args.showId,
        field: "hotlinkImageUrl",
        currentValue: args.hotlinkImageUrl,
        source: args.hotlinkImageSource,
        status: "pending",
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Mark a show as checked by Wikipedia when no image was found.
 * Prevents re-processing on subsequent backfill runs.
 */
export const markWikipediaChecked = internalMutation({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show || show.wikipediaTitle) return;
    await ctx.db.patch(args.showId, { wikipediaTitle: "_not_found" });
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

    // Create a review queue entry for the new production poster.
    const existingEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_entity_field", (q) =>
        q
          .eq("entityType", "production")
          .eq("entityId", args.productionId)
          .eq("field", "hotlinkPosterUrl")
      )
      .collect();
    if (!existingEntries.some((e) => e.status === "pending")) {
      await ctx.db.insert("reviewQueue", {
        entityType: "production",
        entityId: args.productionId,
        field: "hotlinkPosterUrl",
        currentValue: args.hotlinkPosterUrl,
        source: "ticketmaster",
        status: "pending",
        createdAt: Date.now(),
      });
    }
  },
});
