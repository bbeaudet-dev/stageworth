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

    // Find shows with no images and not yet checked by Wikipedia.
    const needsImage = all.filter(
      (s) =>
        s.images.length === 0 && !s.hotlinkImageUrl && !s.wikipediaTitle
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

/**
 * Batch of shows missing `description` (after Playbill has had its chance).
 * Skips shows that have been checked recently so repeat backfill runs don't
 * keep re-hitting Wikipedia for the same misses.
 */
const DESCRIPTION_RECHECK_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const showsNeedingDescriptions = internalQuery({
  args: {
    limit: v.number(),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("shows").collect();
    const now = Date.now();

    const eligible = all.filter((s) => {
      if (s.description) return false;
      if (s.descriptionSource === "wikipedia" || s.descriptionSource === "playbill")
        return false;
      if (
        s.descriptionCheckedAt &&
        now - s.descriptionCheckedAt < DESCRIPTION_RECHECK_MS
      )
        return false;
      return true;
    });

    let startIdx = 0;
    if (args.cursor) {
      const idx = eligible.findIndex((s) => s._id === args.cursor);
      if (idx >= 0) startIdx = idx + 1;
    }

    const batch = eligible.slice(startIdx, startIdx + args.limit);
    const hasMore = startIdx + args.limit < eligible.length;
    const nextCursor = batch.length > 0 ? batch[batch.length - 1]._id : undefined;

    return {
      shows: batch.map((s) => ({ _id: s._id, name: s.name, type: s.type })),
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
 *
 * Also excludes productions whose Ticketmaster proposal has been rejected
 * before — admins shouldn't have to reject the same wrong-size TM image
 * every day. Once rejected, it stays rejected.
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

      // Skip productions with a previously rejected TM poster proposal.
      const priorEntries = await ctx.db
        .query("reviewQueue")
        .withIndex("by_entity_field", (q) =>
          q
            .eq("entityType", "production")
            .eq("entityId", p._id as string)
            .eq("field", "hotlinkPosterUrl")
        )
        .collect();
      const tmPreviouslyRejected = priorEntries.some(
        (e) => e.status === "rejected" && e.source === "ticketmaster"
      );
      if (tmPreviouslyRejected) continue;

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
