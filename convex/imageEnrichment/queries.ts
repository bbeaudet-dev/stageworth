import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

/**
 * Returns a batch of shows that have no curated storage images AND no
 * hotlink URL yet. Used by the Wikipedia backfill action.
 */
export const showsNeedingImages = internalQuery({
  args: {
    limit: v.number(),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("shows").collect();

    // Find shows with no images at all.
    const needsImage = all.filter(
      (s) => s.images.length === 0 && !s.hotlinkImageUrl
    );

    // Simple cursor: the show _id to start after.
    let startIdx = 0;
    if (args.cursor) {
      const idx = needsImage.findIndex((s) => s._id === args.cursor);
      if (idx >= 0) startIdx = idx + 1;
    }

    const batch = needsImage.slice(startIdx, startIdx + args.limit);
    const hasMore = startIdx + args.limit < needsImage.length;
    const nextCursor = batch.length > 0 ? batch[batch.length - 1]._id : undefined;

    return {
      shows: batch.map((s) => ({
        _id: s._id,
        name: s.name,
        type: s.type,
      })),
      hasMore,
      nextCursor,
    };
  },
});

const NYC_DISTRICTS = new Set([
  "broadway",
  "off_broadway",
  "off_off_broadway",
]);

/**
 * Returns a batch of NYC productions that have no poster image (neither
 * storage nor hotlink) and are not closed. Used by the TM enrichment cron.
 */
export const productionsNeedingImages = internalQuery({
  args: {
    limit: v.number(),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    const all = await ctx.db.query("productions").collect();

    const eligible = [];
    for (const p of all) {
      if (!NYC_DISTRICTS.has(p.district)) continue;
      // Skip productions already enriched or with storage poster
      if (p.hotlinkPosterUrl || p.posterImage) continue;
      // Skip closed productions
      if (p.closingDate && p.closingDate < today) continue;

      const show = await ctx.db.get(p.showId);
      if (!show) continue;

      eligible.push({
        productionId: p._id,
        showId: show._id,
        showName: show.name,
        showHasImage: show.images.length > 0 || !!show.hotlinkImageUrl,
      });
    }

    let startIdx = 0;
    if (args.cursor) {
      const idx = eligible.findIndex((e) => e.productionId === args.cursor);
      if (idx >= 0) startIdx = idx + 1;
    }

    const batch = eligible.slice(startIdx, startIdx + args.limit);
    const hasMore = startIdx + args.limit < eligible.length;
    const nextCursor =
      batch.length > 0 ? batch[batch.length - 1].productionId : undefined;

    return { productions: batch, hasMore, nextCursor };
  },
});
